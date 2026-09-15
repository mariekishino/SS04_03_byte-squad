export type Method = 'raw' | 'rle';

export interface Run {
  readonly count: number;
  readonly value: number;
}

export interface EncodeStep {
  readonly event: 'initial' | 'read-first' | 'extend-run' | 'flush-and-start' | 'flush-final' | 'complete';
  readonly nextReadIndex: number;
  readonly lastReadIndex: number | null;
  readonly currentRun: Run | null;
  /** 確定済みの本体。現在集計中の組は含まない。 */
  readonly output: readonly number[];
}

export interface DecodeStep {
  readonly event: 'initial' | 'read-method' | 'read-pair' | 'emit-byte' | 'advance-pair' | 'copy-byte' | 'complete';
  readonly method: Method;
  /** 本体の0始まり位置。パケットのトレースでは方式バイト分を加算する。 */
  readonly sourceOffset: number;
  readonly pairIndex: number | null;
  readonly currentRun: Run | null;
  readonly emittedFromRun: number;
  readonly output: readonly number[];
}

export interface Trace<Step> {
  readonly output: Uint8Array;
  readonly steps: readonly Step[];
}
