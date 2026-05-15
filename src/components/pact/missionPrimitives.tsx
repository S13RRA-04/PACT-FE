import type { ContentType, PactContent } from "../../types";
import { contentTypeLabel } from "../../lib/format";

export type HudMetric = {
  label: string;
  value: string | number;
};

export type HudContextItem = {
  label: string;
  value: string | number;
};

export type HudCallout = {
  label: string;
  value: string | number;
  detail: string;
  tone?: "success" | "pending" | "failed" | "neutral";
};

export function contentTypeCounts(content: PactContent[]) {
  return content.reduce<Record<ContentType, number>>(
    (counts, item) => ({ ...counts, [item.type]: counts[item.type] + 1 }),
    { module: 0, challenge: 0, game: 0, assessment: 0 }
  );
}

export function typeIcon(type: ContentType) {
  if (type === "challenge") return "C";
  if (type === "game") return "G";
  if (type === "assessment") return "A";
  return "M";
}

export function contentTypeModeLabel(type: ContentType) {
  if (type === "challenge") return "Challenge drill";
  if (type === "game") return "Game simulation";
  if (type === "assessment") return "Assessment gate";
  return "Learning module";
}

export function MissionTypeCard({
  type,
  count,
  active = false,
  onSelect
}: {
  type: ContentType;
  count: number;
  active?: boolean;
  onSelect?: (type: ContentType) => void;
}) {
  const className = `mission-type-card type-${type} ${active ? "active" : ""}`;
  const content = (
    <>
      <span>{typeIcon(type)}</span>
      <div>
        <strong>{count}</strong>
        <small>{contentTypeLabel(type)}</small>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button aria-pressed={active} className={className} type="button" onClick={() => onSelect(type)}>
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

export function ProgressTrack({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="progress-track"><span style={{ width: `${bounded}%` }} /></div>;
}

export function MissionProgressCard({
  label = "Mission Progress",
  value,
  detail
}: {
  label?: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="mission-progress-card" aria-label={label}>
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <ProgressTrack value={value} />
      <small>{detail}</small>
    </div>
  );
}

export function MissionQueueItem({
  item,
  selected,
  onSelect
}: {
  item: PactContent;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button className={`module-row type-${item.type} ${selected ? "selected" : ""}`} type="button" onClick={() => onSelect(item.id)}>
      <span className={`module-index type-${item.type}`}>{typeIcon(item.type)}</span>
      <span className="module-row-copy">
        <small className="module-row-kicker">{contentTypeModeLabel(item.type)}{item.day ? ` | ${item.day}` : ""}</small>
        <strong>{item.title}</strong>
        <small>
          <span>{item.questionCount ?? item.questions?.length ?? 0} questions</span>
          <span>{item.maxScore} pts</span>
          <span>{item.cohortId ?? "all cohorts"}</span>
        </small>
      </span>
      <span className="module-row-arrow" aria-hidden="true">&gt;</span>
    </button>
  );
}

export function OperatorHud({
  label = "Operator HUD",
  title,
  metrics,
  context,
  callout,
  status
}: {
  label?: string;
  title: string;
  metrics: HudMetric[];
  context: HudContextItem[];
  callout?: HudCallout;
  status?: string;
}) {
  return (
    <aside className="activity-panel" aria-label={title}>
      <section>
        <span className="panel-label">{label}</span>
        <h2>{title}</h2>
        <div className="metric-grid">
          {metrics.map((metric) => (
            <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>
          ))}
        </div>
      </section>
      <section>
        <h3>Current Context</h3>
        <dl className="context-list">
          {context.map((item) => (
            <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
          ))}
        </dl>
      </section>
      {callout ? (
        <section>
          <h3>Score Sync</h3>
          <div className={`score-callout ${callout.tone ?? "neutral"}`}>
            <span>{callout.label}</span>
            <strong>{callout.value}</strong>
            <small>{callout.detail}</small>
          </div>
        </section>
      ) : null}
      {status ? <section><h3>Status</h3><p className="muted">{status}</p></section> : null}
    </aside>
  );
}
