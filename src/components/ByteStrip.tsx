import { Ship } from "./Sprites.js";

interface Props {
  bytes: readonly number[];
  label: string;
  activeStart?: number;
  activeEnd?: number;
  confirmedUntil?: number;
  cursor?: number | null;
}

export function ByteStrip({
  bytes,
  label,
  activeStart = -1,
  activeEnd = -1,
  confirmedUntil = 0,
  cursor = null,
}: Props) {
  return (
    <ol className="byte-strip" aria-label={label}>
      {bytes.map((value, index) => (
        <li
          key={index}
          className={`byte-tile value-${value} ${index >= activeStart && index < activeEnd ? "selected" : ""} ${index < confirmedUntil ? "confirmed" : ""} ${index === cursor ? "cursor" : ""}`}
          aria-label={`位置${index}：${String.fromCharCode(value)}${index === cursor ? "、読取位置" : ""}`}
        >
          <span className="byte-index">{String(index).padStart(2, "0")}</span>
          <Ship variant="data" />
          <strong>{String.fromCharCode(value)}</strong>
        </li>
      ))}
    </ol>
  );
}
