import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Card, Statistic } from "antd";
import { useState } from "react";
import { HoldingDetail } from "../models/Common";
import StatisticTitle from "./StatisticTitle";
import "./expandableStatistics.css";

export default function ExpandableStatistics({ details, descriptions, loading, id }: { details: HoldingDetail[]; descriptions: Record<string, string>; loading?: boolean; id: string }) {
  const [expanded, setExpanded] = useState(false);
  const cards = (items: HoldingDetail[]) => items.map(detail => <Card key={detail.title} role="group" aria-label={detail.title}>
    <Statistic loading={loading} title={<StatisticTitle title={detail.title} description={descriptions[detail.title]} />} value={detail.value} prefix={detail.prefix} precision={detail.precision} />
  </Card>);
  return <>
    <div className="portfolio-statistics-grid">{cards(details.slice(0, 4))}</div>
    <div id={id} hidden={!expanded} style={{ marginTop: 24 }}>
      <div className="portfolio-statistics-grid">{cards(details.slice(4))}</div>
    </div>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
      <Button aria-label={expanded ? "Show fewer statistics" : "Show more statistics"} type="text" icon={expanded ? <UpOutlined /> : <DownOutlined />} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer statistics" : "Show more statistics"}</Button>
    </div>
  </>;
}
