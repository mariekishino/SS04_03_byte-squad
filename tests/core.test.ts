import { describe, expect, it } from 'vitest';
import { calculateMetrics, compareBytes, evaluateTransmission } from '../src/core/metrics.js';
import { decodePacket, decodePayload, encodePayload, packPayload, traceCopyBytes, traceDecodePacket, traceDecodePayload } from '../src/core/packet.js';
import { decodeRle, encodeRle, runsToBytes, traceDecodeRle, traceEncodeRle } from '../src/core/rle.js';
import { ByteFormatError, parseLearningInput } from '../src/core/validation.js';
import type { Method } from '../src/core/types.js';

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (value: string) => Uint8Array.from(value, (character) => character.charCodeAt(0));

describe('RLEの形式と境界', () => {
  it.each([
    ['', []],
    ['A', [1, 65]],
    ['AAAAAABBBBCC', [6, 65, 4, 66, 2, 67]],
    ['ABCDEF', [1, 65, 1, 66, 1, 67, 1, 68, 1, 69, 1, 70]],
    ['AAAABB', [4, 65, 2, 66]],
    ['A'.repeat(255), [255, 65]],
    ['A'.repeat(256), [255, 65, 1, 65]],
    ['A'.repeat(510), [255, 65, 255, 65]],
  ])('%sを指定のバイト列に変換し、元に戻す', (input, expected) => {
    const encoded = encodeRle(ascii(input));
    expect(encoded).toEqual(Uint8Array.from(expected));
    expect(decodeRle(encoded)).toEqual(ascii(input));
  });

  it('最短でない合法な組も復元する', () => {
    expect(decodeRle(bytes(2, 65, 2, 65))).toEqual(ascii('AAAA'));
  });

  it('A～Z以外の全256種類のバイトを扱う', () => {
    const input = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(decodeRle(encodeRle(input))).toEqual(input);
    expect(encodeRle(bytes(0, 0, 255, 255))).toEqual(bytes(2, 0, 2, 255));
  });

  it.each([
    [bytes(1), 4096, 'odd-length', 0],
    [bytes(1, 65, 2), 4096, 'odd-length', 2],
    [bytes(0, 65), 4096, 'zero-count', 0],
    [bytes(1, 65, 0, 66), 4096, 'zero-count', 2],
    [bytes(3, 65, 2, 66), 4, 'output-limit', 2],
  ])('不正な本体を理由と位置付きで拒否する: %j', (payload, limit, code, offset) => {
    for (const operation of [decodeRle, traceDecodeRle]) {
      expect(() => operation(payload, limit)).toThrowError(ByteFormatError);
      expect(() => operation(payload, limit)).toThrowError(expect.objectContaining({ code, offset, source: 'payload' }));
    }
  });

  it('復元上限の境界と空データを扱う', () => {
    expect(decodeRle(bytes(4, 65), 4)).toHaveLength(4);
    expect(decodeRle(bytes(), 0)).toEqual(bytes());
    expect(() => decodeRle(bytes(1, 65), 0)).toThrowError(expect.objectContaining({ code: 'output-limit' }));
    expect(() => decodeRle(encodeRle(new Uint8Array(4097)))).toThrowError(expect.objectContaining({ code: 'output-limit' }));
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('不正な復元上限%sを拒否する', (limit) => {
    expect(() => decodeRle(bytes(), limit)).toThrowError(RangeError);
    expect(() => decodePayload(bytes(), 'raw', limit)).toThrowError(RangeError);
  });

  it.each([0, -1, 256, 1.5, NaN, Infinity])('型付き配列への変換前に個数%sを拒否する', (count) => {
    expect(() => runsToBytes([{ count, value: 65 }])).toThrowError(expect.objectContaining({ code: 'invalid-count', source: 'runs', offset: 0 }));
  });

  it.each([-1, 256, 1.5, NaN, Infinity])('型付き配列への変換前に値%sを拒否する', (value) => {
    expect(() => runsToBytes([{ count: 1, value }])).toThrowError(expect.objectContaining({ code: 'invalid-value' }));
  });

  it('手動の組も仕様の2バイト形式にする', () => {
    expect(runsToBytes([{ count: 255, value: 0 }, { count: 1, value: 255 }])).toEqual(bytes(255, 0, 1, 255));
    expect(runsToBytes([])).toEqual(bytes());
  });
});

describe('学習ステップ', () => {
  it('AAAABBの全圧縮ステップが仕様の表と一致する', () => {
    const { output, steps } = traceEncodeRle(ascii('AAAABB'));
    expect(steps.map((step) => [step.event, step.nextReadIndex, step.currentRun, step.output])).toEqual([
      ['initial', 0, null, []],
      ['read-first', 1, { count: 1, value: 65 }, []],
      ['extend-run', 2, { count: 2, value: 65 }, []],
      ['extend-run', 3, { count: 3, value: 65 }, []],
      ['extend-run', 4, { count: 4, value: 65 }, []],
      ['flush-and-start', 5, { count: 1, value: 66 }, [4, 65]],
      ['extend-run', 6, { count: 2, value: 66 }, [4, 65]],
      ['flush-final', 6, null, [4, 65, 2, 66]],
      ['complete', 6, null, [4, 65, 2, 66]],
    ]);
    expect(steps.map((step) => step.lastReadIndex)).toEqual([null, 0, 1, 2, 3, 4, 5, 5, 5]);
    expect(output).toEqual(bytes(4, 65, 2, 66));
  });

  it('復元でどの組から何個出したかを追える', () => {
    const trace = traceDecodeRle(bytes(2, 65, 1, 66));
    expect(trace.steps.map((step) => step.event)).toEqual([
      'initial', 'read-pair', 'emit-byte', 'emit-byte', 'advance-pair',
      'read-pair', 'emit-byte', 'advance-pair', 'complete',
    ]);
    expect(trace.steps.filter((step) => step.event === 'emit-byte').map((step) => [step.sourceOffset, step.pairIndex, step.emittedFromRun, step.output])).toEqual([
      [0, 0, 1, [65]], [0, 0, 2, [65, 65]], [2, 1, 1, [65, 65, 66]],
    ]);
    expect(trace.output).toEqual(ascii('AAB'));
  });

  it('後の操作や外部の書き換えで過去のスナップショットが変わらない', () => {
    const input = ascii('AABB');
    const encoded = traceEncodeRle(input);
    const decoded = traceDecodeRle(encoded.output);
    input.fill(0);
    encoded.output.fill(0);
    decoded.output.fill(0);
    expect(encoded.steps.at(-1)?.output).toEqual([2, 65, 2, 66]);
    expect(encoded.steps[1]?.currentRun).toEqual({ count: 1, value: 65 });
    expect(decoded.steps[2]?.output).toEqual([65]);
    expect(decoded.steps.at(-1)?.output).toEqual([65, 65, 66, 66]);
    expect(Object.isFrozen(encoded.steps)).toBe(true);
    expect(Object.isFrozen(encoded.steps[1]?.currentRun)).toBe(true);
    expect(Object.isFrozen(decoded.steps[2]?.output)).toBe(true);
  });

  it('通常変換とトレースを再現可能な複数の入力で照合する', () => {
    let seed = 12345;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    for (let sample = 0; sample < 100; sample++) {
      const input = new Uint8Array(random() % 300);
      for (let i = 0; i < input.length; i++) {
        input[i] = i > 0 && random() % 3 !== 0 ? input[i - 1]! : random() % 256;
      }
      const originalCopy = input.slice();
      const encoded = traceEncodeRle(input);
      expect(encoded.output).toEqual(encodeRle(input));
      expect(encoded.steps.at(-1)?.output).toEqual(Array.from(encoded.output));
      const decoded = traceDecodeRle(encoded.output);
      expect(decoded.output).toEqual(decodeRle(encoded.output));
      expect(decoded.output).toEqual(originalCopy);
      expect(decoded.steps.at(-1)?.output).toEqual(Array.from(originalCopy));
      expect(input).toEqual(originalCopy);
    }
  });
});

describe('無圧縮と方式パケット', () => {
  it('無圧縮は独立した出力に1バイトずつコピーする', () => {
    const input = ascii('AB');
    const trace = traceCopyBytes(input);
    expect(trace.steps.map((step) => step.output)).toEqual([[], [65], [65, 66], [65, 66]]);
    expect(trace.output).toEqual(input);
    expect(trace.output).not.toBe(input);
    for (const operation of [encodePayload, decodePayload]) {
      const output = operation(input, 'raw');
      expect(output).toEqual(input);
      expect(output).not.toBe(input);
    }
  });

  it.each([
    [bytes(1, 6, 65, 4, 66, 2, 67), 'AAAAAABBBBCC', 'rle'],
    [bytes(0, 65, 66), 'AB', 'raw'],
    [bytes(0), '', 'raw'],
    [bytes(1), '', 'rle'],
  ] as const)('受信したパケット%jの先頭バイトから方式を決める', (packet, original, method) => {
    const savedPacket = packet.slice();
    expect(decodePacket(packet)).toEqual(ascii(original));
    const trace = traceDecodePacket(packet);
    expect(trace.method).toBe(method);
    expect(trace.output).toEqual(ascii(original));
    expect(trace.steps[0]).toMatchObject({ event: 'read-method', method, sourceOffset: 0, output: [] });
    expect(trace.steps.at(-1)?.output).toEqual(Array.from(ascii(original)));
    expect(packet).toEqual(savedPacket);
  });

  it.each([
    [bytes(), 'empty-packet', 0],
    [bytes(2, 65), 'unknown-method', 0],
    [bytes(255), 'unknown-method', 0],
    [bytes(1, 1, 65, 2), 'odd-length', 3],
    [bytes(1, 0, 65), 'zero-count', 1],
  ])('不正パケットをパケット上の位置付きで拒否する: %j', (packet, code, offset) => {
    for (const operation of [decodePacket, traceDecodePacket]) {
      expect(() => operation(packet)).toThrowError(expect.objectContaining({ code, offset, source: 'packet' }));
    }
  });

  it.each(['rle', 'raw'] as const)('%sでも復元上限を守り、通常処理と記録が一致する', (method) => {
    const input = ascii('AAAA');
    const payload = encodePayload(input, method);
    const packet = packPayload(payload, method);
    expect(packet[0]).toBe(method === 'rle' ? 1 : 0);
    expect(packet.slice(1)).toEqual(payload);
    expect(decodePacket(packet, 4)).toEqual(input);
    expect(traceDecodePayload(payload, method, 4).output).toEqual(decodePayload(payload, method, 4));
    for (const operation of [decodePacket, traceDecodePacket]) {
      expect(() => operation(packet, 3)).toThrowError(expect.objectContaining({ code: 'output-limit', source: 'packet' }));
    }
  });

  it('パケットの復元ステップも方式情報分の位置を含む', () => {
    const trace = traceDecodePacket(bytes(1, 1, 65, 1, 66));
    expect(trace.steps.filter((step) => step.event === 'read-pair').map((step) => step.sourceOffset)).toEqual([1, 3]);
    expect(trace.steps.at(-1)?.sourceOffset).toBe(5);
  });
});

describe('容量・比較・ミッションの判定', () => {
  it('RLE本体6 Bと方式情報込み7 Bを区別する', () => {
    const input = ascii('AAAAAABBBBCC');
    const payload = encodeRle(input);
    expect(calculateMetrics(input, payload, false)).toEqual({
      originalBytes: 12, payloadBytes: 6, metadataBytes: 0, transmittedBytes: 6, savedBytes: 6, reductionPercent: 50,
    });
    expect(calculateMetrics(input, payload, true)).toMatchObject({ payloadBytes: 6, metadataBytes: 1, transmittedBytes: 7, savedBytes: 5 });
    expect(calculateMetrics(input, payload, true).reductionPercent).toBeCloseTo(41.6666667);
  });

  it('増加量を隠さず、空データの割合はnullにする', () => {
    const input = ascii('ABCDEF');
    expect(calculateMetrics(input, encodeRle(input), false)).toMatchObject({ savedBytes: -6, reductionPercent: -100 });
    expect(calculateMetrics(bytes(), bytes(), false).reductionPercent).toBeNull();
    expect(calculateMetrics(bytes(), bytes(), true)).toMatchObject({ transmittedBytes: 1, savedBytes: -1, reductionPercent: null });
  });

  it.each([
    ['AAAABB', 'AAAA', { matches: false, firstMismatch: 4, missingRange: { start: 4, endExclusive: 6 }, extraRange: null }],
    ['AA', 'AAB', { matches: false, firstMismatch: 2, missingRange: null, extraRange: { start: 2, endExclusive: 3 } }],
    ['ABC', 'ADC', { matches: false, firstMismatch: 1, missingRange: null, extraRange: null }],
    ['ABC', 'D', { matches: false, firstMismatch: 0, missingRange: { start: 1, endExclusive: 3 }, extraRange: null }],
    ['', '', { matches: true, firstMismatch: null, missingRange: null, extraRange: null }],
  ])('%sと%sの最初の不一致・不足・余分を返す', (original, restored, expected) => {
    expect(compareBytes(ascii(original), ascii(restored))).toEqual(expected);
  });

  it.each([
    [1, 'AAAAAABBBBCC', 'rle', 8, false, 6, true],
    [2, 'AAAABBCCCC', 'rle', 6, false, 6, true],
    [3, 'ABCDEF', 'rle', 6, false, 12, false],
    [3, 'ABCDEF', 'raw', 6, false, 6, true],
    [4, 'AAAABB', 'rle', 4, false, 4, true],
    [5, 'AAAAAABBBBCC', 'rle', 7, true, 7, true],
    [5, 'AAAAAABBBBCC', 'raw', 7, true, 13, false],
  ] satisfies [number, string, Method, number, boolean, number, boolean][])('ミッション%i: %s / %s', (_, text, method, budget, metadata, size, success) => {
    const original = ascii(text);
    const payload = encodePayload(original, method);
    const transmitted = metadata ? packPayload(payload, method) : payload;
    const restored = metadata ? decodePacket(transmitted) : decodePayload(transmitted, method);
    expect(transmitted.length).toBe(size);
    expect(calculateMetrics(original, payload, metadata).transmittedBytes).toBe(transmitted.length);
    expect(evaluateTransmission(original, restored, transmitted, budget)).toMatchObject({
      success, comparison: { matches: true }, withinBudget: success, exceededBytes: Math.max(0, size - budget),
    });
  });

  it('手動でAを分けると内容一致・容量超過。まとめ直すと成功する', () => {
    const original = ascii('AAAABBCCCC');
    const split = bytes(2, 65, 2, 65, 2, 66, 4, 67);
    expect(evaluateTransmission(original, decodeRle(split), split, 6)).toMatchObject({ comparison: { matches: true }, withinBudget: false, success: false });
    const joined = bytes(4, 65, 2, 66, 4, 67);
    expect(evaluateTransmission(original, decodeRle(joined), joined, 6).success).toBe(true);
  });

  it('ミッション4の欠損fixtureから実際に不足を検出し、修理後に成功する', () => {
    const original = ascii('AAAABB');
    const brokenFixture = bytes(4, 65);
    expect(evaluateTransmission(original, decodeRle(brokenFixture), brokenFixture, 4)).toMatchObject({
      comparison: { matches: false, firstMismatch: 4, missingRange: { start: 4, endExclusive: 6 } }, withinBudget: true, success: false,
    });
    const repaired = bytes(4, 65, 2, 66);
    expect(evaluateTransmission(original, decodeRle(repaired), repaired, 4).success).toBe(true);
    expect(encodeRle(original)).toEqual(repaired);
  });
});

describe('自由実験の入力', () => {
  it.each(['', 'a', ' A', 'A ', 'A\n', 'A1', 'あ', 'Ａ', '🚀', 'A'.repeat(65)])('対象外の入力%jを変換せず拒否する', (text) => {
    expect(() => parseLearningInput(text)).toThrowError(expect.objectContaining({ code: 'invalid-input', source: 'input' }));
  });
  it('1～64文字の半角英大文字をそのままバイト化する', () => {
    expect(parseLearningInput('A')).toEqual(bytes(65));
    expect(parseLearningInput('AZ')).toEqual(bytes(65, 90));
    expect(parseLearningInput('Z'.repeat(64))).toEqual(new Uint8Array(64).fill(90));
  });
});
