import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Compass,
  BookOpen,
  ChartNoAxesCombined,
} from "lucide-react";
import { useTemple } from "../store/temple";
import { useLocal } from "../lib/storage";
import { Metric, Panel, RoomIcon } from "../components/UI";
import type { Build } from "../lib/builds";
import type { Run } from "./Economy";
export default function Home() {
  const board = useTemple((s) => s.board);
  const [builds] = useLocal<Build[]>("atlas-builds", []),
    [runs] = useLocal<Run[]>("atlas-runs", []);
  return (
    <>
      <div className="home-heading">
        <span className="eyebrow">POE 2 BUILD NEXUS / ATLAS</span>
        <span className="release-tag">V2 · DEVELOPMENT PREVIEW</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">MAKE EVERY EXPEDITION COUNT</span>
          <h1>
            Great temples
            <br />
            begin with a <em>plan.</em>
          </h1>
          <p>
            A quieter place to plan your next run. Connect your temple, refine
            your build, and keep track of what matters.
          </p>
          <div className="actions">
            <Link className="button primary" to="/temple">
              Enter the planner <ArrowUpRight size={18} />
            </Link>
            <Link className="button ghost" to="/builds">
              Explore builds
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="status-dot">Local-first workspace</span>
            <span>No account needed</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="artifact">
            <div className="artifact-inner">A</div>
          </div>
          <div className="star-point p1" />
          <div className="star-point p2" />
          <div className="star-point p3" />
          <span className="art-label">
            THE VAAL ARCHIVES
            <br />
            <b>IX · LXXVI · IV</b>
          </span>
        </div>
      </section>
      <div className="metrics">
        <Metric
          label="YOUR TEMPLE"
          value={`${board.filter(Boolean).length} rooms`}
          detail="Continue where you left off"
        />
        <Metric
          label="PERSONAL BUILDS"
          value={builds.length}
          detail="Saved on this device"
        />
        <Metric
          label="RECORDED RUNS"
          value={runs.length}
          detail="Your expedition history"
        />
        <Metric
          label="NET RETURNS"
          value={`${runs.reduce((s, r) => s + r.revenue - r.cost, 0).toLocaleString()} ex`}
          detail="From your recorded runs"
        />
      </div>
      <div className="section-heading">
        <h2>Your field tools</h2>
        <span>Plan. Refine. Return.</span>
      </div>
      <div className="tool-grid">
        {[
          {
            to: "/temple",
            Icon: Compass,
            title: "Temple planner",
            desc: "Shape the 9 × 9 board. Explore compatible rooms and find your next move.",
            tag: "ROOMS & CONNECTIONS",
          },
          {
            to: "/builds",
            Icon: BookOpen,
            title: "Build library",
            desc: "Keep your gear, skill groups, passive allocations, and progression in one place.",
            tag: "CHARACTER PLANNING",
          },
          {
            to: "/economy",
            Icon: ChartNoAxesCombined,
            title: "Expedition ledger",
            desc: "Turn recorded runs into a clear picture of costs, returns, and efficiency.",
            tag: "ECONOMY & HISTORY",
          },
        ].map(({ to, Icon, title, desc, tag }) => (
          <Link className="tool-card" key={to} to={to}>
            <div className="tool-card-top">
              <Icon size={25} />
              <ArrowUpRight size={19} />
            </div>
            <small>{tag}</small>
            <h2>{title}</h2>
            <p>{desc}</p>
          </Link>
        ))}
      </div>
      <div className="two-col home-bottom">
        <Panel>
          <div className="panel-top">
            <h2>A familiar temple, rebuilt</h2>
            <Link to="/temple">Open planner ↗</Link>
          </div>
          <div className="icon-parade">
            {(
              [
                "gen",
                "smithy",
                "garrison",
                "spy",
                "thaum",
                "architect",
                "royal",
              ] as const
            ).map((k) => (
              <div key={k}>
                <RoomIcon kind={k} />
              </div>
            ))}
          </div>
          <p className="muted">
            Original room artwork from your existing planner, bundled locally. A
            dedicated room library, persistent layouts, and readable
            connections.
          </p>
        </Panel>
        <Panel title="About this preview">
          <p className="muted">
            Atlas is the new React workspace. The existing V24.6 site stays
            available while advanced mechanics and online services are migrated.
          </p>
          <a className="text-link" href="../index.html">
            Open the full legacy planner ↗
          </a>
          <p className="hint">
            Recommendations use planning heuristics. Example builds and
            inherited room rules are labeled. The official GGG tree loads on
            demand; live prices require a backend feed.
          </p>
        </Panel>
      </div>
    </>
  );
}
