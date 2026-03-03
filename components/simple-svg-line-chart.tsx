interface DataPoint {
  label: string;
  value: number;
}

interface SimpleSvgLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  title?: string;
}

export function SimpleSvgLineChart({
  data,
  width = 400,
  height = 200,
  color = "#6366f1",
  title,
}: SimpleSvgLineChartProps) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div>
      {title && <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = minVal + range * pct;
          const y = padding.top + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">
                {Math.round(val)}
              </text>
            </g>
          );
        })}
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={points[i].x}
            y={height - 8}
            textAnchor="middle"
            className="text-[10px]"
            fill="#94a3b8"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
