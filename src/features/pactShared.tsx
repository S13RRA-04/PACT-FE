import type { SessionDiagnostic } from "../types";
import { contentTypeLabel } from "../lib/format";

export function SessionDiagnosticSummary({ diagnostic }: { diagnostic: SessionDiagnostic }) {
  return (
    <div className="diagnostic-panel" aria-label="Session diagnostics">
      <dl className="diagnostic-grid">
        <div><dt>Course</dt><dd>{diagnostic.courseId}</dd></div>
        <div><dt>Cohort</dt><dd>{diagnostic.cohortId}</dd></div>
        <div><dt>Visible</dt><dd>{diagnostic.visibleContentCount}</dd></div>
        <div><dt>Launch Type</dt><dd>{diagnostic.contentType ? contentTypeLabel(diagnostic.contentType) : "All"}</dd></div>
      </dl>
      {diagnostic.contentCounts?.length ? (
        <div className="content-counts" aria-label="Content counts">
          {diagnostic.contentCounts.map((item) => (
            <span key={`${item.courseId}-${item.cohortId ?? "global"}-${item.type}-${item.status}`}>
              {item.courseId}/{item.cohortId ?? "global"} {contentTypeLabel(item.type)} {item.status}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Empty({ text: message }: { text: string }) {
  return <div className="empty">{message}</div>;
}
