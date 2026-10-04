import { formatNumber } from "../utils/utils";
export const CustomTooltip = ({ active, payload, label, hideZeroValues = false }: any) => {
  const entries = (payload ?? []).filter((entry: any) => entry.value != null && (!hideZeroValues || entry.value !== 0));
  if (!active || !entries.length) return null;
  return <div className="custom-chart-tooltip">
    <p className="chart-label">{label}</p>
    {entries.map((entry: any, index: number) => <p className="chart-desc" key={entry.dataKey ?? index}>
      {entry.name}: <span style={{ color: entry.fill }}>${formatNumber(Number(entry.value), 2, 2)}</span>
    </p>)}
  </div>;
};
