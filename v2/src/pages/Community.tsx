import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PageTitle, Panel, Empty } from "../components/UI";
import { cloud, requireCloud, workspaceSnapshot } from "../lib/cloud";
import { download, useLocal } from "../lib/storage";
import { parseBuild, type Build } from "../lib/builds";
type Published = {
  id: string;
  user_id: string;
  title: string;
  author: string;
  payload: unknown;
  created_at: string;
};
type Comment = { id: string; user_id: string; author: string; body: string };
export default function Community() {
  const [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [items, setItems] = useState<Published[]>([]),
    [author, setAuthor] = useLocal("atlas-author", "Exile"),
    [selected, setSelected] = useState(""),
    [stamp, setStamp] = useState<string | null>(null),
    [checked, setChecked] = useState(false),
    [active, setActive] = useState<Published | null>(null),
    [comments, setComments] = useState<Comment[]>([]),
    [comment, setComment] = useState(""),
    [likes, setLikes] = useState<string[]>([]),
    [admin, setAdmin] = useState(false);
  const [saved, setSaved] = useLocal<Build[]>("atlas-builds", []);
  const refresh = useCallback(async () => {
    if (!cloud) return;
    const { data, error } = await cloud
      .from("atlas_builds")
      .select("id,user_id,title,author,payload,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    setItems(data || []);
  }, []);
  useEffect(() => {
    if (!cloud) return;
    let mounted = true;
    cloud.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user);
    });
    const { data } = cloud.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setChecked(false);
      setStamp(null);
    });
    refresh().catch((e) => setMessage(e.message));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    setAdmin(false);
    if (user && cloud)
      cloud
        .from("atlas_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setAdmin(!!data));
  }, [user]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function discussion(b: Published) {
    setActive(b);
    const db = requireCloud();
    const [c, l] = await Promise.all([
      db
        .from("atlas_comments")
        .select("id,user_id,author,body")
        .eq("build_id", b.id)
        .order("created_at")
        .limit(100),
      db.from("atlas_likes").select("user_id").eq("build_id", b.id),
    ]);
    if (c.error) throw c.error;
    if (l.error) throw l.error;
    setComments(c.data || []);
    setLikes((l.data || []).map((x) => x.user_id));
  }
  return (
    <>
      <PageTitle
        eyebrow="THE COMMON ROOM"
        title="Account & community"
        description="Keep a cloud backup and share your builds with other exiles."
      />
      {!cloud ? (
        <Panel>
          <Empty title="Online services are not connected">
            The account, cloud-save, and community integration is included in
            the source. A Supabase project and its public configuration are
            needed before these features can run.
          </Empty>
          <p className="hint">
            Your local planner and saved builds remain available without an
            account.
          </p>
        </Panel>
      ) : (
        <>
          <div className="two-col">
            <Panel
              title={user ? "Your account" : "Sign in or create an account"}
            >
              {user ? (
                <>
                  <p>Signed in as {user.email}</p>
                  <label className="field">
                    Public author name
                    <input
                      value={author}
                      maxLength={60}
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const { error } = await requireCloud().auth.signOut();
                        if (error) throw error;
                        setMessage("Signed out.");
                      })
                    }
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const { error } =
                        await requireCloud().auth.signInWithPassword({
                          email,
                          password,
                        });
                      if (error) throw error;
                      setPassword("");
                      setMessage("Signed in.");
                    });
                  }}
                >
                  <label className="field">
                    Email
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Password
                    <input
                      type="password"
                      required
                      minLength={12}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <div className="actions">
                    <button disabled={busy} className="primary">
                      Sign in
                    </button>
                    <button
                      type="button"
                      disabled={busy || !email || password.length < 12}
                      onClick={() =>
                        run(async () => {
                          const { error } = await requireCloud().auth.signUp({
                            email,
                            password,
                            options: {
                              emailRedirectTo:
                                location.origin + location.pathname,
                            },
                          });
                          if (error) throw error;
                          setPassword("");
                          setMessage(
                            "Account requested. Check your email if confirmation is enabled.",
                          );
                        })
                      }
                    >
                      Create account
                    </button>
                  </div>
                </form>
              )}
            </Panel>
            <Panel title="Cloud workspace">
              <p className="hint">
                Save a private snapshot of your temple, layouts, builds,
                favorites, and ledger. Cloud downloads are exported as a backup
                file, so local work is never silently overwritten.
              </p>
              <div className="actions">
                <button
                  disabled={!user || busy}
                  onClick={() =>
                    run(async () => {
                      const { data, error } = await requireCloud()
                        .from("atlas_workspaces")
                        .select("updated_at")
                        .eq("user_id", user!.id)
                        .maybeSingle();
                      if (error) throw error;
                      setStamp(data?.updated_at || null);
                      setChecked(true);
                      setMessage(
                        data
                          ? `Cloud snapshot: ${new Date(data.updated_at).toLocaleString()}`
                          : "No cloud snapshot yet.",
                      );
                    })
                  }
                >
                  Check cloud status
                </button>
                <button
                  disabled={!user || !checked || busy}
                  onClick={() =>
                    run(async () => {
                      const { data, error } = await requireCloud().rpc(
                        "atlas_save_workspace",
                        { data: workspaceSnapshot(), expected: stamp },
                      );
                      if (error) throw error;
                      setStamp(data);
                      setMessage(
                        "Workspace saved to your private cloud account.",
                      );
                    })
                  }
                >
                  Save to cloud
                </button>
                <button
                  disabled={!user || busy}
                  onClick={() =>
                    run(async () => {
                      const { data, error } = await requireCloud()
                        .from("atlas_workspaces")
                        .select("payload,updated_at")
                        .eq("user_id", user!.id)
                        .single();
                      if (error) throw error;
                      download("atlas-cloud-backup.json", {
                        version: 2,
                        created: data.updated_at,
                        data: data.payload,
                      });
                      setMessage("Cloud backup downloaded.");
                    })
                  }
                >
                  Download cloud backup
                </button>
              </div>
            </Panel>
          </div>
          {user && (
            <Panel title="Publish a personal build">
              <p className="hint">
                Publishing makes the selected build—including its notes and
                gear—public. Review its contents first.
              </p>
              <div className="actions">
                <select
                  aria-label="Build to publish"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">Choose a saved build</option>
                  {saved.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busy || !selected || !author.trim()}
                  onClick={() =>
                    run(async () => {
                      const b = saved.find((b) => b.id === selected);
                      if (!b) throw new Error("Choose a saved build.");
                      const { error } = await requireCloud()
                        .from("atlas_builds")
                        .insert({
                          user_id: user.id,
                          title: b.title,
                          author: author.trim(),
                          payload: b,
                          published: true,
                        });
                      if (error) throw error;
                      await refresh();
                      setMessage("Build published to the community.");
                    })
                  }
                >
                  Publish publicly
                </button>
              </div>
            </Panel>
          )}
          <Panel title="Community builds">
            <button disabled={busy} onClick={() => run(refresh)}>
              Refresh community
            </button>
            {!items.length ? (
              <Empty title="No public builds yet">
                Published builds appear here when the backend is connected.
              </Empty>
            ) : (
              items.map((b) => (
                <div className="saved-row" key={b.id}>
                  <span>
                    {b.title}
                    <small>
                      By {b.author} ·{" "}
                      {new Date(b.created_at).toLocaleDateString()}
                    </small>
                  </span>
                  <button
                    onClick={() =>
                      run(async () => {
                        const copy = parseBuild(b.payload);
                        setSaved([...saved, copy]);
                        setMessage(
                          "A personal copy was added to your build library.",
                        );
                      })
                    }
                  >
                    Fork to library
                  </button>
                  <button onClick={() => run(() => discussion(b))}>
                    Discussion
                  </button>
                  {(user?.id === b.user_id || admin) && (
                    <button
                      onClick={() =>
                        run(async () => {
                          const { error } = await requireCloud()
                            .from("atlas_builds")
                            .delete()
                            .eq("id", b.id);
                          if (error) throw error;
                          setActive(null);
                          await refresh();
                          setMessage("Public build removed.");
                        })
                      }
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              ))
            )}
          </Panel>
          {active && (
            <Panel title={`Discussion · ${active.title}`}>
              <button
                disabled={!user || busy}
                onClick={() =>
                  run(async () => {
                    const db = requireCloud();
                    const query = likes.includes(user!.id)
                      ? db
                          .from("atlas_likes")
                          .delete()
                          .eq("build_id", active.id)
                          .eq("user_id", user!.id)
                      : db
                          .from("atlas_likes")
                          .insert({ build_id: active.id, user_id: user!.id });
                    const { error } = await query;
                    if (error) throw error;
                    await discussion(active);
                  })
                }
              >
                {likes.includes(user?.id || "") ? "Unlike" : "Like"} ·{" "}
                {likes.length}
              </button>
              {comments.map((c) => (
                <div className="saved-row" key={c.id}>
                  <span>
                    {c.body}
                    <small>{c.author}</small>
                  </span>
                  {(c.user_id === user?.id || admin) && (
                    <button
                      onClick={() =>
                        run(async () => {
                          const { error } = await requireCloud()
                            .from("atlas_comments")
                            .delete()
                            .eq("id", c.id);
                          if (error) throw error;
                          await discussion(active);
                        })
                      }
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
              {user && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const { error } = await requireCloud()
                        .from("atlas_comments")
                        .insert({
                          build_id: active.id,
                          user_id: user.id,
                          author: author.trim() || "Exile",
                          body: comment.trim(),
                        });
                      if (error) throw error;
                      setComment("");
                      await discussion(active);
                    });
                  }}
                >
                  <label className="field">
                    Comment
                    <textarea
                      required
                      maxLength={2000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </label>
                  <button disabled={busy || !comment.trim()}>
                    Post comment
                  </button>
                </form>
              )}
            </Panel>
          )}
        </>
      )}
      <div className="toast" role="status">
        {message}
      </div>
    </>
  );
}
