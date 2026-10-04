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

// Bar charts contain individual activities, so never carry balances or add dates.
export function barHistoryInRange(points: GraphData[], range: ChartRange, now: Dayjs = dayjs()): GraphData[] {
  const sorted = [...points].sort((a, b) => a.name.localeCompare(b.name));
  if (range === "all") return sorted;
  const start = (range === "3m" ? now.subtract(3, "month") : now.subtract(range === "1y" ? 1 : 2, "year")).format("YYYY-MM-DD");
  return sorted.filter(point => point.name >= start && point.name <= now.format("YYYY-MM-DD"));
}

export function availableBarRanges(points: GraphData[], now: Dayjs = dayjs()): ChartRange[] {
  const sorted = barHistoryInRange(points, "all", now);
  // No useful rolling horizon for a history with no recent activity.
  if (!sorted.length || !sorted.some(point => point.name >= now.subtract(1, "year").format("YYYY-MM-DD") && point.name <= now.format("YYYY-MM-DD"))) return ["all"];
  const ranges: ChartRange[] = [];
  let previousDates = "";
  for (const range of ["3m", "1y", "2y"] as const) {
    const visible = barHistoryInRange(sorted, range, now);
    const dates = visible.map(point => point.name).join(",");
    if (visible.length && visible.length < sorted.length && dates !== previousDates) {
      ranges.push(range);
      previousDates = dates;
    }
  }
  return [...ranges, "all"];
}

export default function ChartTimeRange({ value, onChange, label, ranges = ["3m", "1y", "2y", "all"] }: { value: ChartRange; onChange: (range: ChartRange) => void; label: string; ranges?: ChartRange[] }) {
  const labels = { "3m": "3 months", "1y": "1 year", "2y": "2 years", all: "All time" };
  return <Space wrap size={[12, 8]}>
    <span>Time range</span>
    <Radio.Group aria-label={label} value={value} onChange={event => onChange(event.target.value)} optionType="button" buttonStyle="solid">
      {ranges.map(range => <Radio.Button key={range} value={range}>{labels[range]}</Radio.Button>)}
    </Radio.Group>
  </Space>;
}
