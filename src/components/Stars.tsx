import { useId } from "react";

const STAR = "M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z";

/** Mỗi sao là một SVG duy nhất; sao lẻ dùng gradient cắt cứng nên không bị viền xám lộ ra phía sau. */
export default function Stars({ value, size = 12 }: { value: number; size?: number }) {
  const uid = useId();
  return (
    <span className="inline-flex items-center gap-px" aria-label={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i + 1));
        const gid = `${uid}-${i}`;
        const partial = fill > 0 && fill < 1;
        return (
          <svg key={i} viewBox="0 0 20 20" width={size} height={size} className="shrink-0" aria-hidden="true">
            {partial && (
              <defs>
                <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
                  <stop offset={fill} stopColor="#fbbf24" />
                  <stop offset={fill} stopColor="#d1d5db" />
                </linearGradient>
              </defs>
            )}
            <path d={STAR} fill={partial ? `url(#${gid})` : fill >= 1 ? "#fbbf24" : "#d1d5db"} />
          </svg>
        );
      })}
    </span>
  );
}
