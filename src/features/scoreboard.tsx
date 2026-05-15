import { useState } from "react";
import type { ScoreboardEntry, SquadNumber } from "../types";
import { MissionProgressCard, ProgressTrack, SquadLogo } from "../components/pact";
import { Empty } from "./pactShared";

type SquadSummary = {
  key: string;
  label: string;
  squadNumber?: SquadNumber;
  count: number;
  totalScore: number;
  maxScore: number;
  progressPercent: number;
};

export function Scoreboard({ entries }: { entries: ScoreboardEntry[] }) {
  const [selectedSquad, setSelectedSquad] = useState<string>("all");
  const ranked = [...entries].sort((left, right) => right.totalScore - left.totalScore || right.progressPercent - left.progressPercent);
  const visibleRanked = selectedSquad === "all"
    ? ranked
    : ranked.filter((entry) => (entry.squadNumber ? `squad-${entry.squadNumber}` : "solo") === selectedSquad);
  const leader = ranked[0];
  const totalScore = entries.reduce((sum, entry) => sum + entry.totalScore, 0);
  const maxScore = entries.reduce((sum, entry) => sum + entry.maxScore, 0);
  const averageProgress = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.progressPercent, 0) / entries.length) : 0;
  const squadSummaries = summarizeSquads(entries);

  if (!entries.length) {
    return (
      <article className="scoreboard-workspace">
        <section className="scoreboard-hero">
          <div>
            <span className="panel-label">Scoreboard</span>
            <h2>Mission Leaderboard</h2>
            <p>Scores will appear once learners submit PACT modules, challenges, games, or assessments.</p>
          </div>
        </section>
        <Empty text="No scores loaded." />
      </article>
    );
  }

  return (
    <article className="scoreboard-workspace">
      <section className="scoreboard-hero">
        <div>
          <span className="panel-label">Scoreboard</span>
          <h2>Mission Leaderboard</h2>
          <p>Track learner progress by squad, score, and completion momentum across the active PACT operation.</p>
        </div>
        <div className="scoreboard-hero-metrics" aria-label="Scoreboard summary">
          <MissionProgressCard label="Average Progress" value={averageProgress} detail={`${totalScore}/${maxScore || 0} total points captured`} />
          <div className="leader-plate">
            <span>Current leader</span>
            <strong>{leader.name ?? leader.userId}</strong>
            <small>{leader.totalScore}/{leader.maxScore} pts | {leader.progressPercent}% complete</small>
          </div>
        </div>
      </section>

      <section className="scoreboard-squad-grid" aria-label="Squad summaries">
        <button
          aria-pressed={selectedSquad === "all"}
          className={`scoreboard-squad-card all-squads ${selectedSquad === "all" ? "active" : ""}`}
          type="button"
          onClick={() => setSelectedSquad("all")}
        >
          <div className="scoreboard-squad-card-head">
            <span className="scoreboard-squad-cluster">All Squads</span>
            <strong>{averageProgress}%</strong>
          </div>
          <ProgressTrack value={averageProgress} />
          <small>{entries.length} learners | {totalScore}/{maxScore || 0} pts</small>
        </button>
        {squadSummaries.map((squad) => (
          <SquadCard active={selectedSquad === squad.key} key={squad.key} onSelect={setSelectedSquad} squad={squad} />
        ))}
      </section>

      <section className="leaderboard-panel">
        <div className="panel-title">
          <div>
            <span className="panel-label">Learner Queue</span>
            <h2>Ranked Progress</h2>
            <p>{visibleRanked.length} shown of {entries.length} active learner{entries.length === 1 ? "" : "s"}</p>
          </div>
          <span className="panel-count">{visibleRanked.length}</span>
        </div>
        <div className="leaderboard-list">
          {visibleRanked.map((entry, index) => (
            <LeaderboardRow entry={entry} key={entry.userId} rank={index + 1} />
          ))}
        </div>
      </section>
    </article>
  );
}

function SquadCard({ squad, active, onSelect }: { squad: SquadSummary; active: boolean; onSelect: (key: string) => void }) {
  return (
    <button aria-pressed={active} className={`scoreboard-squad-card ${squad.key} ${active ? "active" : ""}`} type="button" onClick={() => onSelect(squad.key)}>
      <div className="scoreboard-squad-card-head">
        <span className="scoreboard-squad-cluster">
          <SquadLogo squadNumber={squad.squadNumber} className="scoreboard-squad-logo" decorative />
          {squad.label}
        </span>
        <strong>{squad.progressPercent}%</strong>
      </div>
      <ProgressTrack value={squad.progressPercent} />
      <small>{squad.count} learner{squad.count === 1 ? "" : "s"} | {squad.totalScore}/{squad.maxScore || 0} pts</small>
    </button>
  );
}

function LeaderboardRow({ entry, rank }: { entry: ScoreboardEntry; rank: number }) {
  return (
    <div className={`leaderboard-row ${entry.squadNumber ? `squad-${entry.squadNumber}` : "solo"}`}>
      <span className="leaderboard-mark">
        <span className="rank-medal">{rank}</span>
        <SquadLogo squadNumber={entry.squadNumber} className="leaderboard-squad-logo" decorative />
      </span>
      <div className="leaderboard-identity">
        <strong>{entry.name ?? entry.userId}</strong>
        <small>{entry.squadNumber ? `Squad ${entry.squadNumber}` : "Solo operator"}</small>
      </div>
      <div className="leaderboard-score">
        <span>{entry.totalScore}/{entry.maxScore}</span>
        <ProgressTrack value={entry.progressPercent} />
      </div>
      <strong className="leaderboard-percent">{entry.progressPercent}%</strong>
    </div>
  );
}

function summarizeSquads(entries: ScoreboardEntry[]) {
  const summaries = entries.reduce<Map<string, SquadSummary>>((map, entry) => {
    const key = entry.squadNumber ? `squad-${entry.squadNumber}` : "solo";
    const current = map.get(key) ?? {
      key,
      label: entry.squadNumber ? `Squad ${entry.squadNumber}` : "Solo",
      squadNumber: entry.squadNumber,
      count: 0,
      totalScore: 0,
      maxScore: 0,
      progressPercent: 0
    };
    current.count += 1;
    current.totalScore += entry.totalScore;
    current.maxScore += entry.maxScore;
    current.progressPercent = current.maxScore ? Math.round((current.totalScore / current.maxScore) * 100) : 0;
    map.set(key, current);
    return map;
  }, new Map());

  return Array.from(summaries.values()).sort((left, right) => right.progressPercent - left.progressPercent || left.label.localeCompare(right.label));
}
