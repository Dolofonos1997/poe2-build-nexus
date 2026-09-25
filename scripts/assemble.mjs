import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
mkdirSync("dist", { recursive: true });
copyFileSync("index.html", "dist/index.html");
copyFileSync(".nojekyll", "dist/.nojekyll");
const files = readdirSync("dist/v2", { recursive: true, withFileTypes: true })
  .filter((f) => f.isFile())
  .map((f) =>
    (f.parentPath + "/" + f.name).replaceAll("\\", "/").replace("dist/v2/", ""),
  );
const version = createHash("sha256")
  .update(files.map((f) => readFileSync("dist/v2/" + f)).join(""))
  .digest("hex")
  .slice(0, 12);
writeFileSync(
  "dist/v2/sw.js",
  `const CACHE='atlas-app-${version}',FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('atlas-app-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin||!e.request.url.startsWith(self.registration.scope))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request,{ignoreVary:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()))));});`,
);
console.log("Production V24.6 retained at /; Atlas preview built at /v2/.");
