import type { DecodeStep, EncodeStep, Run, Trace } from './types.js';
import { ByteFormatError, DEFAULT_MAX_OUTPUT_BYTES, validateOutputLimit } from './validation.js';

/** 通常変換とトレース生成は同じループを使う。通常変換はコピー履歴を作らない。 */
function encode(input: Uint8Array, observe?: (step: EncodeStep) => void): Uint8Array {
  const output: number[] = [];
  let currentRun: Run | null = null;
  let nextReadIndex = 0;
  const emit = (event: EncodeStep['event']) => {
    if (observe) {
      observe(Object.freeze({
        event, nextReadIndex, lastReadIndex: nextReadIndex === 0 ? null : nextReadIndex - 1,
        currentRun: currentRun === null ? null : Object.freeze({ ...currentRun }),
        output: Object.freeze([...output]),
      }));
    }
  };
  emit('initial');
  for (const value of input) {
    nextReadIndex++;
    if (currentRun === null) {
      currentRun = { count: 1, value };
      emit('read-first');
    } else if (currentRun.value === value && currentRun.count < 255) {
      currentRun = { count: currentRun.count + 1, value };
      emit('extend-run');
    } else {
      output.push(currentRun.count, currentRun.value);
      currentRun = { count: 1, value };
      emit('flush-and-start');
    }
  }
  if (currentRun !== null) {
    output.push(currentRun.count, currentRun.value);
    currentRun = null;
    emit('flush-final');
  }
  emit('complete');
  return Uint8Array.from(output);
}

export function encodeRle(input: Uint8Array): Uint8Array {
  return encode(input);
}

/** 全スナップショットを保持するため、短い教材データ用。 */
export function traceEncodeRle(input: Uint8Array): Trace<EncodeStep> {
  const steps: EncodeStep[] = [];
  const output = encode(input, (step) => steps.push(step));
  return { output, steps: Object.freeze(steps) };
}

function decodedLength(payload: Uint8Array, maxOutputBytes: number): number {
  validateOutputLimit(maxOutputBytes);
  if (payload.length % 2 !== 0) {
    throw new ByteFormatError('odd-length', '最後の組に値のバイトがありません。RLEは個数と値の2 Bで1組です。', payload.length - 1);
  }
  let length = 0;
  for (let offset = 0; offset < payload.length; offset += 2) {
    const count = payload[offset]!;
    if (count === 0) {
      throw new ByteFormatError('zero-count', '個数0の組は復元できません。個数は1～255です。', offset);
    }
    length += count;
    if (length > maxOutputBytes) {
      throw new ByteFormatError('output-limit', `復元サイズが上限${maxOutputBytes} Bを超えます。`, offset);
    }
  }
  return length;
}

function decode(payload: Uint8Array, maxOutputBytes: number, observe?: (step: DecodeStep) => void): Uint8Array {
  // 検査完了後にのみ出力を確保する。不正データの途中経過は成功として返さない。
  const output = new Uint8Array(decodedLength(payload, maxOutputBytes));
  let written = 0;
  const emit = (event: DecodeStep['event'], sourceOffset: number, pairIndex: number | null, currentRun: Run | null, emittedFromRun: number) => {
    if (observe) {
      observe(Object.freeze({
        event, method: 'rle', sourceOffset, pairIndex,
        currentRun: currentRun === null ? null : Object.freeze({ ...currentRun }),
        emittedFromRun, output: Object.freeze(Array.from(output.subarray(0, written))),
      }));
    }
  };
  emit('initial', 0, null, null, 0);
  for (let offset = 0; offset < payload.length; offset += 2) {
    const run = { count: payload[offset]!, value: payload[offset + 1]! };
    emit('read-pair', offset, offset / 2, run, 0);
    for (let count = 1; count <= run.count; count++) {
      output[written++] = run.value;
      emit('emit-byte', offset, offset / 2, run, count);
    }
    emit('advance-pair', offset + 2, null, null, 0);
  }
  emit('complete', payload.length, null, null, 0);
  return output;
}

export function decodeRle(payload: Uint8Array, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Uint8Array {
  return decode(payload, maxOutputBytes);
}

export function traceDecodeRle(payload: Uint8Array, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Trace<DecodeStep> {
  const steps: DecodeStep[] = [];
  const output = decode(payload, maxOutputBytes, (step) => steps.push(step));
  return { output, steps: Object.freeze(steps) };
}

/** 手動編集の数値はUint8Arrayへ変換する前に検証し、丸め込みを防ぐ。 */
export function runsToBytes(runs: readonly Run[]): Uint8Array {
  for (const [index, run] of runs.entries()) {
    if (!Number.isInteger(run.count) || run.count < 1 || run.count > 255) {
      throw new ByteFormatError('invalid-count', '個数は1～255の整数で指定してください。', index, 'runs');
    }
    if (!Number.isInteger(run.value) || run.value < 0 || run.value > 255) {
      throw new ByteFormatError('invalid-value', '値は0～255の整数で指定してください。', index, 'runs');
    }
  }
  return Uint8Array.from(runs.flatMap(({ count, value }) => [count, value]));
}
