import { BarChartOutlined, PieChartOutlined } from "@ant-design/icons";
import { Radio } from "antd";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GraphData } from "../models/GraphData";
import { formatNumber } from "../utils/utils";
import { RenderActiveShape } from "./PieChartShape";
import "./bookCostDistribution.css";

export function distributionColour(index: number, count: number): string {
  // Alternate dark/light shades so adjacent slices remain easy to distinguish.
  const rank = index % 2 === 0 ? Math.floor(index / 2) : count - 1 - Math.floor(index / 2);
  const lightness = count <= 1 ? 50 : 32 + rank * 46 / (count - 1);
  return `hsl(265, 68%, ${lightness}%)`;
}

export function DistributionTooltip({ active, payload, total }: any) {
  const entry = payload?.[0]?.payload as GraphData | undefined;
  if (!active || !entry) return null;
  return <div className="custom-chart-tooltip">
    <p className="chart-label">{entry.name}</p>
    <p>Book Cost: ${formatNumber(entry.value, 2, 2)}</p>
    <p>{formatNumber(total ? entry.value / total * 100 : 0, 2, 2)}% of book cost</p>
    {entry.label != null && <p>{formatNumber(Number(entry.label))} Share(s)</p>}
  </div>;
}

export default function BookCostDistribution({ data }: { data: GraphData[] }) {
  const [view, setView] = useState("pie");
  const [activeIndex, setActiveIndex] = useState(0);
  const entries = data.filter(entry => entry.value > 0);
  if (!entries.length) return null;
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const cells = entries.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={distributionColour(index, entries.length)} stroke="var(--surface)" strokeWidth={2} />);

  return <section className="chart-container book-cost-distribution" aria-label="Book Cost Distribution">
    <div className="book-cost-distribution-header">
      <h3>Book Cost Distribution</h3>
      <Radio.Group aria-label="Distribution chart type" value={view} onChange={event => setView(event.target.value)} optionType="button" buttonStyle="solid">
        <Radio.Button value="pie"><PieChartOutlined aria-hidden /> Pie</Radio.Button>
        <Radio.Button value="bar"><BarChartOutlined aria-hidden /> Bar</Radio.Button>
      </Radio.Group>
    </div>
    {view === "pie" ? <div style={{ height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={100} outerRadius={140}
            activeIndex={Math.min(activeIndex, entries.length - 1)} activeShape={RenderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}>
            {cells}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div> : <div className="book-cost-bars-scroll">
      <div style={{ height: Math.max(260, entries.length * 48 + 50) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entries} layout="vertical" margin={{ top: 12, right: 110, bottom: 12, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={value => formatNumber(Number(value), 2)} />
            <YAxis type="category" dataKey="name" width={160} tickLine={false} axisLine={false} tickFormatter={value => String(value).length > 22 ? `${String(value).slice(0, 21)}…` : String(value)} />
            <Tooltip content={<DistributionTooltip total={total} />} cursor={{ fill: "var(--chart-grid)", opacity: 0.3 }} />
            <Bar dataKey="value" name="Book Cost" maxBarSize={28} radius={[0, 5, 5, 0]}>
              {cells}
              <LabelList dataKey="value" position="right" formatter={(value: any) => `$${formatNumber(Number(value), 2, 2)}`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>}
  </section>;
}
