import { mkdir, readFile, writeFile } from "node:fs/promises";
export const categories = ["Currency", "Fragments", "SoulCores", "Ritual"];
export function normalize(data) {
  if (
    !data?.core?.primary ||
    !Array.isArray(data.lines) ||
    !Array.isArray(data.items)
  )
    throw new Error("Unexpected economy response");
  const metadata = [...data.items, ...(data.core.items || [])];
  const names = new Map(metadata.map((x) => [x.id, x.name]));
  const rows = data.lines
    .filter(
      (x) =>
        typeof x.id === "string" &&
        Number.isFinite(x.primaryValue) &&
        x.primaryValue > 0,
    )
    .map((x) => ({
      id: x.id,
      name: names.get(x.id) || x.id,
      value: x.primaryValue,
      change: Number.isFinite(x.sparkline?.totalChange)
        ? x.sparkline.totalChange
        : null,
      volume: Number.isFinite(x.volumePrimaryValue)
        ? x.volumePrimaryValue
        : null,
    }));
  if (!rows.length) throw new Error("Empty economy response");
  return { unit: names.get(data.core.primary) || data.core.primary, rows };
}
export async function collect() {
  const output = "v2/public/economy.json";
  let previous = { feeds: [], leagues: [] };
  try {
    previous = JSON.parse(await readFile(output, "utf8"));
  } catch {
    /* first collection */
  }
  {
    try {
      const r = await fetch(
        "https://dolofonos1997.github.io/poe2-build-nexus/v2/economy.json",
        { signal: AbortSignal.timeout(10000) },
      );
      if (r.ok) {
        const deployed = await r.json();
        if (
          deployed.version === 1 &&
          Array.isArray(deployed.feeds) &&
          Array.isArray(deployed.leagues)
        ) {
          for (const feed of deployed.feeds) {
            const index = previous.feeds.findIndex(
              (x) => x.league === feed.league && x.category === feed.category,
            );
            if (index < 0) previous.feeds.push(feed);
            else if (
              Date.parse(feed.checkedAt || feed.fetchedAt) >
              Date.parse(
                previous.feeds[index].checkedAt ||
                  previous.feeds[index].fetchedAt,
              )
            )
              previous.feeds[index] = feed;
          }
          if (deployed.leagues.length) previous.leagues = deployed.leagues;
        }
      }
    } catch {
      /* no deployed snapshot yet */
    }
  }
  const headers = {
    "User-Agent":
      "PoE2BuildNexus/2.1 (+https://github.com/Dolofonos1997/poe2-build-nexus)",
  };
  let leagues;
  try {
    const r = await fetch("https://poe.ninja/poe2/api/economy/leagues", {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`Leagues HTTP ${r.status}`);
    leagues = (await r.json())
      .filter((x) => typeof x.id === "string" && typeof x.name === "string")
      .slice(0, 8);
    if (!leagues.length) throw new Error("No leagues");
  } catch (e) {
    leagues = previous.leagues;
    console.warn("League discovery unavailable:", e.message);
  }
  const feeds = [];
  for (const league of leagues)
    for (const category of categories) {
      const old = previous.feeds.find(
        (x) => x.league === league.id && x.category === category,
      );
      const url = `https://poe.ninja/poe2/api/economy/exchange/current/overview?league=${encodeURIComponent(league.id)}&type=${category}`;
      try {
        const r = await fetch(url, {
          headers: {
            ...headers,
            ...(old?.etag ? { "If-None-Match": old.etag } : {}),
          },
          signal: AbortSignal.timeout(15000),
        });
        if (r.status === 304 && old) {
          feeds.push({ ...old, checkedAt: new Date().toISOString() });
          continue;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        feeds.push({
          league: league.id,
          category,
          ...normalize(await r.json()),
          fetchedAt: new Date().toISOString(),
          checkedAt: new Date().toISOString(),
          etag: r.headers.get("etag"),
          source: url,
        });
      } catch (e) {
        console.warn(`${league.id}/${category}: ${e.message}`);
        if (old) feeds.push(old);
      }
    }
  if (!feeds.length)
    throw new Error(
      "No market data available; refusing to publish an empty replacement.",
    );
  await mkdir("v2/public", { recursive: true });
  await writeFile(
    output,
    JSON.stringify({
      version: 1,
      generatedAt: new Date().toISOString(),
      leagues,
      feeds,
    }),
  );
  console.log(
    `Saved ${feeds.length} market feeds; existing timestamps retained on failures.`,
  );
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/economy.mjs"))
  await collect();
