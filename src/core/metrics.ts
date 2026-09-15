export interface SizeMetrics {
  readonly originalBytes: number;
  readonly payloadBytes: number;
  readonly metadataBytes: number;
  readonly transmittedBytes: number;
  readonly savedBytes: number;
  /** 元データが空の場合はnull。UIでは「—」と表示する。 */
  readonly reductionPercent: number | null;
}

export function calculateMetrics(original: Uint8Array, payload: Uint8Array, hasMethodByte: boolean): SizeMetrics {
  const originalBytes = original.length;
  const payloadBytes = payload.length;
  const metadataBytes = hasMethodByte ? 1 : 0;
  const transmittedBytes = payloadBytes + metadataBytes;
  return {
    originalBytes, payloadBytes, metadataBytes, transmittedBytes,
    savedBytes: originalBytes - transmittedBytes,
    reductionPercent: originalBytes === 0 ? null : (1 - transmittedBytes / originalBytes) * 100,
  };
}

/** 範囲は0始まり、endExclusiveは含まない。 */
export interface ByteRange {
  readonly start: number;
  readonly endExclusive: number;
}

export interface ByteComparison {
  readonly matches: boolean;
  readonly firstMismatch: number | null;
  readonly missingRange: ByteRange | null;
  readonly extraRange: ByteRange | null;
}

export function compareBytes(original: Uint8Array, restored: Uint8Array): ByteComparison {
  const sharedLength = Math.min(original.length, restored.length);
  let firstMismatch: number | null = null;
  for (let index = 0; index < sharedLength; index++) {
    if (original[index] !== restored[index]) {
      firstMismatch = index;
      break;
    }
  }
  if (firstMismatch === null && original.length !== restored.length) firstMismatch = sharedLength;
  return {
    matches: firstMismatch === null, firstMismatch,
    missingRange: restored.length < original.length ? { start: restored.length, endExclusive: original.length } : null,
    extraRange: restored.length > original.length ? { start: original.length, endExclusive: restored.length } : null,
  };
}

/** 復元が成功した後だけ呼ぶ。容量超過でも内容一致を独立に確認できる。 */
export function evaluateTransmission(original: Uint8Array, restored: Uint8Array, transmitted: Uint8Array, budgetBytes: number) {
  if (!Number.isSafeInteger(budgetBytes) || budgetBytes < 0) {
    throw new RangeError('通信予算は0以上の安全な整数で指定してください。');
  }
  const comparison = compareBytes(original, restored);
  const withinBudget = transmitted.length <= budgetBytes;
  return { comparison, withinBudget, exceededBytes: Math.max(0, transmitted.length - budgetBytes), success: comparison.matches && withinBudget };
}
