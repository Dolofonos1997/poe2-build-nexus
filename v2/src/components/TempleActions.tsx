import { useState } from "react";
import { Panel } from "./UI";
import { type Board, coordinate, rooms } from "../engine/temple";
import {
  specialAction,
  simulateExit,
  templates,
  templateBoard,
} from "../engine/advanced";

export function TempleActions({
  board,
  selected,
  disabled,
  commit,
  report,
}: {
  board: Board;
  selected: number | null;
  disabled: boolean;
  commit: (board: Board) => void;
  report: (message: string) => void;
}) {
  const [target, setTarget] = useState(""),
    [count, setCount] = useState(0),
    [seed, setSeed] = useState(1);
  const [preview, setPreview] = useState<{
    source: Board;
    result: ReturnType<typeof simulateExit>;
  } | null>(null);
  const targets = board.flatMap((c, i) =>
    c && ["sac", "spy"].includes(c.k) && i !== selected ? [i] : [],
  );
  function action(kind: "sacrifice" | "assassinate") {
    try {
      if (selected === null || target === "")
        throw new Error(
          "Select the room to consume on the board and choose its recipient.",
        );
      commit(specialAction(board, selected, +target, kind));
      report(
        `${kind === "sacrifice" ? "Sacrifice" : "Assassination"} applied. Undo restores both rooms.`,
      );
    } catch (e) {
      report((e as Error).message);
    }
  }
  return (
    <Panel title="Advanced Temple actions">
      <p className="hint">
        Selected room is consumed. Choose the room that receives the upgrade.
      </p>
      <label className="field">
        Upgrade recipient
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose recipient</option>
          {targets.map((i) => (
            <option key={i} value={i}>
              {coordinate(i)} · {rooms[board[i]!.k].n}
            </option>
          ))}
        </select>
      </label>
      <div className="actions">
        <button disabled={disabled} onClick={() => action("sacrifice")}>
          Sacrifice selected room
        </button>
        <button disabled={disabled} onClick={() => action("assassinate")}>
          Assassinate selected Spymaster
        </button>
      </div>
      <h3>Temple exit simulator</h3>
      <p className="hint">
        Accessible restricted rooms and used devices are removed. Additional
        random losses are a scenario, not a game probability. Boss kills can
        increase losses. Editor locks do not protect against destabilisation;
        medallions protect once.
      </p>
      <label className="field">
        Additional random losses
        <input
          type="number"
          min={0}
          max={80}
          value={count}
          onChange={(e) => setCount(+e.target.value)}
        />
      </label>
      <label className="field">
        Scenario seed
        <input
          type="number"
          step={1}
          value={seed}
          onChange={(e) => setSeed(+e.target.value)}
        />
      </label>
      <button
        disabled={disabled}
        onClick={() => {
          try {
            setPreview({
              source: board,
              result: simulateExit(board, count, seed),
            });
          } catch (e) {
            report((e as Error).message);
          }
        }}
      >
        Preview exit
      </button>
      {preview && (
        <div className="notice">
          <p>
            Remove:{" "}
            {preview.result.removed.map(coordinate).join(", ") || "none"}
          </p>
          <p>
            Medallions consumed:{" "}
            {preview.result.protected.map(coordinate).join(", ") || "none"}
          </p>
          <p>
            Newly disconnected:{" "}
            {preview.result.disconnected.map(coordinate).join(", ") || "none"}
          </p>
          <button
            disabled={disabled || preview.source !== board}
            onClick={() => {
              commit(preview.result.board);
              setPreview(null);
              report("Exit scenario applied. Undo restores the temple.");
            }}
          >
            Apply exit scenario
          </button>
          {preview.source !== board && (
            <p>Board changed. Preview again before applying.</p>
          )}
        </div>
      )}
      <h3>Starter layouts</h3>
      <p className="hint">
        Replace the board with an editable template. Undo restores your current
        layout.
      </p>
      {templates.map((t, i) => (
        <button
          key={t.name}
          disabled={disabled}
          onClick={() => {
            commit(templateBoard(i));
            report(`${t.name} loaded. Undo restores your layout.`);
          }}
        >
          {t.name}
        </button>
      ))}
      <p className="hint">
        <a
          href="https://poe2db.tw/Atziris_Temple"
          target="_blank"
          rel="noreferrer"
        >
          Room rules
        </a>{" "}
        ·{" "}
        <a
          href="https://poe2db.tw/us/Temple_Destabilisation"
          target="_blank"
          rel="noreferrer"
        >
          Destabilisation
        </a>
        . Normal upgrades cap at T3; manually recorded T4 is preserved.
      </p>
    </Panel>
  );
}
