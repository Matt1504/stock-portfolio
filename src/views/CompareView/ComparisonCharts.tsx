import { Card, Empty, Space, Typography } from "antd";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartTimeRange, { ChartRange, barHistoryInRange, chartHistoryInRange } from "../../components/ChartTimeRange";
import { GraphData } from "../../models/GraphData";
import { formatNumber } from "../../utils/utils";
import { HistoryPoint } from "./types";
const A = "#8b5cf6", B = "#14b8a6";
export default function ComparisonCharts({ history, currency }: { history: HistoryPoint[]; currency: string }) {
  const [range, setRange] = useState<ChartRange>("all");
  const series = (left: keyof HistoryPoint, right: keyof HistoryPoint, cumulative: boolean) => {
    const points = history.map(point => new GraphData(point.date, Number(point[left]), Number(point[right]), undefined));
    return cumulative ? chartHistoryInRange(points, range) : barHistoryInRange(points.filter(point => point.value !== 0 || point.value_1 !== 0), range);
  };
  const chart = (title: string, left: keyof HistoryPoint, right: keyof HistoryPoint, cumulative: boolean) => {
    const points = series(left, right, cumulative);
    const axes = <><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" minTickGap={35} /><YAxis tickFormatter={value => formatNumber(Number(value), 0)} /><Tooltip formatter={(value: any) => `${formatNumber(Number(value), 2, 2)} ${currency}`} contentStyle={{ background: "var(--surface)", color: "var(--text)" }} /><Legend /></>;
    return <Card key={title} title={title}>{points.length ? <ResponsiveContainer width="100%" height={290}>{cumulative ?
      <LineChart data={points}>{axes}<Line type="stepAfter" dataKey="value" name="A" stroke={A} dot={false} /><Line type="stepAfter" dataKey="value_1" name="B" stroke={B} dot={false} /></LineChart> :
      <BarChart data={points}>{axes}<Bar dataKey="value" name="A" fill={A} /><Bar dataKey="value_1" name="B" fill={B} /></BarChart>}
    </ResponsiveContainer> : <Empty description="No history in this range" />}</Card>;
  };
  return <Space direction="vertical" size={24} style={{ width: "100%" }}>
    <div style={{ display: "flex", justifyContent: "flex-end" }}><ChartTimeRange label="Comparison history range" value={range} onChange={setRange} /></div>
    <Typography.Text type="secondary">Ranges change charts only. Statistics and holdings retain their full recorded history.</Typography.Text>
    {chart("Book Cost History", "leftBookCost", "rightBookCost", true)}
    {chart("Net Deposit History", "leftNetDeposits", "rightNetDeposits", true)}
    {chart("Net Dividends / Interest / Lending Income", "leftIncome", "rightIncome", false)}
    {chart("Buy Totals", "leftBuys", "rightBuys", false)}
    {chart("Sale Proceeds / Returned GIC Principal", "leftSales", "rightSales", false)}
  </Space>;
}
