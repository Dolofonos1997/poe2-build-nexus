import { useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Save,
  Share2,
  Trash2,
  Lock,
  Unlock,
  Compass,
} from "lucide-react";
import { useTemple } from "../store/temple";
import {
  rooms,
  roomKeys,
  coordinate,
  placementError,
  edges,
  reachable,
  upgradeInfo,
  emptyBoard,
  parseBoard,
  recommendations,
  goals,
  score,
  type RoomKey,
  type Board,
  type Goal,
} from "../engine/temple";
import { download, readFile, useLocal } from "../lib/storage";
import { PageTitle, Panel, Metric, RoomIcon } from "../components/UI";
type Layout = { id: string; name: string; board: Board; date: string };
export default function Temple() {
  const s = useTemple();
  const [pick, setPick] = useState<RoomKey>("path"),
    [selected, setSelected] = useState<number | null>(null),
    [query, setQuery] = useState(""),
    [zoom, setZoom] = useState(1),
    [message, setMessage] = useState(""),
    [live, setLive] = useState(false),
    [slot, setSlot] = useState(0),
    [replay, setReplay] = useState<number | null>(null),
    [name, setName] = useState("My temple");
  const [layouts, setLayouts] = useLocal<Layout[]>("atlas-layouts", []);
  const input = useRef<HTMLInputElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const board = replay === null ? s.board : s.past[replay]?.board || s.board;
  const active = live ? s.hand[slot] : pick;
  const connected = useMemo(() => reachable(board), [board]);
  const graph = useMemo(() => edges(board), [board]);
  const moves = useMemo(
    () =>
      recommendations(
        s.board,
        s.hand,
        s.goal,
        s.architectDefeated,
        s.preventLoops,
      ),
    [s.board, s.hand, s.goal, s.architectDefeated, s.preventLoops],
  );
  function place(i: number, k = active, consumeHand = live) {
    if (replay !== null) return;
    if (s.board[i]) {
      setSelected(i);
      return;
    }
    if (!k) {
      setMessage("Choose a room for the selected hand slot.");
      return;
    }
    const error = placementError(
      s.board,
      i,
      k,
      s.architectDefeated,
      s.preventLoops,
    );
    if (error) {
      setMessage(error);
      return;
    }
    const next = [...s.board];
    next[i] = { k, t: 1 };
    const hand = [...s.hand];
    if (consumeHand) hand[slot] = null;
    s.commit({ board: next, hand });
    setSelected(i);
    setMessage(`${rooms[k].n} placed at ${coordinate(i)}.`);
  }
  function changeCell(change: Record<string, unknown> | null) {
    if (
      selected === null ||
      selected === 76 ||
      !s.board[selected] ||
      replay !== null
    )
      return;
    if (s.board[selected]?.locked && change?.locked !== false) {
      setMessage("Unlock this room first.");
      return;
    }
    const next = [...s.board];
    next[selected] = change ? { ...next[selected]!, ...change } : null;
    s.commit({ board: next });
  }
  async function share() {
    try {
      const url = new URL(location.href);
      url.searchParams.set("temple", btoa(JSON.stringify(s.board)));
      url.hash = "/temple";
      await navigator.clipboard.writeText(url.href);
      setMessage("Layout link copied. Anyone with the link can import a copy.");
    } catch {
      setMessage("Clipboard unavailable. Export the layout as JSON instead.");
    }
  }
  const cell = selected === null ? null : board[selected];
  const tier = selected === null ? null : upgradeInfo(board, selected);
  return (
    <>
      <PageTitle
        eyebrow="THE VAAL ARCHIVES / PLANNING"
        title="Temple planner"
        description="Every room matters. Build a route worth returning to."
      >
        <button onClick={() => input.current?.click()}>
          <Upload size={16} />
          Import
        </button>
        <button
          onClick={() =>
            download("atlas-temple.json", { version: 2, board: s.board })
          }
        >
          <Download size={16} />
          Export
        </button>
        <button className="primary" onClick={share}>
          <Share2 size={16} />
          Share layout
        </button>
      </PageTitle>
      <input
        ref={input}
        hidden
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (!f) return;
            const data = (await readFile(f)) as {
              board?: unknown;
              B?: unknown;
            };
            s.load(parseBoard(data.board || data.B || data));
            setMessage("Temple imported.");
          } catch (e) {
            setMessage((e as Error).message);
          }
          e.target.value = "";
        }}
      />
      <div className="metrics">
        <Metric
          label="ROOMS PLACED"
          value={`${board.filter(Boolean).length} / 81`}
          detail="Including the fixed entrance"
        />
        <Metric
          label="CONNECTED"
          value={connected.size}
          detail="Reachable from E9"
        />
        <Metric
          label="LAYOUT SCORE"
          value={score(board, s.goal)}
          detail="Heuristic, not loot value"
        />
        <Metric
          label="STRATEGY"
          value={s.goal}
          detail="Tune recommendations below"
        />
      </div>
      <div className="temple-layout">
        <Panel className="palette">
          <div className="panel-top">
            <h2>Room library</h2>
            <span className="badge">{roomKeys.length}</span>
          </div>
          <input
            aria-label="Search rooms"
            placeholder="Search rooms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="room-list">
            {roomKeys
              .filter((k) =>
                rooms[k].n.toLowerCase().includes(query.toLowerCase()),
              )
              .map((k) => (
                <button
                  key={k}
                  draggable
                  aria-label={`Select ${rooms[k].n}`}
                  onDragStart={(e) => e.dataTransfer.setData("text/room", k)}
                  className={`room-option ${pick === k ? "chosen" : ""}`}
                  onClick={() => {
                    setPick(k);
                    setLive(false);
                  }}
                >
                  <RoomIcon kind={k} />
                  <span>
                    {rooms[k].n}
                    <small>{rooms[k].reward || "Temple room"}</small>
                  </span>
                </button>
              ))}
          </div>
          <p className="hint">
            Select a room, then an open cell. Drag and drop also works.
          </p>
        </Panel>
        <div className="board-column">
          <Panel className="board-panel">
            <div className="panel-top">
              <div>
                <div className="eyebrow">YOUR TEMPLE</div>
                <h2>
                  {replay === null
                    ? "The path to Atziri"
                    : `Replay · step ${replay + 1}`}
                </h2>
              </div>
              <span className="status-dot">
                {replay === null ? "Saved on this device" : "Read-only replay"}
              </span>
            </div>
            <div className="board-toolbar">
              <div className="actions">
                <button
                  title="Undo"
                  aria-label="Undo"
                  disabled={!s.past.length || replay !== null}
                  onClick={s.undo}
                >
                  <Undo2 size={16} />
                </button>
                <button
                  title="Redo"
                  aria-label="Redo"
                  disabled={!s.future.length || replay !== null}
                  onClick={s.redo}
                >
                  <Redo2 size={16} />
                </button>
                <span className="divider" />
                <button
                  aria-label="Zoom out"
                  onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
                >
                  <ZoomOut size={16} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  aria-label="Zoom in"
                  onClick={() => setZoom(Math.min(1.8, zoom + 0.1))}
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <button
                onClick={() => {
                  setZoom(
                    Math.min(1, (viewport.current?.clientWidth || 620) / 620),
                  );
                  viewport.current?.scrollTo({ top: 0, left: 0 });
                }}
              >
                Fit view
              </button>
            </div>
            <div className="board-viewport" ref={viewport}>
              <div
                className="board"
                style={{
                  width: Math.round(620 * zoom),
                  height: Math.round(620 * zoom),
                }}
              >
                <svg
                  className="connections"
                  viewBox="0 0 900 900"
                  aria-hidden="true"
                >
                  {graph.map(([a, b]) => (
                    <line
                      key={`${a}-${b}`}
                      x1={(a % 9) * 100 + 50}
                      y1={Math.floor(a / 9) * 100 + 50}
                      x2={(b % 9) * 100 + 50}
                      y2={Math.floor(b / 9) * 100 + 50}
                      className={connected.has(a) ? "connected" : ""}
                    />
                  ))}
                </svg>
                {board.map((c, i) => (
                  <button
                    key={i}
                    aria-label={`${coordinate(i)} ${c ? rooms[c.k].n : "empty"}`}
                    aria-pressed={selected === i}
                    className={`tile ${c ? "occupied" : ""} ${selected === i ? "selected" : ""} ${!c && active && !placementError(board, i, active, s.architectDefeated, s.preventLoops) ? "legal" : ""} ${c && !connected.has(i) ? "unreachable" : ""}`}
                    onClick={() => place(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const k = e.dataTransfer.getData("text/room") as RoomKey;
                      if (roomKeys.includes(k)) place(i, k, false);
                    }}
                  >
                    <span className="tile-coordinate">{coordinate(i)}</span>
                    {c ? (
                      <>
                        <RoomIcon kind={c.k} />
                        <span className="tile-name">
                          {i === 76 ? "Entrance" : rooms[c.k].n}
                        </span>
                        <span className="tile-tier">
                          {i === 76
                            ? "START"
                            : `T${upgradeInfo(board, i).tier}`}
                          {c.locked && i !== 76 ? " · locked" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="tile-plus">+</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="board-footer">
              <span>
                <i className="legend-dot" /> Compatible connection
              </span>
              <span>Scroll to pan · browser pinch to zoom</span>
            </div>
          </Panel>
          <Panel>
            <div className="panel-top">
              <h2>Live hand</h2>
              <label className="check">
                <input
                  type="checkbox"
                  checked={live}
                  onChange={(e) => setLive(e.target.checked)}
                />
                Use hand for placement
              </label>
            </div>
            <div className="hand">
              {s.hand.map((k, i) => (
                <div
                  className={`hand-card ${live && slot === i ? "chosen" : ""}`}
                  key={i}
                >
                  <button
                    className="hand-select"
                    aria-label={`Select hand slot ${i + 1}`}
                    onClick={() => {
                      setSlot(i);
                      setLive(true);
                    }}
                  >
                    <small>0{i + 1}</small>
                    {k ? (
                      <RoomIcon kind={k} />
                    ) : (
                      <span className="path-icon">+</span>
                    )}
                  </button>
                  <select
                    aria-label={`Hand slot ${i + 1}`}
                    value={k || ""}
                    onChange={(e) => {
                      const h = [...s.hand];
                      h[i] = (e.target.value || null) as RoomKey | null;
                      s.commit({ hand: h });
                    }}
                  >
                    <option value="">Empty slot</option>
                    {roomKeys.map((k) => (
                      <option key={k} value={k}>
                        {rooms[k].n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Saved layouts & replay">
            <div className="actions">
              <input
                aria-label="Layout name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
              <button
                onClick={() => {
                  setLayouts([
                    ...layouts,
                    {
                      id: crypto.randomUUID(),
                      name: name.trim() || "Untitled temple",
                      board: s.board,
                      date: new Date().toISOString(),
                    },
                  ]);
                  setMessage("Layout saved.");
                }}
              >
                <Save size={16} />
                Save layout
              </button>
              <button
                disabled={!s.past.length}
                onClick={() => setReplay(replay === null ? 0 : null)}
              >
                {replay === null ? "Open replay" : "Exit replay"}
              </button>
            </div>
            {replay !== null && (
              <label className="field">
                Replay step
                <input
                  type="range"
                  min={0}
                  max={s.past.length}
                  value={replay}
                  onChange={(e) => setReplay(+e.target.value)}
                />
              </label>
            )}
            {layouts.map((l) => (
              <div className="saved-row" key={l.id}>
                <span>
                  {l.name}
                  <small>{new Date(l.date).toLocaleDateString()}</small>
                </span>
                <button
                  onClick={() => {
                    s.load(l.board);
                    setReplay(null);
                    setMessage(
                      `Loaded ${l.name}. Undo restores your previous board.`,
                    );
                  }}
                >
                  Load
                </button>
                <button
                  aria-label={`Delete ${l.name}`}
                  onClick={() =>
                    setLayouts(layouts.filter((x) => x.id !== l.id))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </Panel>
        </div>
        <aside className="inspector">
          <Panel title="Room inspector">
            {cell && selected !== null ? (
              <>
                <div className="inspector-room">
                  <RoomIcon kind={cell.k} />
                  <div>
                    <h3>{rooms[cell.k].n}</h3>
                    <small>
                      {coordinate(selected)} ·{" "}
                      {connected.has(selected)
                        ? "Entrance connected"
                        : "Disconnected"}
                    </small>
                  </div>
                </div>
                <p>{rooms[cell.k].t[(tier?.tier || 1) - 1]}</p>
                <label className="field">
                  Base tier
                  <select
                    value={cell.t}
                    disabled={selected === 76 || cell.locked || replay !== null}
                    onChange={(e) => changeCell({ t: +e.target.value })}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        Tier {n}
                      </option>
                    ))}
                  </select>
                </label>
                {tier?.reasons.map((r) => (
                  <p className="hint" key={r}>
                    {r}
                  </p>
                ))}
                <p className="hint">
                  {rooms[cell.k].reward ||
                    "No reward device in the inherited room data."}
                </p>
                <div className="actions">
                  <button
                    disabled={selected === 76 || replay !== null}
                    onClick={() => changeCell({ locked: !cell.locked })}
                  >
                    {cell.locked ? <Unlock size={15} /> : <Lock size={15} />}{" "}
                    {cell.locked ? "Unlock" : "Lock"}
                  </button>
                  <button
                    disabled={selected === 76 || cell.locked || replay !== null}
                    onClick={() => changeCell(null)}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <p className="hint">
                Select a placed room to inspect its connections, tier, and
                rewards.
              </p>
            )}
          </Panel>
          <Panel title="Strategy assistant">
            <label className="field">
              Planning goal
              <select
                value={s.goal}
                onChange={(e) => s.setGoal(e.target.value as Goal)}
              >
                {goals.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <p className="hint">
              Ranks legal moves from your hand using goal weights, connectivity,
              and upgrades. Scores are not probabilities or expected profit.
            </p>
            {moves.length ? (
              moves.slice(0, 3).map((m, i) => (
                <button
                  className="suggestion"
                  key={`${m.i}-${m.k}`}
                  onClick={() => {
                    setPick(m.k);
                    setLive(false);
                    setSelected(m.i);
                    setMessage(
                      `${rooms[m.k].n} at ${coordinate(m.i)}: ${m.reason}. Click the cell to place.`,
                    );
                  }}
                >
                  <span className="rank">{i + 1}</span>
                  <div>
                    <strong>{rooms[m.k].n}</strong>
                    <small>
                      {coordinate(m.i)} · +{m.gain} score
                    </small>
                    <p>{m.reason}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="hint">
                No legal moves from this hand. Change a card or inspect your
                layout.
              </p>
            )}
          </Panel>
          <Panel title="Planning rules">
            <label className="check">
              <input
                type="checkbox"
                checked={s.preventLoops}
                onChange={(e) => s.setLoops(e.target.checked)}
              />
              Prevent connection loops
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={s.architectDefeated}
                onChange={(e) =>
                  s.commit({ architectDefeated: e.target.checked })
                }
              />
              Architect defeated
            </label>
            <p className="hint">
              V24.6 rules, migrated for planning. The full legacy planner
              remains available for advanced mechanics.
            </p>
            <button
              onClick={() => {
                s.load(emptyBoard());
                setSelected(null);
                setReplay(null);
                setMessage("Board cleared. Use Undo to restore it.");
              }}
            >
              <Compass size={15} />
              New temple
            </button>
          </Panel>
        </aside>
      </div>
      <div className="toast" role="status">
        {message || "Your temple is saved automatically on this device."}
      </div>
    </>
  );
}
