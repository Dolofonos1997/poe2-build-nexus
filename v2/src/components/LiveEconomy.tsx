import { useEffect, useState } from "react";
import { Panel } from "./UI";
type Feed = {
  league: string;
  category: string;
  unit: string;
  fetchedAt: string;
  checkedAt?: string;
  rows: {
    id: string;
    name: string;
    value: number;
    change: number | null;
    volume: number | null;
  }[];
};
type Snapshot = {
  version: number;
  leagues: { id: string; name: string }[];
  feeds: Feed[];
};
export function LiveEconomy() {
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [league, setLeague] = useState(""),
    [category, setCategory] = useState("Currency"),
    [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}economy.json`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error("Market snapshots are temporarily unavailable.");
        const v = await r.json();
        if (
          v.version !== 1 ||
          !Array.isArray(v.feeds) ||
          !Array.isArray(v.leagues)
        )
          throw new Error("Market snapshot format is invalid.");
        setData(v);
        setLeague(v.leagues[0]?.id || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const feed = data?.feeds.find(
    (f) => f.league === league && f.category === category,
  );
  const stale =
    feed &&
    Date.now() - Date.parse(feed.checkedAt || feed.fetchedAt) > 3 * 3600000;
  return (
    <Panel title="Live market snapshots">
      <p className="hint">
        Prices from{" "}
        <a
          href="https://poe.ninja/poe2/economy"
          target="_blank"
          rel="noreferrer"
        >
          poe.ninja
        </a>
        , collected hourly. Estimates from completed exchange activity, not
        executable quotes. Feed timestamps remain visible offline.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading market data…</p>}
      {data && (
        <>
          <div className="actions">
            <label className="field">
              Market league
              <select
                value={league}
                onChange={(e) => setLeague(e.target.value)}
              >
                {data.leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Market category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["Currency", "Fragments", "SoulCores", "Ritual"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Find market item
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Divine, core, omen…"
              />
            </label>
          </div>
          {feed ? (
            <>
              <p className={stale ? "negative" : "hint"}>
                {stale ? "Stale snapshot · " : ""}Fetched{" "}
                {new Date(feed.fetchedAt).toLocaleString()} · Prices in{" "}
                {feed.unit}
                {feed.checkedAt &&
                  ` · Checked ${new Date(feed.checkedAt).toLocaleString()}`}
              </p>
              <div className="table-scroll market-table">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Price ({feed.unit})</th>
                      <th>Trend</th>
                      <th>Volume ({feed.unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feed.rows
                      .filter((r) =>
                        r.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>
                            {r.value.toLocaleString(undefined, {
                              maximumSignificantDigits: 5,
                            })}
                          </td>
                          <td>
                            {r.change === null
                              ? "—"
                              : `${r.change.toFixed(1)}%`}
                          </td>
                          <td>
                            {r.volume === null
                              ? "—"
                              : r.volume.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>No snapshot available for this league and category.</p>
          )}
        </>
      )}
    </Panel>
  );
}
