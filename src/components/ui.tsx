import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-paper/95 p-5 shadow-sm shadow-fuchsia-100/50 backdrop-blur ${className}`}
    >
      {children}
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-ink">{children}</label>
  );
}

const fieldClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} min-h-24 ${props.className ?? ""}`}
    />
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary:
      "bg-rose text-white shadow-md shadow-rose/25 hover:bg-rose-dark",
    secondary: "bg-white text-ink border border-line hover:bg-cream",
    danger:
      "bg-white text-danger border border-danger/30 hover:bg-danger/5",
    ghost: "bg-transparent text-muted hover:text-ink",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "rose" | "gold";
}) {
  const styles = {
    neutral: "bg-cream text-muted",
    ok: "bg-ok/10 text-ok",
    warn: "bg-warn/10 text-warn",
    rose: "bg-rose/10 text-rose",
    gold: "bg-gold/15 text-gold",
  }[tone];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="font-medium text-rose hover:text-rose-dark">
      تعديل
    </Link>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 whitespace-nowrap">
      {children}
    </div>
  );
}
