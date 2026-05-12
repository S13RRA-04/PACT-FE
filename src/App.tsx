import { useMemo, useState } from "react";

type ScoreboardEntry = {
  userId: string;
  name?: string;
  role: string;
  squadId?: string;
  totalScore: number;
  maxScore: number;
  progressPercent: number;
};

type PactContent = {
  id: string;
  type: "module" | "challenge" | "game";
  title: string;
  prompt: string;
  maxScore: number;
};

const apiBaseUrl = (import.meta.env.VITE_PACT_API_BASE_URL ?? "http://localhost:4100").replace(/\/$/, "");

export function App() {
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem("pact_session") ?? "");
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [content, setContent] = useState<PactContent[]>([]);
  const [status, setStatus] = useState("Connect with an LMS launch session token.");
  const isConnected = sessionToken.trim().length > 0;

  const client = useMemo(() => new PactClient(apiBaseUrl, sessionToken), [sessionToken]);

  async function saveSession() {
    window.localStorage.setItem("pact_session", sessionToken.trim());
    setStatus("Session saved.");
  }

  async function loadDashboard() {
    try {
      setStatus("Loading PACT dashboard.");
      const [contentResponse, scoreboardResponse] = await Promise.all([client.getContent(), client.getScoreboard()]);
      setContent(contentResponse);
      setScoreboard(scoreboardResponse.entries);
      setStatus("Dashboard synced.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sync dashboard.");
    }
  }

  return (
    <main className="shell">
      <aside className="side">
        <div className="brand">
          <span>PACT</span>
          <strong>Challenge Hub</strong>
        </div>
        <nav>
          <button className="active" type="button">Dashboard</button>
          <button type="button">Modules</button>
          <button type="button">Challenges</button>
          <button type="button">Scoreboard</button>
        </nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>PACT Dashboard</h1>
            <p>Role-aware content, squad scoring, and LMS grade sync in one operator view.</p>
          </div>
          <button type="button" onClick={() => void loadDashboard()} disabled={!isConnected}>
            Sync
          </button>
        </header>

        <section className="session-panel">
          <label htmlFor="session">PACT session token</label>
          <div>
            <input
              id="session"
              value={sessionToken}
              onChange={(event) => setSessionToken(event.target.value)}
              placeholder="Paste the token returned from /api/v1/lti/launch"
            />
            <button type="button" onClick={() => void saveSession()}>Save</button>
          </div>
          <p>{status}</p>
        </section>

        <section className="grid">
          <article>
            <h2>Assigned Content</h2>
            <div className="list">
              {content.length ? content.map((item) => (
                <div className="row" key={item.id}>
                  <span>{item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.maxScore} pts</small>
                </div>
              )) : <Empty text="No content loaded." />}
            </div>
          </article>
          <article>
            <h2>Scoreboard</h2>
            <div className="list">
              {scoreboard.length ? scoreboard.map((entry) => (
                <div className="row" key={entry.userId}>
                  <span>{entry.squadId ?? "solo"}</span>
                  <strong>{entry.name ?? entry.userId}</strong>
                  <small>{entry.totalScore}/{entry.maxScore} · {entry.progressPercent}%</small>
                </div>
              )) : <Empty text="No scores loaded." />}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

class PactClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  async getContent() {
    return this.request<PactContent[]>("/api/v1/content");
  }

  async getScoreboard() {
    return this.request<{ entries: ScoreboardEntry[] }>("/api/v1/dashboard/scoreboard");
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message ?? "PACT API request failed");
    }
    return response.json() as Promise<T>;
  }
}
