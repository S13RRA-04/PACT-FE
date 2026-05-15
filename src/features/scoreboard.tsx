import type { ScoreboardEntry } from "../types";
import { Empty } from "./pactShared";

export function Scoreboard({ entries }: { entries: ScoreboardEntry[] }) {
  return (
    <article>
      <h2>Scoreboard</h2>
      <div className="list">
        {entries.length ? entries.map((entry) => (
          <div className="row" key={entry.userId}>
            <span className={entry.squadNumber ? `score-squad squad-${entry.squadNumber}` : ""}>{entry.squadNumber ? `Squad ${entry.squadNumber}` : "solo"}</span>
            <strong>{entry.name ?? entry.userId}</strong>
            <small>{entry.totalScore}/{entry.maxScore} - {entry.progressPercent}%</small>
          </div>
        )) : <Empty text="No scores loaded." />}
      </div>
    </article>
  );
}
