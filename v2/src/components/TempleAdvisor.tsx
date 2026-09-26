import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { cloud } from "../lib/cloud";
import { Panel } from "./UI";
import {
  type Board,
  type RoomKey,
  type Goal,
  coordinate,
  rooms,
} from "../engine/temple";
type Advice = {
  id: string;
  model: string;
  createdAt: string;
  explanation: string;
  caution: string;
  move: { i: number; k: RoomKey };
};
export function TempleAdvisor({
  board,
  hand,
  goal,
  architectDefeated,
  preventLoops,
}: {
  board: Board;
  hand: (RoomKey | null)[];
  goal: Goal;
  architectDefeated: boolean;
  preventLoops: boolean;
}) {
  const account = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const [signedIn, setSignedIn] = useState(false),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [advice, setAdvice] = useState<Advice | null>(null),
    [history, setHistory] = useState<Advice[]>([]),
    [source, setSource] = useState<Board | null>(null);
  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    const update = (userId: string | null) => {
      if (!alive) return;
      if (account.current === userId) return;
      account.current = userId;
      const version = ++requestVersion.current;
      const yes = !!userId;
      setSignedIn(yes);
      setAdvice(null);
      setHistory([]);
      if (yes)
        void cloud!
          .from("atlas_ai_generations")
          .select("result")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(20)
          .then(({ data, error }) => {
            if (!alive || version !== requestVersion.current) return;
            if (error) {
              setError("Advice history unavailable.");
              return;
            }
            const results = (data || []).map((r) => r.result as Advice);
            setHistory(results);
            const id = new URL(location.href).searchParams.get("advice");
            setAdvice(results.find((r) => r.id === id) || null);
            if (id && !results.some((r) => r.id === id))
              void cloud!
                .from("atlas_ai_generations")
                .select("result")
                .eq("id", id)
                .eq("status", "completed")
                .maybeSingle()
                .then(({ data }) => {
                  if (alive && data && version === requestVersion.current)
                    setAdvice(data.result as Advice);
                });
          });
    };
    void cloud.auth
      .getSession()
      .then(({ data }) => update(data.session?.user.id || null));
    const { data } = cloud.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => update(session?.user.id || null), 0);
    });
    return () => {
      alive = false;
      account.current = null;
      requestVersion.current++;
      data.subscription.unsubscribe();
    };
  }, []);
  async function ask() {
    if (!cloud) return;
    setBusy(true);
    setError("");
    setAdvice(null);
    const snapshot = board;
    const version = requestVersion.current;
    try {
      const {
        data: { session },
      } = await cloud.auth.getSession();
      if (!session) throw new Error("Sign in first.");
      const r = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/temple-advisor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            board,
            hand,
            goal,
            architectDefeated,
            preventLoops,
            question,
          }),
          signal: AbortSignal.timeout(55000),
        },
      );
      const data = await r.json();
      if (version !== requestVersion.current) return;
      if (!r.ok) throw new Error(data.error || "AI request failed.");
      setAdvice(data);
      setSource(snapshot);
      setHistory((h) => [data, ...h].slice(0, 20));
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Hosted AI advisor">
      {!cloud ? (
        <p className="hint">
          AI deployment is prepared. The site owner must connect Supabase and
          configure the server-side model key before enabling requests. Local
          recommendations below remain available.
        </p>
      ) : !signedIn ? (
        <p>
          <Link to="/community">Sign in</Link> to request AI advice.
        </p>
      ) : (
        <>
          <label className="field">
            What should the advisor consider?
            <textarea
              maxLength={500}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Keep my crafting chain connected…"
            />
          </label>
          <p className="hint">
            Sends this temple, hand, goal and question to the configured AI
            provider. Advice is saved privately to your account. Up to 10
            requests per day.
          </p>
          <button disabled={busy} onClick={ask}>
            {busy ? "Considering legal moves…" : "Ask AI advisor"}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {advice && (
        <div className="notice">
          <h3>
            {rooms[advice.move.k]?.n} at {coordinate(advice.move.i)}
          </h3>
          <p>{advice.explanation}</p>
          <p className="hint">{advice.caution}</p>
          <small>
            {advice.model} · {new Date(advice.createdAt).toLocaleString()}
          </small>
          {source !== board && (
            <p className="hint">
              Historical advice: the board may have changed. Check legality
              before placing.
            </p>
          )}
          <div className="actions">
            <button
              onClick={async () => {
                try {
                  const url = new URL(location.href);
                  url.searchParams.set("advice", advice.id);
                  await navigator.clipboard.writeText(url.href);
                  setError(
                    "Private advice link copied; only your account can open it.",
                  );
                } catch {
                  setError("Clipboard unavailable.");
                }
              }}
            >
              Copy private link
            </button>
            <button
              onClick={async () => {
                if (!cloud) return;
                const { error } = await cloud
                  .from("atlas_ai_generations")
                  .delete()
                  .eq("id", advice.id);
                if (error) {
                  setError("Could not delete advice.");
                  return;
                }
                setHistory((h) => h.filter((x) => x.id !== advice.id));
                setAdvice(null);
              }}
            >
              Delete advice
            </button>
          </div>
        </div>
      )}
      {!!history.length && (
        <label className="field">
          Previous advice
          <select
            value={advice?.id || ""}
            onChange={(e) => {
              setAdvice(history.find((h) => h.id === e.target.value) || null);
              setSource(null);
            }}
          >
            <option value="">Choose saved advice</option>
            {history.map((h) => (
              <option key={h.id} value={h.id}>
                {new Date(h.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      )}
    </Panel>
  );
}
