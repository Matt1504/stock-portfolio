import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Card, Statistic } from "antd";
import { useState } from "react";
import { HoldingDetail } from "../models/Common";
import { statisticColor } from "./statisticColors";
import "./flippableStatistics.css";
import StatisticTitle from "./StatisticTitle";
import "./expandableStatistics.css";

export default function ExpandableStatistics({ details, descriptions, loading, id, columns = 4, collapsible = true }: { details: HoldingDetail[]; descriptions: Record<string, string>; loading?: boolean; id: string; columns?: 2 | 3 | 4; collapsible?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const gridClass = `portfolio-statistics-grid${columns === 2 ? " portfolio-statistics-grid--two" : columns === 3 ? " portfolio-statistics-grid--three" : ""}`;
  const cards = (items: HoldingDetail[]) => items.map(detail => <Card key={detail.title} className={`statistic-card--${statisticColor(detail.title)}`} role="group" aria-label={detail.title}>
    <Statistic loading={loading} title={<StatisticTitle title={detail.title} description={descriptions[detail.title]} />} value={detail.value} prefix={detail.prefix} precision={detail.precision} />
  </Card>);
  if (!collapsible) return <div className={gridClass}>{cards(details)}</div>;
  return <>
    <div className={gridClass}>{cards(details.slice(0, columns))}</div>
    <div id={id} hidden={!expanded} style={{ marginTop: 24 }}>
      <div className={gridClass}>{cards(details.slice(columns))}</div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
      <Button aria-label={expanded ? "Show fewer statistics" : "Show more statistics"} type="text" icon={expanded ? <UpOutlined /> : <DownOutlined />} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer statistics" : "Show more statistics"}</Button>
    </div>
  </>;
}
