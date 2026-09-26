import { useEffect, useMemo, useRef, useState } from "react";
import { type Build, type PassiveNode } from "../lib/builds";
import {
  ASSET_ROOT,
  OFFICIAL_TREE_URL,
  loadOfficialData,
  cachedAsset,
  convertOfficialTree,
  classStart,
  allocationPath,
  removeAllocation,
  type OfficialData,
} from "../lib/official-tree";
import { Panel } from "./UI";
type Atlas = {
  image: HTMLImageElement;
  frames: Record<
    string,
    { frame: { x: number; y: number; w: number; h: number } }
  >;
};
const artCache = new Map<string, Promise<Atlas>>();
function loadAtlas(name: string) {
  if (!artCache.has(name))
    artCache.set(
      name,
      (async () => {
        const [meta, response] = await Promise.all([
          cachedAsset(ASSET_ROOT + name + ".json").then((r) => r.json()),
          cachedAsset(ASSET_ROOT + name + ".webp"),
        ]);
        const image = new Image();
        const url = URL.createObjectURL(await response.blob());
        try {
          image.src = url;
          await image.decode();
          return { image, frames: meta.frames };
        } finally {
          URL.revokeObjectURL(url);
        }
      })().catch((e) => {
        artCache.delete(name);
        throw e;
      }),
    );
  return artCache.get(name)!;
}
export function PassiveTree({
  build,
  patch,
  onMessage,
}: {
  build: Build;
  patch: (v: Partial<Build>) => void;
  onMessage: (s: string) => void;
}) {
  const [data, setData] = useState<OfficialData | null>(null),
    [art, setArt] = useState<Record<string, Atlas>>({}),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [camera, setCamera] = useState({ x: 0, y: 0, z: 1.7 }),
    [size, setSize] = useState({ w: 900, h: 640 });
  const [past, setPast] = useState<string[][]>([]);
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      cx: number;
      cy: number;
      moved: boolean;
    } | null>(null);
  const custom = !build.treeSource && build.nodes.length > 0;
  useEffect(() => {
    let alive = true;
    setError("");
    loadOfficialData()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    Promise.all(
      ["skills", "skills-disabled", "frame"].map(
        async (name) => [name, await loadAtlas(name)] as const,
      ),
    )
      .then((entries) => {
        if (alive) setArt((a) => ({ ...a, ...Object.fromEntries(entries) }));
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  useEffect(() => {
    let alive = true;
    loadAtlas("background-" + build.cls.toLowerCase())
      .then((a) => {
        if (alive) setArt((old) => ({ ...old, background: a }));
      })
      .catch(() => {
        /* unpublished classes have no art */
      });
    return () => {
      alive = false;
    };
  }, [build.cls]);
  const nodes = useMemo(
    () =>
      custom
        ? build.nodes
        : data
          ? convertOfficialTree(data, build.cls, build.asc)
          : [],
    [custom, build.nodes, data, build.cls, build.asc],
  );
  const map = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeGeometry = useMemo(() => {
    const cls = data?.classes.find((c) => c.name === build.cls);
    const asc = cls?.ascendancies.find(
      (a) => a.name === build.asc || a.id === build.asc,
    );
    const overrides = { ...cls?.overridePairs, ...asc?.overridePairs };
    return new Map(
      (data?.edges || []).map((e) => [
        [
          String(overrides[String(e.from)] || e.from),
          String(overrides[String(e.to)] || e.to),
        ]
          .sort()
          .join(":"),
        e,
      ]),
    );
  }, [data, build.cls, build.asc]);
  const start = data ? classStart(nodes, data, build.cls) : undefined;
  const ascStart = nodes.find((n) => n.ascendancyStart);
  const active = useMemo(
    () =>
      new Set([
        ...build.allocated,
        ...(start ? [start.id] : []),
        ...(ascStart ? [ascStart.id] : []),
      ]),
    [build.allocated, start, ascStart],
  );
  const focused = selected ? map.get(selected) : undefined;
  const path =
    focused && start
      ? allocationPath(nodes, build.allocated, start.id, focused.id)
      : null;
  const preview = new Set(path || []);
  const matches = useMemo(
    () =>
      query
        ? nodes
            .filter((n) =>
              `${n.name} ${n.description}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .slice(0, 60)
        : start?.links
            .map((id) => map.get(id))
            .filter((n): n is PassiveNode => !!n && !n.ascendancy)
            .slice(0, 12) || [],
    [nodes, query, start, map],
  );
  const ordinary = build.allocated.filter(
      (id) => map.has(id) && !map.get(id)?.ascendancy,
    ).length,
    ascPoints = build.allocated.filter(
      (id) => !!map.get(id)?.ascendancy,
    ).length;
  useEffect(() => {
    if (start) setCamera((c) => ({ ...c, x: start.x, y: start.y }));
    setSelected(null);
    setPast([]);
  }, [start?.id, build.cls, build.asc]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        w: entry.contentRect.width,
        h: Math.min(720, Math.max(480, entry.contentRect.width * 0.68)),
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = size.w * dpr;
    el.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#100f0d";
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.translate(size.w / 2, size.h / 2);
    ctx.scale(camera.z, camera.z);
    ctx.translate(-camera.x, -camera.y);
    if (art.background && !custom) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(art.background.image, -300, -300, 600, 600);
      ctx.globalAlpha = 1;
    }
    const visible = (n: PassiveNode) =>
      Math.abs(n.x - camera.x) < size.w / camera.z / 2 + 40 &&
      Math.abs(n.y - camera.y) < size.h / camera.z / 2 + 40;
    const links = new Set<string>();
    for (const n of nodes)
      for (const id of n.links) {
        const other = map.get(id);
        if (
          !other ||
          n.ascendancy !== other.ascendancy ||
          (!visible(n) && !visible(other))
        )
          continue;
        const key = [n.id, id].sort().join(":");
        if (links.has(key)) continue;
        links.add(key);
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        const geometry = edgeGeometry.get(key);
        if (
          !custom &&
          geometry?.orbit &&
          Number.isFinite(geometry.orbitX) &&
          Number.isFinite(geometry.orbitY)
        ) {
          const cx = geometry.orbitX! / 10,
            cy = geometry.orbitY! / 10;
          const a = Math.atan2(n.y - cy, n.x - cx),
            b = Math.atan2(other.y - cy, other.x - cx);
          const delta = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          ctx.arc(
            cx,
            cy,
            Math.hypot(n.x - cx, n.y - cy),
            a,
            a + delta,
            delta < 0,
          );
        } else ctx.lineTo(other.x, other.y);
        ctx.strokeStyle =
          active.has(n.id) && active.has(id)
            ? "#e0ba69"
            : preview.has(n.id) && (preview.has(id) || active.has(id))
              ? "#a8d9d0"
              : "#4e493c";
        ctx.lineWidth = active.has(n.id) && active.has(id) ? 2.2 : 1.2;
        ctx.stroke();
      }
    function sprite(
      atlas: Atlas | undefined,
      key: string,
      n: PassiveNode,
      width: number,
    ) {
      const f = atlas?.frames[key]?.frame;
      if (!f || !atlas) return false;
      ctx!.drawImage(
        atlas.image,
        f.x,
        f.y,
        f.w,
        f.h,
        n.x - width / 2,
        n.y - (width * f.h) / f.w / 2,
        width,
        (width * f.h) / f.w,
      );
      return true;
    }
    for (const n of nodes) {
      if (!visible(n)) continue;
      const allocated = active.has(n.id),
        kind = n.kind || "normal";
      const width =
        kind === "keystone"
          ? 27
          : kind === "notable"
            ? 20
            : kind === "start"
              ? 35
              : 14;
      if (
        n.id === focused?.id ||
        (query &&
          `${n.name} ${n.description}`
            .toLowerCase()
            .includes(query.toLowerCase()))
      ) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, width * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = "#91eee0";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const prefix =
        kind === "keystone"
          ? "keystone"
          : kind === "notable"
            ? "notable"
            : "normal";
      const atlas = allocated ? art.skills : art["skills-disabled"];
      const frameKey = atlas
        ? Object.keys(atlas.frames).find(
            (k) => k.startsWith(prefix) && k.endsWith(":" + n.icon),
          )
        : undefined;
      if (!frameKey || !sprite(atlas, frameKey, n, width * 0.85)) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, width * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = allocated ? "#b59b58" : "#29251e";
        ctx.fill();
      }
      const state = allocated ? "Allocated" : "Unallocated";
      const frame =
        kind === "keystone"
          ? `KeystoneFrame${state}`
          : kind === "notable"
            ? `${n.ascendancy ? "AscendancyFrame" : "NotableFrame"}${n.ascendancy ? "Notable" : ""}${state}`
            : kind === "jewel"
              ? `JewelFrame${state}`
              : kind === "start"
                ? "AscendancyStartNode"
                : allocated
                  ? "PSSkillFrameActive"
                  : "PSSkillFrame";
      sprite(art.frame, "frame:" + frame, n, width);
      if (n.starts?.length) {
        ctx.font = "bold 8px Georgia";
        ctx.textAlign = "center";
        ctx.fillStyle = allocated ? "#f1dca5" : "#8b826e";
        ctx.fillText(
          n.starts.includes(
            data?.classes.findIndex((c) => c.name === build.cls) ?? -1,
          )
            ? build.cls
            : data?.classes[n.starts.at(-1)!]?.name || "Start",
          n.x,
          n.y + 28,
        );
      }
    }
  }, [
    nodes,
    map,
    active,
    camera,
    size,
    art,
    query,
    focused,
    build.cls,
    data,
    custom,
    path?.join(","),
    edgeGeometry,
  ]);
  function inspect(n: PassiveNode) {
    setSelected(n.id);
    setCamera((c) => ({ ...c, x: n.x, y: n.y }));
  }
  function changeAllocation(ids: string[]) {
    setPast((p) => [...p, build.allocated].slice(-30));
    patch({ allocated: ids, treeSource: custom ? undefined : "ggg-bd87e65" });
  }
  function allocate() {
    if (!focused) return;
    if (custom) {
      changeAllocation(
        active.has(focused.id)
          ? build.allocated.filter((id) => id !== focused.id)
          : [...build.allocated, focused.id],
      );
      return;
    }
    if (!start) return;
    if (focused.kind === "start") {
      onMessage("Class and ascendancy starting points are free.");
      return;
    }
    if (active.has(focused.id)) {
      changeAllocation(
        removeAllocation(nodes, build.allocated, start.id, focused.id),
      );
      return;
    }
    if (!path) {
      onMessage("No connected path from your class or ascendancy start.");
      return;
    }
    const normalAdded = path.filter((id) => !map.get(id)?.ascendancy).length,
      ascAdded = path.length - normalAdded;
    if (
      ordinary + normalAdded > (build.pointBudget ?? 123) ||
      ascPoints + ascAdded > 8
    ) {
      onMessage(
        "This path exceeds the selected passive or ascendancy point budget.",
      );
      return;
    }
    changeAllocation([...new Set([...build.allocated, ...path])]);
  }
  return (
    <Panel className="official-tree-panel">
      <div className="panel-top">
        <div>
          <div className="eyebrow">GRINDING GEAR GAMES · 0.5.5</div>
          <h2>{custom ? "Imported passive tree" : "Official passive tree"}</h2>
        </div>
        <a href={OFFICIAL_TREE_URL} target="_blank" rel="noreferrer">
          View GGG export ↗
        </a>
      </div>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((x) => x + 1)}>
            Retry tree download
          </button>
        </p>
      )}
      {!nodes.length && !error && (
        <p role="status">Loading GGG tree and official artwork…</p>
      )}
      <div className="tree-controls">
        <label className="field">
          Tree class
          <select
            value={build.cls}
            onChange={(e) =>
              patch({
                cls: e.target.value,
                asc: "",
                allocated: [],
                treeSource: "ggg-bd87e65",
                nodes: [],
              })
            }
          >
            {(
              data?.classes.filter((c) =>
                c.ascendancies.some((a) => a.name),
              ) || [{ name: build.cls }]
            ).map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Tree ascendancy
          <select
            value={build.asc}
            onChange={(e) =>
              patch({
                asc: e.target.value,
                allocated: build.allocated.filter(
                  (id) => !map.get(id)?.ascendancy,
                ),
              })
            }
          >
            <option value="">No ascendancy</option>
            {data?.classes
              .find((c) => c.name === build.cls)
              ?.ascendancies.filter((a) => a.name)
              .map((a) => (
                <option key={a.id}>{a.name}</option>
              ))}
          </select>
        </label>
        <label className="field">
          Passive point budget
          <input
            type="number"
            min={0}
            max={200}
            value={build.pointBudget ?? 123}
            onChange={(e) =>
              patch({
                pointBudget: Math.max(0, Math.min(200, +e.target.value)),
              })
            }
          />
        </label>
        <strong>
          {ordinary} / {build.pointBudget ?? 123} passives · {ascPoints} / 8
          ascendancy
        </strong>
      </div>
      <div className="tree-workspace">
        <div>
          <div className="tree-toolbar">
            <button
              onClick={() =>
                setCamera((c) => ({ ...c, z: Math.max(0.2, c.z / 1.3) }))
              }
              aria-label="Zoom tree out"
            >
              −
            </button>
            <span>{Math.round(camera.z * 100)}%</span>
            <button
              onClick={() =>
                setCamera((c) => ({ ...c, z: Math.min(5, c.z * 1.3) }))
              }
              aria-label="Zoom tree in"
            >
              +
            </button>
            <button
              onClick={() =>
                start && setCamera({ x: start.x, y: start.y, z: 1.7 })
              }
            >
              Class start
            </button>
            <button
              disabled={!nodes.length}
              onClick={() => {
                const base = nodes.filter((n) => !n.ascendancy);
                if (!base.length) return;
                const minX = Math.min(...base.map((n) => n.x)),
                  maxX = Math.max(...base.map((n) => n.x)),
                  minY = Math.min(...base.map((n) => n.y)),
                  maxY = Math.max(...base.map((n) => n.y));
                setCamera({
                  x: (minX + maxX) / 2,
                  y: (minY + maxY) / 2,
                  z: Math.min(
                    size.w / (maxX - minX + 80),
                    size.h / (maxY - minY + 80),
                  ),
                });
              }}
            >
              Full tree
            </button>
            <button
              disabled={!ascStart}
              onClick={() =>
                ascStart && setCamera({ x: ascStart.x, y: ascStart.y, z: 1.7 })
              }
            >
              Ascendancy
            </button>
            <button
              disabled={!past.length}
              onClick={() => {
                patch({ allocated: past.at(-1)! });
                setPast((p) => p.slice(0, -1));
              }}
            >
              Undo allocation
            </button>
          </div>
          <div ref={host} className="official-tree-canvas">
            <canvas
              ref={canvas}
              style={{ width: "100%", height: size.h, touchAction: "none" }}
              aria-label="Passive tree map. Drag to pan; use search and the node inspector to allocate."
              tabIndex={0}
              onKeyDown={(e) => {
                const delta = 60 / camera.z;
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  setCamera((c) => ({
                    ...c,
                    x:
                      c.x +
                      (e.key === "ArrowLeft"
                        ? -delta
                        : e.key === "ArrowRight"
                          ? delta
                          : 0),
                    y:
                      c.y +
                      (e.key === "ArrowUp"
                        ? -delta
                        : e.key === "ArrowDown"
                          ? delta
                          : 0),
                  }));
                }
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  cx: camera.x,
                  cy: camera.y,
                  moved: false,
                };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d) return;
                const dx = e.clientX - d.x,
                  dy = e.clientY - d.y;
                if (Math.hypot(dx, dy) > 4) d.moved = true;
                if (d.moved)
                  setCamera((c) => ({
                    ...c,
                    x: d.cx - dx / c.z,
                    y: d.cy - dy / c.z,
                  }));
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onPointerUp={(e) => {
                const d = drag.current;
                drag.current = null;
                if (!d || d.moved) return;
                const r = e.currentTarget.getBoundingClientRect(),
                  x = (e.clientX - r.left - size.w / 2) / camera.z + camera.x,
                  y = (e.clientY - r.top - size.h / 2) / camera.z + camera.y;
                const n = nodes
                  .filter(
                    (n) =>
                      Math.hypot(n.x - x, n.y - y) <
                      (n.kind === "normal" ? 12 : 22),
                  )
                  .sort(
                    (a, b) =>
                      Math.hypot(a.x - x, a.y - y) -
                      Math.hypot(b.x - x, b.y - y),
                  )[0];
                if (n) setSelected(n.id);
              }}
            />
          </div>
          <p className="hint">
            Drag to pan · select a node, then allocate its connected path.
            Switching class resets allocations. Refunding a node also refunds
            branches disconnected from the start.
          </p>
        </div>
        <aside className="tree-inspector">
          <label className="field">
            Search passive nodes
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or modifier…"
            />
          </label>
          <div className="passive-results">
            {matches.map((n) => (
              <button key={n.id} onClick={() => inspect(n)}>
                {n.name}
                <small>
                  {n.kind} {active.has(n.id) ? "· allocated" : ""}
                </small>
              </button>
            ))}
          </div>
          {focused ? (
            <div className="passive-detail">
              <span className="eyebrow">{focused.kind}</span>
              <h3>{focused.name}</h3>
              <p>{focused.description || "Starting location"}</p>
              <p className="hint">
                {active.has(focused.id)
                  ? "Allocated"
                  : path
                    ? `${path.length} point connected path`
                    : "No available path"}
              </p>
              <button
                className="primary"
                disabled={focused.kind === "start"}
                onClick={allocate}
              >
                {active.has(focused.id)
                  ? "Refund node & disconnected branches"
                  : "Allocate connected path"}
              </button>
            </div>
          ) : (
            <p className="hint">
              Select a node on the map or in search results to inspect its
              official modifiers.
            </p>
          )}
          <p className="hint">
            Class overrides, node art and positions come from GGG. Special
            ascendancy exceptions and weapon-set passive splits are not yet
            simulated.
          </p>
        </aside>
      </div>
    </Panel>
  );
}
