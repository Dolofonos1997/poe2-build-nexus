import { useState } from "react";
export function readStorage<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initial));
  const update = (next: T | ((current: T) => T)) =>
    setValue((current) => {
      const result =
        typeof next === "function" ? (next as (v: T) => T)(current) : next;
      try {
        localStorage.setItem(key, JSON.stringify(result));
      } catch {
        throw new Error(
          "Browser storage is full or unavailable. Export a backup before continuing.",
        );
      }
      return result;
    });
  return [value, update] as const;
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readFile(file: File) {
  if (file.size > 2_000_000)
    throw new Error("Please choose a JSON file smaller than 2 MB.");
  return JSON.parse(await file.text()) as unknown;
}
