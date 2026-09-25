import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageTitle, Panel } from "../components/UI";
import { download, readFile, useLocal } from "../lib/storage";
import { restoreBackup, validateBackup } from "../lib/backup";
export default function Settings() {
  const [reduced, setReduced] = useLocal("atlas-reduced-motion", false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Record<string, string> | null>(null);
  return (
    <>
      <PageTitle
        eyebrow="YOUR WORKSPACE"
        title="Settings & data"
        description="Keep your planning data in your hands."
      />
      <div className="two-col">
        <Panel title="Workspace preferences">
          <label className="check">
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => {
                setReduced(e.target.checked);
                document.documentElement.dataset.reducedMotion = String(
                  e.target.checked,
                );
              }}
            />
            Reduce animation
          </label>
          <p className="hint">
            Your browser's reduced-motion setting is also respected.
          </p>
          <button
            onClick={() => {
              const backup = Object.fromEntries(
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("atlas-"))
                  .map((k) => [
                    k,
                    JSON.parse(localStorage.getItem(k) || "null"),
                  ]),
              );
              download("atlas-workspace-backup.json", {
                version: 2,
                created: new Date().toISOString(),
                data: backup,
              });
              setMessage("Workspace backup exported.");
            }}
          >
            Export complete workspace backup
          </button>
          <button onClick={() => input.current?.click()}>
            Restore workspace backup
          </button>
          <input
            hidden
            type="file"
            accept=".json"
            ref={input}
            onChange={async (e) => {
              try {
                if (e.target.files?.[0])
                  setPending(validateBackup(await readFile(e.target.files[0])));
              } catch (e) {
                setMessage((e as Error).message);
              }
              e.target.value = "";
            }}
          />
          {pending && (
            <div className="notice">
              <p>
                This backup will replace {Object.keys(pending).length} local
                workspace records. A copy of your current data will be
                downloaded first.
              </p>
              <div className="actions">
                <button
                  onClick={() => {
                    try {
                      const data = Object.fromEntries(
                        Object.keys(pending).map((k) => [
                          k,
                          localStorage.getItem(k),
                        ]),
                      );
                      download("atlas-before-restore.json", {
                        version: 2,
                        data,
                      });
                      restoreBackup(pending);
                      location.reload();
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  Restore reviewed backup
                </button>
                <button onClick={() => setPending(null)}>Cancel</button>
              </div>
            </div>
          )}
          <p className="hint">
            Restore either a local export or a downloaded cloud snapshot. Files
            are validated before changing your workspace.
          </p>
        </Panel>
        <Panel title="Online services">
          <p>
            Supabase account, private cloud backup, and public community
            features are prepared. They become available when a backend project
            is configured.
          </p>
          <p className="hint">
            Local saves stay on this device. Cloud actions are explicit: save,
            download, or publish from the account page. Clearing browser storage
            removes local saves; export a backup first.
          </p>
          <Link to="/community">Account & community ↗</Link>
        </Panel>
        <Panel title="Data provenance">
          <p>
            Room definitions and original artwork were migrated from the
            repository's V24.6 HTML. Build cards are explicitly labeled
            examples.
          </p>
          <p className="hint">
            The passive-tree viewer loads a pinned official GGG export or
            imported node data. The strategy assistant ranks moves with
            transparent rules; it does not predict random outcomes or use a
            hosted AI model.
          </p>
        </Panel>
        <Panel title="Release status">
          <p>
            <strong>V2 alpha · development preview</strong>
          </p>
          <p className="hint">
            The production V24.6 page remains at the site root. Atlas is built
            into the /v2/ subdirectory.
          </p>
          <a href="../index.html">Open V24.6 ↗</a>
        </Panel>
      </div>
      <div role="status" className="toast">
        {message}
      </div>
    </>
  );
}
