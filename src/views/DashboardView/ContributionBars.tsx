import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "../../utils/utils";
export type ContributionBar = { name: string; contribution: number; limit?: number };
export function contributionBarColor({ contribution, limit }: ContributionBar) {
  if (limit == null) return "#8b5cf6";
  // Compare monetary amounts in cents, ignoring floating-point summation noise.
  const contributedCents = Math.round(contribution * 100);
  const limitCents = Math.round(limit * 100);
  if (contributedCents > limitCents) return "#ef4444";
  if (limitCents > 0 && contributedCents === limitCents) return "#22c55e";
  return "#8b5cf6";
}
function LimitMarker({ x, y, width, height, value }: any) {
  if (value == null) return null;
  return <line x1={x + width} x2={x + width} y1={y - 4} y2={y + height + 4} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />;
}
export default function ContributionBars({ data }: { data: ContributionBar[] }) {
  return <section className="chart-container" aria-label="Account Contributions" style={{ marginTop: 24 }}>
    <h3>Account Contributions</h3>
    <p style={{ color: 'var(--text-secondary)' }}>All-time contributions and saved limits, matching the cards above. Dotted markers show contribution limits; NRSA has no limit.</p>
    <div style={{ height: Math.max(260, data.length * 65) }}><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ right: 35, left: 10, top: 20, bottom: 20 }} barGap={-24}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={value => formatNumber(Number(value))} />
        <YAxis type="category" dataKey="name" width={70} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" }}
          labelStyle={{ color: "var(--text)" }}
          itemStyle={{ color: "var(--text)" }}
          formatter={(value: any, name: any) => [`$${formatNumber(Number(value), 2, 2)}`, name]}
        />
        <Bar dataKey="contribution" name="Contributed" barSize={24} radius={[0, 4, 4, 0]}>{data.map(row => <Cell key={row.name} fill={contributionBarColor(row)} />)}</Bar>
        <Bar dataKey="limit" name="Contribution limit" fill="#ef4444" barSize={24} shape={<LimitMarker />} />
      </BarChart>
    </ResponsiveContainer></div>
  </section>;
}
