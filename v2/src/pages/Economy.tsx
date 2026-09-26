import { useState } from "react";
import { LiveEconomy } from "../components/LiveEconomy";
import { Download, Plus, Trash2 } from "lucide-react";
import { PageTitle, Panel, Metric, Empty } from "../components/UI";
import { useLocal, download } from "../lib/storage";
export type Run = {
  id: string;
  date: string;
  name: string;
  revenue: number;
  cost: number;
  minutes: number;
  notes: string;
};
type Price = { id: string; name: string; value: number; date: string };
export default function Economy() {
  const [runs, setRuns] = useLocal<Run[]>("atlas-runs", []),
    [prices, setPrices] = useLocal<Price[]>("atlas-prices", []);
  const [name, setName] = useState("Temple run"),
    [revenue, setRevenue] = useState(""),
    [cost, setCost] = useState(""),
    [minutes, setMinutes] = useState("20"),
    [notes, setNotes] = useState(""),
    [item, setItem] = useState(""),
    [value, setValue] = useState("");
  const net = runs.reduce((s, r) => s + r.revenue - r.cost, 0),
    time = runs.reduce((s, r) => s + r.minutes, 0);
  return (
    <>
      <PageTitle
        eyebrow="THE LEDGER"
        title="Economy & run history"
        description="Measure what your temple actually returns."
      >
        <button onClick={() => download("atlas-ledger.json", { runs, prices })}>
          <Download size={16} />
          Export ledger
        </button>
      </PageTitle>
      <LiveEconomy />
      <div className="metrics">
        <Metric label="COMPLETED RUNS" value={runs.length} />
        <Metric
          label="NET PROFIT"
          value={`${net.toLocaleString()} ex`}
          detail="Recorded revenue minus cost"
        />
        <Metric
          label="AVERAGE / RUN"
          value={runs.length ? `${(net / runs.length).toFixed(1)} ex` : "—"}
        />
        <Metric
          label="RETURN / HOUR"
          value={time ? `${((net / time) * 60).toFixed(1)} ex` : "—"}
          detail="Based on recorded duration"
        />
      </div>
      <div className="two-col">
        <Panel title="Record a run">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRuns([
                {
                  id: crypto.randomUUID(),
                  date: new Date().toISOString(),
                  name,
                  revenue: +revenue,
                  cost: +cost,
                  minutes: +minutes,
                  notes,
                },
                ...runs,
              ]);
              setRevenue("");
              setCost("");
              setNotes("");
            }}
          >
            <label className="field">
              Run name
              <input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="two-col">
              <label className="field">
                Revenue (ex)
                <input
                  required
                  type="number"
                  min={0}
                  step="any"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </label>
              <label className="field">
                Cost (ex)
                <input
                  required
                  type="number"
                  min={0}
                  step="any"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              Duration (minutes)
              <input
                required
                type="number"
                min={1}
                max={10000}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
            <label className="field">
              Notes
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button className="primary">
              <Plus size={16} />
              Record run
            </button>
          </form>
        </Panel>
        <Panel title="Price notebook">
          <p className="hint">
            Manual prices in exalted orbs. These are your observations, not a
            live market feed.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPrices([
                {
                  id: crypto.randomUUID(),
                  name: item,
                  value: +value,
                  date: new Date().toISOString(),
                },
                ...prices,
              ]);
              setItem("");
              setValue("");
            }}
          >
            <label className="field">
              Item or currency
              <input
                required
                maxLength={120}
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Divine Orb"
              />
            </label>
            <label className="field">
              Price (ex)
              <input
                required
                type="number"
                min={0}
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <button>
              <Plus size={16} />
              Save observation
            </button>
          </form>
          <div className="price-list">
            {prices.map((p) => (
              <div className="saved-row" key={p.id}>
                <span>
                  {p.name}
                  <small>{new Date(p.date).toLocaleString()}</small>
                </span>
                <strong>{p.value} ex</strong>
                <button
                  aria-label={`Delete price for ${p.name}`}
                  onClick={() => setPrices(prices.filter((x) => x.id !== p.id))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Run history">
        {runs.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Date</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Net</th>
                  <th>Time</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      <small>{r.notes}</small>
                    </td>
                    <td>{new Date(r.date).toLocaleDateString()}</td>
                    <td>{r.revenue} ex</td>
                    <td>{r.cost} ex</td>
                    <td
                      className={r.revenue >= r.cost ? "positive" : "negative"}
                    >
                      {r.revenue - r.cost} ex
                    </td>
                    <td>{r.minutes} min</td>
                    <td>
                      <button
                        aria-label={`Delete run ${r.name}`}
                        onClick={() =>
                          setRuns(runs.filter((x) => x.id !== r.id))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Your ledger starts here">
            Record a run to see your actual returns and average profit.
          </Empty>
        )}
      </Panel>
    </>
  );
}
