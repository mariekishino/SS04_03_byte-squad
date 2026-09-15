export const DEFAULT_MAX_OUTPUT_BYTES = 4096;

export type FormatErrorCode = 'odd-length' | 'zero-count' | 'output-limit' | 'empty-packet' | 'unknown-method' | 'invalid-count' | 'invalid-value' | 'invalid-input';

export class ByteFormatError extends Error {
  readonly code: FormatErrorCode;
  /** 0始まり。sourceで示すデータ中の位置。 */
  readonly offset: number;
  readonly source: 'payload' | 'packet' | 'runs' | 'input';

  constructor(code: FormatErrorCode, message: string, offset: number, source: ByteFormatError['source'] = 'payload') {
    super(message);
    this.name = 'ByteFormatError';
    this.code = code;
    this.offset = offset;
    this.source = source;
  }
}

export function validateOutputLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError('復元上限は0以上の安全な整数で指定してください。');
  }
}

/** UI入力のみの規則。バイナリを扱うコアの入力はA～Zに制限しない。 */
export function parseLearningInput(text: string): Uint8Array {
  if (text.length < 1 || text.length > 64) {
    throw new ByteFormatError('invalid-input', '半角英大文字A～Zを1～64文字入力してください。', text.length > 64 ? 64 : 0, 'input');
  }
  const invalidIndex = text.search(/[^A-Z]/);
  if (invalidIndex !== -1) {
    throw new ByteFormatError('invalid-input', '半角英大文字A～Zのみ使えます。小文字や空白は自動変換されません。', invalidIndex, 'input');
  }
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}
