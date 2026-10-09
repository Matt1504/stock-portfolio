import { DownOutlined, SwapOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Card, Statistic } from "antd";
import { useEffect, useId, useState } from "react";
import { HoldingDetail } from "../models/Common";
import { statisticColor } from "./statisticColors";
import StatisticTitle from "./StatisticTitle";
import "./expandableStatistics.css";
import "./flippableStatistics.css";

const accountPairs = [
  ["Net Deposits", "Total Book Cost"],
  ["Realized Profit", "Realized Gain/Loss"],
  ["Amount Contributed", "Amount Withdrawn"],
  ["Amount Transferred In", "Amount Transferred Out"],
  ["Dividends/Interest Earned", "Fees Paid"],
  ["Total Share(s) Owned"],
  ["Unique Share(s) Owned"],
  ["Largest Holding", "Smallest Holding"],
];

export const accountCardPairs = [
  ["Cash Balance"],
  ["Total Book Cost", "Net Deposits"],
  ["Realized Profit", "Realized Gain/Loss"],
  ["Amount Contributed", "Amount Withdrawn"],
  ["Amount Transferred In", "Amount Transferred Out"],
  ["Dividends/Interest Earned", "Fees Paid"],
  ["Total Share(s) Owned", "Unique Share(s) Owned"],
  ["Largest Holding", "Smallest Holding"],
];

export const stockCardPairs = [
  ["Book Cost"],
  ["Average Cost per Share"],
  ["Realized Profit/Loss", "Realized Gain/Loss"],
  ["Share(s) Owned"],
  ["Total Shares Sold", "Total Shares Bought"],
  ["Dividends/Interest Earned", "Total Fees Paid"],
  ["Last Sell Date", "Last Buy Date"],
  ["Sale Proceeds", "Total Invested"],
];

function statisticMagnitude(detail: HoldingDetail) {
  if (typeof detail.value === "number") return detail.value;
  const value = String(detail.value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(value);
  // Holding labels contain a ticker and formatted book cost.
  const amount = value.includes("| $") ? value.split("| $")[1] : value;
  const numeric = Number(amount.replaceAll(",", ""));
  return amount.trim() && Number.isFinite(numeric) ? numeric : -Infinity;
}

export function FlipCard({ front, back, descriptions, loading }: { front: HoldingDetail; back?: HoldingDetail; descriptions: Record<string, string>; loading?: boolean }) {
  const [selectedFace, setSelectedFace] = useState<boolean>();
  const flipped = selectedFace ?? Boolean(back && statisticMagnitude(back) > statisticMagnitude(front));
  const [flipping, setFlipping] = useState(false);
  const flip = () => {
    setFlipping(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    setSelectedFace(!flipped);
  };
  useEffect(() => {
    if (!flipping) return;
    // Reduced motion or an interrupted CSS transition may not fire its end event.
    const timer = window.setTimeout(() => setFlipping(false), 500);
    return () => window.clearTimeout(timer);
  }, [flipping, flipped]);
  const active = flipped && back ? back : front;
  const next = flipped ? front : back;
  const face = (detail: HoldingDetail, reverse = false) => <div
    className={`flip-statistic-face ${reverse ? "flip-statistic-face--back" : ""} flip-statistic-face--${statisticColor(detail.title)}`}
    aria-hidden={reverse !== flipped}
  >
    <Statistic title={<span aria-hidden="true">&nbsp;</span>} value={loading ? "—" : detail.value} prefix={loading ? undefined : detail.prefix} suffix={loading ? undefined : detail.suffix} precision={detail.precision} valueStyle={detail.valueColor ? { color: detail.valueColor } : undefined} />
  </div>;
  return <Card role="group" aria-label={active.title} aria-busy={loading} className={`flip-statistic${back ? " flip-statistic--paired" : ""} flip-statistic--${statisticColor(active.title)}`} onClick={event => { if (back && !loading && !(event.target as Element).closest("button")) flip(); }}>
    <div className="flip-statistic-title"><StatisticTitle key={active.title} title={active.title} description={descriptions[active.title]} disabled={flipping || loading} /></div>
    <div className={`flip-statistic-inner${flipped ? " flip-statistic-inner--flipped" : ""}`} onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "transform") setFlipping(false); }}>
      {face(front)}
      {back && face(back, true)}
    </div>
    {next && <button type="button" className="flip-statistic-trigger" aria-label={`Show ${next.title}`} disabled={loading} onClick={flip}>
      <span><SwapOutlined aria-hidden /> {next.title}</span>
    </button>}
  </Card>;
}

export default function FlippableStatistics({ details, descriptions, loading, pairs = accountPairs }: { details: HoldingDetail[]; descriptions: Record<string, string>; loading?: boolean; pairs?: string[][] }) {
  const [expanded, setExpanded] = useState(false);
  const extraId = useId();
  const cards = pairs.flatMap(([title, reverse]) => {
    const front = details.find(detail => detail.title === title);
    const back = details.find(detail => detail.title === reverse);
    return front ? [<FlipCard key={title} front={front} back={back} descriptions={descriptions} loading={loading} />] : [];
  });
  return <>
    <div className="portfolio-statistics-grid">{cards.slice(0, 4)}</div>
    {cards.length > 4 && <>
      <div id={extraId} hidden={!expanded} style={{ marginTop: 24 }}>
        {expanded && <div className="portfolio-statistics-grid">{cards.slice(4)}</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <Button aria-label={expanded ? "Show fewer statistics" : "Show more statistics"} type="text" icon={expanded ? <UpOutlined /> : <DownOutlined />} aria-expanded={expanded} aria-controls={extraId} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer statistics" : "Show more statistics"}</Button>
      </div>
    </>}
  </>;
}
