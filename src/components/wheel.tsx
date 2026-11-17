import type { Candidate } from "@/lib/types";
export function Wheel({
  rows,
  rotation,
  duration,
}: {
  rows: Candidate[];
  rotation: number;
  duration: number;
}) {
  const eligible = rows.filter((r) => !r.reasons.length);
  const count = eligible.length;
  const point = (angle: number, radius: number) => [
    160 + Math.cos(angle) * radius,
    160 + Math.sin(angle) * radius,
  ];
  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" />
      <svg
        role="img"
        aria-label="抽選ルーレット。扇の大きさは均等、抽選は表示された確率で行います。"
        viewBox="0 0 320 320"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${duration}ms cubic-bezier(.12,.65,.15,1)`,
        }}
      >
        <circle cx="160" cy="160" r="155" fill="#f0e8d6" />
        {eligible.map((row, i) => {
          const start = (i / count) * 2 * Math.PI - Math.PI / 2;
          const end = ((i + 1) / count) * 2 * Math.PI - Math.PI / 2;
          const [x1, y1] = point(start, 148);
          const [x2, y2] = point(end, 148);
          const [tx, ty] = point((start + end) / 2, 98);
          return (
            <g key={row.member.id}>
              {count === 1 ? (
                <circle cx="160" cy="160" r="148" fill={row.member.color} />
              ) : (
                <path
                  d={`M160 160 L${x1} ${y1} A148 148 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`}
                  fill={row.member.color}
                  stroke="#fffaf0"
                  strokeWidth="3"
                />
              )}
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="15"
                fontWeight="700"
                transform={`rotate(${(((start + end) / 2) * 180) / Math.PI + 90},${tx},${ty})`}
              >
                {row.member.name.split(" ")[0]}
              </text>
            </g>
          );
        })}
        <circle cx="160" cy="160" r="34" fill="#fffdf7" />
        <circle cx="160" cy="160" r="24" fill="#17665c" />
        <text x="160" y="168" fill="white" fontSize="25" textAnchor="middle">
          ✦
        </text>
      </svg>
    </div>
  );
}
