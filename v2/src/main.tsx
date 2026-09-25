import React, { lazy, Suspense, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  BookOpen,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  Menu,
  X,
  Users,
} from "lucide-react";
import { parseBoard } from "./engine/temple";
import { useTemple } from "./store/temple";
import { readStorage } from "./lib/storage";
import "./styles.css";
const Home = lazy(() => import("./pages/Home")),
  Temple = lazy(() => import("./pages/Temple")),
  Builds = lazy(() => import("./pages/Builds")),
  Economy = lazy(() => import("./pages/Economy")),
  Preferences = lazy(() => import("./pages/Settings"));
const Community = lazy(() => import("./pages/Community"));
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = `${import.meta.env.BASE_URL}room-art.css`;
document.head.append(link);
document.documentElement.dataset.reducedMotion = String(
  readStorage("atlas-reduced-motion", false),
);
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="error-page">
        <h1>Atlas couldn't open this view.</h1>
        <p>{this.state.error}</p>
        <button onClick={() => location.reload()}>Reload workspace</button>
        <p>Your saved data has not been cleared.</p>
      </main>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [open, setOpen] = useState(false);
  const locationState = useLocation();
  const [shared, setShared] = useState(() =>
    new URLSearchParams(location.search).get("temple"),
  );
  const [error, setError] = useState("");
  const navigation = [
    { to: "/", label: "Overview", Icon: LayoutDashboard },
    { to: "/temple", label: "Temple planner", Icon: Compass },
    { to: "/builds", label: "Build library", Icon: BookOpen },
    { to: "/economy", label: "Expedition ledger", Icon: ChartNoAxesCombined },
    { to: "/community", label: "Account & community", Icon: Users },
  ];
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-mark">A</span>
          <span>
            ATLAS<small>POE 2 BUILD NEXUS</small>
          </span>
        </Link>
        <button
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">A BETTER NEXT RUN</span>
          <p>
            Explore the possibilities.
            <br />
            Build with intention.
          </p>
          <div className="sidebar-rule" />
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/settings" onClick={() => setOpen(false)}>
            <Settings size={18} />
            Settings & data
          </NavLink>
          <a href="../index.html">
            Legacy planner
            <ArrowUpRight size={16} />
          </a>
          <small>
            V2 ALPHA <span>LOCAL WORKSPACE</span>
          </small>
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span>
            THE EXILE'S WORKSPACE <span className="topbar-slash">/</span>{" "}
            <b>
              {navigation.find((n) => n.to === locationState.pathname)?.label ||
                "Settings"}
            </b>
          </span>
          <a
            href="https://github.com/Dolofonos1997/poe2-build-nexus"
            target="_blank"
            rel="noreferrer"
          >
            Project source <ArrowUpRight size={14} />
          </a>
        </header>
        <main id="main">
          {shared && (
            <div className="share-banner">
              <div>
                <strong>A shared temple is ready to import</strong>
                <p>Your current board stays available through Undo.</p>
                {error && <p role="alert">{error}</p>}
              </div>
              <button
                onClick={() => {
                  try {
                    if (shared.length > 50000)
                      throw new Error("This shared layout is too large.");
                    useTemple
                      .getState()
                      .load(parseBoard(JSON.parse(atob(shared))));
                    setShared(null);
                    history.replaceState(
                      null,
                      "",
                      location.pathname + location.hash,
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Import shared temple
              </button>
              <button
                onClick={() => {
                  setShared(null);
                  history.replaceState(
                    null,
                    "",
                    location.pathname + location.hash,
                  );
                }}
              >
                Dismiss
              </button>
            </div>
          )}
          <Suspense
            fallback={<div className="loading">Opening your workspace…</div>}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/temple" element={<Temple />} />
              <Route path="/builds" element={<Builds />} />
              <Route path="/economy" element={<Economy />} />
              <Route path="/community" element={<Community />} />
              <Route path="/settings" element={<Preferences />} />
              <Route
                path="*"
                element={
                  <div>
                    <h1>Page not found</h1>
                    <Link to="/">Return to overview</Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
          <footer className="footer">
            <span>
              ATLAS <span>·</span> Made for the next expedition.
            </span>
            <span>
              Community project · Not affiliated with Grinding Gear Games
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {}),
  );
}
