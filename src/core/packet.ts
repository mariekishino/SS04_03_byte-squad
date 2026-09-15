import { decodeRle, encodeRle, traceDecodeRle } from './rle.js';
import type { DecodeStep, Method, Trace } from './types.js';
import { ByteFormatError, DEFAULT_MAX_OUTPUT_BYTES, validateOutputLimit } from './validation.js';

function copyBytes(input: Uint8Array, maxOutputBytes: number, observe?: (step: DecodeStep) => void): Uint8Array {
  validateOutputLimit(maxOutputBytes);
  if (input.length > maxOutputBytes) {
    throw new ByteFormatError('output-limit', `復元サイズが上限${maxOutputBytes} Bを超えます。`, maxOutputBytes);
  }
  const output = new Uint8Array(input.length);
  const emit = (event: DecodeStep['event'], sourceOffset: number, written: number) => {
    if (observe) {
      observe(Object.freeze({ event, method: 'raw', sourceOffset, pairIndex: null, currentRun: null,
        emittedFromRun: 0, output: Object.freeze(Array.from(output.subarray(0, written))) }));
    }
  };
  emit('initial', 0, 0);
  for (let index = 0; index < input.length; index++) {
    output[index] = input[index]!;
    emit('copy-byte', index, index + 1);
  }
  emit('complete', input.length, input.length);
  return output;
}

/** 無圧縮の送信準備・受信のどちらにも使える1バイトずつのコピー記録。 */
export function traceCopyBytes(input: Uint8Array, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Trace<DecodeStep> {
  const steps: DecodeStep[] = [];
  const output = copyBytes(input, maxOutputBytes, (step) => steps.push(step));
  return { output, steps: Object.freeze(steps) };
}

export function encodePayload(input: Uint8Array, method: Method): Uint8Array {
  return method === 'rle' ? encodeRle(input) : copyBytes(input, input.length);
}

export function decodePayload(payload: Uint8Array, method: Method, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Uint8Array {
  return method === 'rle' ? decodeRle(payload, maxOutputBytes) : copyBytes(payload, maxOutputBytes);
}

export function traceDecodePayload(payload: Uint8Array, method: Method, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Trace<DecodeStep> {
  return method === 'rle' ? traceDecodeRle(payload, maxOutputBytes) : traceCopyBytes(payload, maxOutputBytes);
}

/** 本体にゲーム独自の方式バイトを付ける。手動で作った本体にも使う。 */
export function packPayload(payload: Uint8Array, method: Method): Uint8Array {
  const packet = new Uint8Array(payload.length + 1);
  packet[0] = method === 'rle' ? 1 : 0;
  packet.set(payload, 1);
  return packet;
}

function readMethod(packet: Uint8Array): Method {
  if (packet.length === 0) {
    throw new ByteFormatError('empty-packet', '方式情報のバイトがありません。', 0, 'packet');
  }
  if (packet[0] === 0) return 'raw';
  if (packet[0] === 1) return 'rle';
  throw new ByteFormatError('unknown-method', '未知の方式です。方式バイトは0（無圧縮）または1（RLE）です。', 0, 'packet');
}

function withPacketOffsets<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof ByteFormatError && error.source === 'payload') {
      throw new ByteFormatError(error.code, error.message, error.offset + 1, 'packet');
    }
    throw error;
  }
}

/** 方式は先頭バイトからのみ決定する。元データやUIの方式選択は受け取らない。 */
export function decodePacket(packet: Uint8Array, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Uint8Array {
  const method = readMethod(packet);
  return withPacketOffsets(() => decodePayload(packet.subarray(1), method, maxOutputBytes));
}

export function traceDecodePacket(packet: Uint8Array, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES): Trace<DecodeStep> & { readonly method: Method } {
  const method = readMethod(packet);
  const trace = withPacketOffsets(() => traceDecodePayload(packet.subarray(1), method, maxOutputBytes));
  const first: DecodeStep = Object.freeze({
    event: 'read-method', method, sourceOffset: 0, pairIndex: null,
    currentRun: null, emittedFromRun: 0, output: Object.freeze([]),
  });
  const steps = [first, ...trace.steps.map((step) => Object.freeze({ ...step, sourceOffset: step.sourceOffset + 1 }))];
  return { method, output: trace.output, steps: Object.freeze(steps) };
}
