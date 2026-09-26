import { useEffect, useState } from "react";
import { Shield, Swords, FlaskConical, Gem } from "lucide-react";
import { type Build, type Gear } from "../lib/builds";
import { type CatalogueItem, fitsSlot, parseItemText } from "../lib/equipment";
import { Panel } from "./UI";
export function Equipment({
  build,
  patch,
  onMessage,
}: {
  build: Build;
  patch: (v: Partial<Build>) => void;
  onMessage: (s: string) => void;
}) {
  const [slot, setSlot] = useState("Weapon"),
    [set, setSet] = useState(1),
    [query, setQuery] = useState(""),
    [catalogue, setCatalogue] = useState<CatalogueItem[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [candidate, setCandidate] = useState<CatalogueItem | null>(null),
    [paste, setPaste] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch(`${import.meta.env.BASE_URL}items.json`, { signal: c.signal })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            "Item catalogue unavailable. You can still paste or edit an item.",
          );
        const d = await r.json();
        if (d.version !== 1 || !Array.isArray(d.items))
          throw Error("Invalid item catalogue.");
        setCatalogue(d.items);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => c.abort();
  }, []);
  const gear = build.gear.find((g) => g.slot === slot)!;
  function update(change: Partial<Gear>) {
    patch({
      gear: build.gear.map((g) => (g.slot === slot ? { ...g, ...change } : g)),
    });
  }
  const found = catalogue.filter(
    (i) =>
      fitsSlot(i, slot) &&
      `${i.name} ${i.base} ${i.mods}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const weaponSlots =
    set === 1 ? ["Weapon", "Offhand"] : ["Weapon II", "Offhand II"];
  function selectSlot(s: string) {
    setSlot(s);
    setCandidate(null);
    setQuery("");
  }
  function card(g: Gear) {
    return (
      <div
        className={`item-card rarity-${(g.rarity || "normal").toLowerCase()}`}
      >
        <header>
          <h3>{g.name || "Empty slot"}</h3>
          <p>{g.base || g.slot}</p>
        </header>
        {g.icon && (
          <img
            src={g.icon}
            alt={g.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <p className="item-properties">{g.properties}</p>
        <p className="item-mods">
          {g.mods || "Choose an item or add its modifiers."}
        </p>
      </div>
    );
  }
  return (
    <div className="equipment-workspace">
      <div>
        <Panel title="Equipment">
          <div className="tabs">
            <button
              className={set === 1 ? "active" : ""}
              onClick={() => {
                setSet(1);
                selectSlot("Weapon");
              }}
            >
              Weapon set I
            </button>
            <button
              className={set === 2 ? "active" : ""}
              onClick={() => {
                setSet(2);
                selectSlot("Weapon II");
              }}
            >
              Weapon set II
            </button>
          </div>
          <div className="equipment-slots">
            {build.gear
              .filter(
                (g) =>
                  !["Weapon", "Offhand", "Weapon II", "Offhand II"].includes(
                    g.slot,
                  ) || weaponSlots.includes(g.slot),
              )
              .map((g) => (
                <button
                  key={g.slot}
                  aria-label={`Equip ${g.slot}`}
                  aria-pressed={slot === g.slot}
                  className={`equipment-slot ${slot === g.slot ? "chosen" : ""} ${g.name ? "filled" : ""}`}
                  onClick={() => selectSlot(g.slot)}
                >
                  <span>{g.slot}</span>
                  {g.icon ? (
                    <img
                      src={g.icon}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : g.slot.includes("Weapon") ? (
                    <Swords />
                  ) : g.slot.includes("Flask") ? (
                    <FlaskConical />
                  ) : g.slot.includes("Charm") ||
                    g.slot.includes("Ring") ||
                    g.slot === "Amulet" ? (
                    <Gem />
                  ) : (
                    <Shield />
                  )}
                  <strong>{g.name || "Empty"}</strong>
                </button>
              ))}
          </div>
          <p className="hint">
            {build.gear.filter((g) => g.name).length} / {build.gear.length}{" "}
            slots equipped · Estimated total{" "}
            {build.gear.reduce((n, g) => n + g.price, 0).toLocaleString()} ex
          </p>
        </Panel>
        <Panel title={`Selected: ${slot}`}>
          {card(gear)}
          <details>
            <summary>Edit item or paste from game</summary>
            <label className="field">
              Item name
              <input
                value={gear.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>
            <label className="field">
              Base item
              <input
                value={gear.base || ""}
                onChange={(e) => update({ base: e.target.value })}
              />
            </label>
            <label className="field">
              Modifiers
              <textarea
                rows={5}
                value={gear.mods}
                onChange={(e) => update({ mods: e.target.value })}
              />
            </label>
            <label className="field">
              Estimated price (ex)
              <input
                type="number"
                min={0}
                value={gear.price}
                onChange={(e) =>
                  update({ price: Math.max(0, +e.target.value) })
                }
              />
            </label>
            <label className="field">
              Copied in-game item
              <textarea
                rows={6}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Item Class: …&#10;Rarity: Rare&#10;…"
              />
            </label>
            <button
              onClick={() => {
                try {
                  const g = parseItemText(paste, slot);
                  if (g.itemClass && !fitsSlot(g, slot))
                    throw Error(
                      `This ${g.itemClass} does not fit ${slot}. Choose a compatible slot.`,
                    );
                  update({ ...g, icon: "" });
                  setPaste("");
                  onMessage(
                    "Item imported. Save the build to keep your changes.",
                  );
                } catch (e) {
                  onMessage((e as Error).message);
                }
              }}
            >
              Import pasted item
            </button>
          </details>
          <button
            disabled={!gear.name}
            onClick={() =>
              update({
                name: "",
                mods: "",
                price: 0,
                base: "",
                properties: "",
                icon: "",
                raw: "",
                rarity: "",
                itemClass: "",
              })
            }
          >
            Clear slot
          </button>
        </Panel>
      </div>
      <Panel title="Find real equipment">
        <p className="hint">
          Search {catalogue.length.toLocaleString()} real unique variants from{" "}
          <a
            href="https://poe.ninja/poe2/economy"
            target="_blank"
            rel="noreferrer"
          >
            poe.ninja
          </a>
          . Modifier ranges describe the item; choose or paste your actual
          rolls. Rare items can be entered from copied game text.
        </p>
        <label className="field">
          Search equipment
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Item name, base or modifier…"
          />
        </label>
        <p className="hint">
          Showing items compatible with {slot} · {found.length} matches
        </p>
        {loading && <p role="status">Loading real item catalogue…</p>}
        {error && <p role="alert">{error}</p>}
        <div className="item-search-results">
          {found.slice(0, 60).map((i) => (
            <button
              key={i.id}
              className={candidate?.id === i.id ? "chosen" : ""}
              onClick={() => setCandidate(i)}
            >
              {i.icon && <img src={i.icon} alt="" loading="lazy" />}
              <span>
                <strong>{i.name}</strong>
                <small>
                  {i.base} {i.variant && `· ${i.variant}`}
                </small>
              </span>
            </button>
          ))}
        </div>
        {!loading && !found.length && (
          <p>
            No matching uniques in this slot. Try another search or paste your
            item.
          </p>
        )}
        {candidate && (
          <div className="candidate-item">
            {card(candidate)}
            <button
              className="primary"
              onClick={() => {
                update({
                  name: candidate.name,
                  base: candidate.base,
                  rarity: "Unique",
                  icon: candidate.icon,
                  mods: candidate.mods,
                  properties: candidate.properties,
                  itemClass: candidate.itemClass,
                  price: 0,
                  raw: "",
                });
                onMessage(
                  `${candidate.name} equipped in ${slot}. Save build to keep changes.`,
                );
              }}
            >
              Equip {candidate.name} in {slot}
            </button>
            <p className="hint">
              Catalogue checked{" "}
              {new Date(candidate.fetchedAt).toLocaleDateString()}. Replaces
              only the selected slot.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
