import type { Member } from "@/lib/types";
export function Avatar({ member }: { member: Member }) {
  return (
    <span className="avatar" style={{ background: member.color }} aria-hidden="true">
      {member.name.slice(0, 1)}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
