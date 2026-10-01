import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { labels, ROLES, type Role } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/", label: "الرئيسية", roles: [ROLES.MANAGER, ROLES.RECEPTION] },
  {
    href: "/month",
    label: "مواعيد الشهر",
    roles: [ROLES.MANAGER, ROLES.RECEPTION],
  },
  {
    href: "/bookings",
    label: "الحجوزات",
    roles: [ROLES.MANAGER, ROLES.RECEPTION],
  },
  {
    href: "/bookings/new",
    label: "حجز جديد",
    roles: [ROLES.MANAGER, ROLES.RECEPTION],
  },
  {
    href: "/customers",
    label: "العميلات",
    roles: [ROLES.MANAGER, ROLES.RECEPTION],
  },
  {
    href: "/blacklist",
    label: "القائمة السوداء",
    roles: [ROLES.MANAGER, ROLES.RECEPTION],
  },
  { href: "/rooms", label: "الغرف", roles: [ROLES.MANAGER] },
  { href: "/services", label: "الخدمات", roles: [ROLES.MANAGER] },
  { href: "/experts", label: "الخبيرات", roles: [ROLES.MANAGER] },
  { href: "/settlement", label: "التسوية اليومية", roles: [ROLES.MANAGER] },
  { href: "/day-close", label: "إغلاق اليوم", roles: [ROLES.MANAGER] },
  { href: "/users", label: "المستخدمون", roles: [ROLES.MANAGER] },
  { href: "/audit", label: "سجل العمليات", roles: [ROLES.MANAGER] },
  { href: "/backup", label: "النسخ الاحتياطي", roles: [ROLES.MANAGER] },
  { href: "/appointments", label: "مواعيدي", roles: [ROLES.EXPERT] },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const items = nav.filter((item) =>
    (item.roles as readonly Role[]).includes(user.role),
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sidebar-gradient text-white lg:flex lg:w-64 lg:flex-col lg:border-l lg:border-white/20 lg:shadow-xl">
        <div className="px-4 py-5">
          <BrandLogo size="md" />
          <p className="mt-3 text-center font-script text-3xl leading-none text-white">
            Glowy
          </p>
          <p className="mt-1 text-center text-[10px] tracking-[0.28em] text-fuchsia-100">
            CLINIC & BEAUTY
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-xl px-3 py-2 text-sm text-white/90 transition hover:bg-white/15 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-white/20 px-5 py-4 lg:block">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-fuchsia-100">{labels.role[user.role]}</p>
          <form action={logoutAction} className="mt-3">
            <button
              className="text-sm text-white/75 transition hover:text-white"
              type="submit"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <p className="text-xs text-muted">
              {user.name} · {labels.role[user.role]}
            </p>
          </div>
          <form action={logoutAction}>
            <button className="text-sm font-medium text-rose" type="submit">
              خروج
            </button>
          </form>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
