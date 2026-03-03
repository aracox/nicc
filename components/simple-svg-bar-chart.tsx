interface DataPoint {
  label: string;
  value: number;
}

interface SimpleSvgBarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  title?: string;
}

export function SimpleSvgBarChart({
  data,
  width = 400,
  height = 200,
  color = "#6366f1",
  title,
}: SimpleSvgBarChartProps) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.value));
  const barGap = 8;
  const barWidth = (chartW - barGap * (data.length - 1)) / data.length;

  return (
    <div>
      {title && <p className="mb-2 text-sm font-medium text-slate-700">{title}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = maxVal * pct;
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
        {/* Bars */}
        {data.map((d, i) => {
          const barH = maxVal > 0 ? (d.value / maxVal) * chartH : 0;
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} fill={color} rx={3} />
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px]"
                fill="#94a3b8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
