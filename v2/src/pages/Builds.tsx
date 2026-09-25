import { useEffect, useMemo, useRef, useState } from "react";
import { loadOfficialTree, OFFICIAL_TREE_URL } from "../lib/official-tree";
import {
  Plus,
  Search,
  Star,
  Download,
  Upload,
  ArrowLeft,
  Trash2,
  Copy,
} from "lucide-react";
import { PageTitle, Panel, Empty } from "../components/UI";
import {
  newBuild,
  exampleBuilds,
  classes,
  parseBuild,
  parseTree,
  type Build,
  type PassiveNode,
} from "../lib/builds";
import { useLocal, download, readFile } from "../lib/storage";
export default function Builds() {
  const [saved, setSaved] = useLocal<Build[]>("atlas-builds", []),
    [favorites, setFavorites] = useLocal<string[]>("atlas-favorites", []);
  const [q, setQ] = useState(""),
    [cls, setCls] = useState(""),
    [budget, setBudget] = useState(""),
    [onlyFav, setOnlyFav] = useState(false),
    [edit, setEdit] = useState<Build | null>(null),
    [tab, setTab] = useState("Overview"),
    [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function save(b: Build) {
    const next = { ...b, example: false, updated: new Date().toISOString() };
    setSaved([...saved.filter((x) => x.id !== b.id), next]);
    setEdit(next);
    setMessage("Build saved on this device.");
  }
  function patch(value: Partial<Build>) {
    if (edit) setEdit({ ...edit, ...value });
  }
  function open(b: Build) {
    setEdit(structuredClone(b));
    setTab("Overview");
  }
  const list = [...saved, ...exampleBuilds].filter(
    (b) =>
      (!cls || b.cls === cls) &&
      (!budget || b.budget === budget) &&
      (!onlyFav || favorites.includes(b.id)) &&
      `${b.title} ${b.cls} ${b.asc} ${b.skill} ${b.tags.join(" ")}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="CHARACTER ARCHIVES"
        title={edit ? edit.title : "Build library"}
        description={
          edit
            ? "Plan the character. Keep every detail together."
            : "Your next journey begins with an idea."
        }
      >
        {edit ? (
          <>
            <button onClick={() => setEdit(null)}>
              <ArrowLeft size={16} />
              Library
            </button>
            <button onClick={() => download("atlas-build.json", edit)}>
              <Download size={16} />
              Export
            </button>
            <button className="primary" onClick={() => save(edit)}>
              Save build
            </button>
          </>
        ) : (
          <>
            <button onClick={() => input.current?.click()}>
              <Upload size={16} />
              Import JSON
            </button>
            <button className="primary" onClick={() => open(newBuild())}>
              <Plus size={16} />
              Create build
            </button>
          </>
        )}
      </PageTitle>
      <input
        hidden
        ref={input}
        type="file"
        accept=".json"
        onChange={async (e) => {
          try {
            if (e.target.files?.[0]) {
              const b = parseBuild(await readFile(e.target.files[0]));
              save(b);
            }
          } catch (e) {
            setMessage((e as Error).message);
          }
          e.target.value = "";
        }}
      />
      {edit ? (
        <>
          <div className="tabs">
            {["Overview", "Equipment", "Skills", "Passive tree"].map((t) => (
              <button
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {edit.example && (
            <p className="notice">
              Repository example · save a personal copy to adapt it. No verified
              DPS or current market prices are attached.
            </p>
          )}
          {tab === "Overview" && (
            <div className="two-col">
              <Panel title="Build details">
                <label className="field">
                  Title
                  <input
                    maxLength={120}
                    value={edit.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </label>
                <div className="two-col">
                  <label className="field">
                    Class
                    <select
                      value={edit.cls}
                      onChange={(e) => patch({ cls: e.target.value })}
                    >
                      {classes.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Ascendancy
                    <input
                      value={edit.asc}
                      onChange={(e) => patch({ asc: e.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  Main skill
                  <input
                    value={edit.skill}
                    onChange={(e) => patch({ skill: e.target.value })}
                  />
                </label>
                <label className="field">
                  Budget
                  <select
                    value={edit.budget}
                    onChange={(e) => patch({ budget: e.target.value })}
                  >
                    {["Starter", "Medium", "High"].map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Tags (comma separated)
                  <input
                    value={edit.tags.join(", ")}
                    onChange={(e) =>
                      patch({
                        tags: e.target.value.split(",").map((t) => t.trim()),
                      })
                    }
                  />
                </label>
              </Panel>
              <Panel title="Field notes">
                <label className="field">
                  Progression, defenses, mechanics & patch version
                  <textarea
                    rows={12}
                    value={edit.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                </label>
                <p className="hint">
                  Choose your actual in-game class and ascendancy. This library
                  does not infer release availability or calculate
                  PoB-equivalent DPS.
                </p>
              </Panel>
            </div>
          )}
          {tab === "Equipment" && (
            <>
              <p className="notice">
                Prices are your own estimates in exalted orbs. Enter both weapon
                sets independently.
              </p>
              <div className="gear-grid">
                {edit.gear.map((g, i) => (
                  <Panel key={g.slot}>
                    <div className="eyebrow">{g.slot}</div>
                    <label className="field">
                      Item name
                      <input
                        value={g.name}
                        onChange={(e) =>
                          patch({
                            gear: edit.gear.map((x, j) =>
                              i === j ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                        placeholder="Empty slot"
                      />
                    </label>
                    <label className="field">
                      Modifiers
                      <textarea
                        rows={3}
                        value={g.mods}
                        onChange={(e) =>
                          patch({
                            gear: edit.gear.map((x, j) =>
                              i === j ? { ...x, mods: e.target.value } : x,
                            ),
                          })
                        }
                        placeholder="Paste the item's modifiers"
                      />
                    </label>
                    <label className="field">
                      Estimated price (ex)
                      <input
                        type="number"
                        min={0}
                        value={g.price}
                        onChange={(e) =>
                          patch({
                            gear: edit.gear.map((x, j) =>
                              i === j
                                ? { ...x, price: Math.max(0, +e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                  </Panel>
                ))}
              </div>
              <p>
                Total entered gear cost:{" "}
                <strong>
                  {edit.gear.reduce((s, g) => s + g.price, 0).toLocaleString()}{" "}
                  ex
                </strong>
              </p>
            </>
          )}
          {tab === "Skills" && (
            <Panel title="Skill & support groups">
              {edit.skills.map((g, i) => (
                <div className="skill-row" key={i}>
                  <label className="field">
                    Skill
                    <input
                      value={g.skill}
                      onChange={(e) =>
                        patch({
                          skills: edit.skills.map((s, j) =>
                            j === i ? { ...s, skill: e.target.value } : s,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Supports (comma separated)
                    <input
                      value={g.supports}
                      onChange={(e) =>
                        patch({
                          skills: edit.skills.map((s, j) =>
                            j === i ? { ...s, supports: e.target.value } : s,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    aria-label={`Remove skill group ${i + 1}`}
                    onClick={() =>
                      patch({ skills: edit.skills.filter((_, j) => i !== j) })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  patch({
                    skills: [...edit.skills, { skill: "", supports: "" }],
                  })
                }
              >
                <Plus size={16} />
                Add skill group
              </button>
            </Panel>
          )}
          {tab === "Passive tree" && (
            <PassiveTree build={edit} patch={patch} onMessage={setMessage} />
          )}
        </>
      ) : (
        <>
          <div className="filter-bar">
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Search builds"
                placeholder="Search builds, skills, or tags…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              aria-label="Class filter"
              value={cls}
              onChange={(e) => setCls(e.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Budget filter"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            >
              <option value="">Any budget</option>
              {["Starter", "Medium", "High"].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <button
              className={onlyFav ? "chosen" : ""}
              onClick={() => setOnlyFav(!onlyFav)}
            >
              <Star size={15} />
              Favorites
            </button>
          </div>
          <div className="section-heading">
            <h2>{list.length} builds to explore</h2>
            <span>Personal builds & repository examples</span>
          </div>
          <div className="build-grid">
            {list.map((b, i) => (
              <article className={`build-card tone-${i % 4}`} key={b.id}>
                <div className="build-card-top">
                  <span className="eyebrow">{b.cls}</span>
                  <button
                    aria-label={`Favorite ${b.title}`}
                    aria-pressed={favorites.includes(b.id)}
                    className="icon-button"
                    onClick={() =>
                      setFavorites(
                        favorites.includes(b.id)
                          ? favorites.filter((id) => id !== b.id)
                          : [...favorites, b.id],
                      )
                    }
                  >
                    <Star
                      size={18}
                      fill={favorites.includes(b.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="build-sigil">{b.cls.slice(0, 1)}</div>
                <div className="build-card-body">
                  <span className="muted">{b.asc || "Your ascendancy"}</span>
                  <h2>{b.title}</h2>
                  <p>{b.skill || "Choose a main skill"}</p>
                  <div className="chips">
                    {b.tags
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((t, i) => (
                        <span key={`${t}-${i}`}>{t}</span>
                      ))}
                  </div>
                  <div className="build-card-bottom">
                    <span>
                      {b.budget}
                      <small>
                        {b.example ? "Example build" : "Personal build"}
                      </small>
                    </span>
                    <button onClick={() => open(b)}>Open build ↗</button>
                    <button
                      aria-label={`Copy ${b.title}`}
                      onClick={() =>
                        open({
                          ...structuredClone(b),
                          id: crypto.randomUUID(),
                          example: false,
                          title: `${b.title} · copy`,
                        })
                      }
                    >
                      <Copy size={15} />
                    </button>
                    {!b.example && (
                      <button
                        aria-label={`Delete ${b.title}`}
                        onClick={() => {
                          setSaved(saved.filter((x) => x.id !== b.id));
                          setMessage("Build removed from your library.");
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!list.length && (
            <Empty title="No builds found">
              Try another filter or create your own build.
            </Empty>
          )}
        </>
      )}
      <div className="toast" role="status">
        {message}
      </div>
    </>
  );
}
function PassiveTree({
  build,
  patch,
  onMessage,
}: {
  build: Build;
  patch: (v: Partial<Build>) => void;
  onMessage: (v: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [officialNodes, setOfficialNodes] = useState<PassiveNode[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    if (build.treeSource === "ggg-bd87e65") {
      setLoading(true);
      loadOfficialTree()
        .then((nodes) => {
          if (active) setOfficialNodes(nodes);
        })
        .catch((e) => {
          if (active) onMessage(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [build.treeSource]);
  const [q, setQ] = useState(""),
    [zoom, setZoom] = useState(1),
    [hover, setHover] = useState<PassiveNode | null>(null);
  const nodes =
    build.treeSource === "ggg-bd87e65" ? officialNodes : build.nodes;
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) - 60 : 0,
    minY = nodes.length ? Math.min(...nodes.map((n) => n.y)) - 60 : 0;
  const w = nodes.length ? Math.max(...nodes.map((n) => n.x)) - minX + 60 : 800,
    h = nodes.length ? Math.max(...nodes.map((n) => n.y)) - minY + 60 : 500;
  return (
    <Panel>
      <div className="panel-top">
        <h2>Passive tree</h2>
        <div className="actions">
          <button
            disabled={loading}
            onClick={() => {
              setLoading(true);
              loadOfficialTree()
                .then((nodes) => {
                  setOfficialNodes(nodes);
                  patch({
                    treeSource: "ggg-bd87e65",
                    nodes: [],
                    allocated: [],
                  });
                  onMessage(
                    `Loaded ${nodes.length.toLocaleString()} nodes from Grinding Gear Games.`,
                  );
                })
                .catch((e) => onMessage(e.message))
                .finally(() => setLoading(false));
            }}
          >
            {loading ? "Loading tree…" : "Load official GGG tree"}
          </button>
          <button onClick={() => file.current?.click()}>
            Import tree JSON
          </button>
          <button
            onClick={() =>
              download("tree-format.json", [
                {
                  id: "your-node-id",
                  name: "Your node name",
                  x: 0,
                  y: 0,
                  links: [],
                  description: "Replace this template with actual node data.",
                },
              ])
            }
          >
            Format template
          </button>
        </div>
      </div>
      <input
        hidden
        ref={file}
        type="file"
        accept=".json"
        onChange={async (e) => {
          try {
            if (e.target.files?.[0])
              patch({
                nodes: parseTree(await readFile(e.target.files[0])),
                treeSource: undefined,
                allocated: [],
              });
          } catch (e) {
            onMessage((e as Error).message);
          }
          e.target.value = "";
        }}
      />
      {!nodes.length ? (
        <Empty title="Bring your passive tree">
          Load the official GGG export or import your own node dataset to
          search, inspect, and record allocations.
        </Empty>
      ) : (
        <>
          <div className="filter-bar">
            <input
              aria-label="Search passive nodes"
              placeholder="Search nodes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <label className="check">
              Zoom
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </label>
            <span>{build.allocated.length} allocated</span>
          </div>
          <p className="hint">
            Allocation notebook; class-start reachability and passive-point
            limits are not enforced.
            {build.treeSource && (
              <>
                {" "}
                <a href={OFFICIAL_TREE_URL} target="_blank" rel="noreferrer">
                  GGG source · revision bd87e65 ↗
                </a>{" "}
                · Includes base and ascendancy nodes; class-specific overrides
                are not applied.
              </>
            )}
          </p>
          <div className="tree-viewport">
            <svg
              width={Math.max(700, w * zoom)}
              height={Math.max(450, h * zoom)}
              viewBox={`${minX} ${minY} ${w} ${h}`}
            >
              {nodes.flatMap((n) =>
                n.links.map((id) => {
                  const other = nodeMap.get(id);
                  return other ? (
                    <line
                      key={`${n.id}-${id}`}
                      x1={n.x}
                      y1={n.y}
                      x2={other.x}
                      y2={other.y}
                      stroke={
                        build.allocated.includes(n.id) &&
                        build.allocated.includes(id)
                          ? "#c5ab70"
                          : "#3b4840"
                      }
                      strokeWidth="3"
                    />
                  ) : null;
                }),
              )}
              {nodes.map((n) => (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-label={n.name}
                  aria-pressed={build.allocated.includes(n.id)}
                  onFocus={() => setHover(n)}
                  onMouseEnter={() => setHover(n)}
                  onClick={() =>
                    patch({
                      allocated: build.allocated.includes(n.id)
                        ? build.allocated.filter((id) => id !== n.id)
                        : [...build.allocated, n.id],
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      patch({
                        allocated: build.allocated.includes(n.id)
                          ? build.allocated.filter((id) => id !== n.id)
                          : [...build.allocated, n.id],
                      });
                    }
                  }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={14}
                    fill={
                      build.allocated.includes(n.id) ? "#c5ab70" : "#1c2b23"
                    }
                    stroke={
                      q && n.name.toLowerCase().includes(q.toLowerCase())
                        ? "#fff"
                        : "#8e805d"
                    }
                    strokeWidth={3}
                  />
                  <title>{n.name}</title>
                </g>
              ))}
            </svg>
          </div>
          <p>
            {hover ? (
              <>
                <strong>{hover.name}</strong> · {hover.description}
              </>
            ) : (
              "Select nodes to track allocations."
            )}
          </p>
        </>
      )}
    </Panel>
  );
}
