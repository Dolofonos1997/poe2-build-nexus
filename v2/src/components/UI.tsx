import type { ReactNode } from "react";
import { rooms, type RoomKey } from "../engine/temple";
export function RoomIcon({ kind }: { kind: RoomKey }) {
  return kind === "path" ? (
    <span className="path-icon" aria-hidden="true">
      ◇
    </span>
  ) : (
    <span
      role="img"
      aria-label={rooms[kind].n}
      className={`room-art icon-${kind}`}
    />
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="actions">{children}</div>}
    </header>
  );
}
export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">◇</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
