import { Radio, Space } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { GraphData } from "../models/GraphData";

export type ChartRange = "3m" | "1y" | "2y" | "all";

export function chartHistoryInRange(points: GraphData[], range: ChartRange, now: Dayjs = dayjs()): GraphData[] {
  const sorted = [...points].sort((a, b) => a.name.localeCompare(b.name));
  if (range === "all" || !sorted.length) return sorted;
  const start = (range === "3m" ? now.subtract(3, "month") : now.subtract(range === "1y" ? 1 : 2, "year")).format("YYYY-MM-DD");
  const end = now.format("YYYY-MM-DD");
  const previous = sorted.filter(point => point.name < start).pop();
  const visible = sorted.filter(point => point.name >= start && point.name <= end);
  // Keep accumulated balances from before the window; changing the horizon
  // must not turn a lifetime balance into a sum of only recent transactions.
  if (previous && visible[0]?.name !== start) visible.unshift(new GraphData(start, previous.value, previous.value_1, previous.label));
  const last = visible[visible.length - 1];
  if (last && last.name < end) visible.push(new GraphData(end, last.value, last.value_1, last.label));
  return visible;
}

export default function ChartTimeRange({ value, onChange, label }: { value: ChartRange; onChange: (range: ChartRange) => void; label: string }) {
  return <Space wrap size={[12, 8]}>
    <span>Time range</span>
    <Radio.Group aria-label={label} value={value} onChange={event => onChange(event.target.value)} optionType="button" buttonStyle="solid">
      <Radio.Button value="3m">3 months</Radio.Button>
      <Radio.Button value="1y">1 year</Radio.Button>
      <Radio.Button value="2y">2 years</Radio.Button>
      <Radio.Button value="all">All time</Radio.Button>
    </Radio.Group>
  </Space>;
}
