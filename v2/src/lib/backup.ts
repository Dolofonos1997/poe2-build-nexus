import { parseBoard } from "../engine/temple";
import { parseBuild } from "./builds";
const keys = [
  "atlas-temple-v2",
  "atlas-layouts",
  "atlas-builds",
  "atlas-favorites",
  "atlas-runs",
  "atlas-prices",
  "atlas-reduced-motion",
] as const;
export function validateBackup(raw: unknown): Record<string, string> {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("version" in raw) ||
    raw.version !== 2 ||
    !("data" in raw) ||
    !raw.data ||
    typeof raw.data !== "object"
  )
    throw new Error("Expected an Atlas version 2 workspace backup.");
  const data = raw.data as Record<string, unknown>,
    out: Record<string, string> = {};
  for (const key of keys) {
    if (data[key] == null) continue;
    let value =
      typeof data[key] === "string"
        ? JSON.parse(data[key] as string)
        : data[key];
    if (key === "atlas-temple-v2") {
      if (!value?.state) throw new Error("Invalid temple state.");
      parseBoard(value.state.board);
    } else if (key === "atlas-builds") {
      if (!Array.isArray(value) || value.length > 1000)
        throw new Error("Invalid build library.");
      for (const b of value) {
        parseBuild(b);
        if (
          typeof b.id !== "string" ||
          !Array.isArray(b.gear) ||
          !Array.isArray(b.skills) ||
          !Array.isArray(b.nodes) ||
          !Array.isArray(b.allocated) ||
          !Array.isArray(b.tags)
        )
          throw new Error("Invalid saved build.");
      }
      value = value.map((b) => ({
        ...parseBuild(b),
        id: b.id,
        updated:
          typeof b.updated === "string" ? b.updated : new Date().toISOString(),
      }));
    } else if (key === "atlas-layouts") {
      if (!Array.isArray(value)) throw new Error("Invalid layouts.");
      for (const l of value) {
        if (
          typeof l.id !== "string" ||
          typeof l.name !== "string" ||
          typeof l.date !== "string"
        )
          throw new Error("Invalid layout.");
        parseBoard(l.board);
      }
    } else if (key === "atlas-favorites") {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string"))
        throw new Error("Invalid favorites.");
    } else if (key === "atlas-reduced-motion") {
      if (typeof value !== "boolean") throw new Error("Invalid preference.");
    } else {
      if (!Array.isArray(value)) throw new Error("Invalid ledger.");
      for (const v of value) {
        if (
          !v ||
          typeof v.id !== "string" ||
          typeof v.name !== "string" ||
          typeof v.date !== "string"
        )
          throw new Error("Invalid ledger entry.");
        const fields =
          key === "atlas-runs" ? ["revenue", "cost", "minutes"] : ["value"];
        if (
          fields.some(
            (f) =>
              typeof v[f] !== "number" || !Number.isFinite(v[f]) || v[f] < 0,
          )
        )
          throw new Error("Invalid ledger amount.");
      }
    }
    out[key] = JSON.stringify(value);
  }
  if (!Object.keys(out).length)
    throw new Error("No supported workspace records found.");
  return out;
}
export function restoreBackup(records: Record<string, string>) {
  const previous = Object.fromEntries(
    Object.keys(records).map((k) => [k, localStorage.getItem(k)]),
  );
  try {
    for (const [k, v] of Object.entries(records)) localStorage.setItem(k, v);
  } catch (error) {
    for (const [k, v] of Object.entries(previous))
      v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    throw error;
  }
}
