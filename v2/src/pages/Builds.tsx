import { useRef, useState } from "react";
import { PassiveTree } from "../components/PassiveTree";
import { Equipment } from "../components/Equipment";
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
  type Build,
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
                      onChange={(e) =>
                        patch({ cls: e.target.value, asc: "", allocated: [] })
                      }
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
            <Equipment build={edit} patch={patch} onMessage={setMessage} />
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
