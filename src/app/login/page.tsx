import { loginAction } from "@/actions/auth";
import { BrandLogo } from "@/components/brand-logo";

const accounts = [
  ["admin", "مدير"],
  ["reception", "استقبال"],
  ["sara", "خبيرة مكياج"],
  ["noor", "خبيرة مكياج"],
  ["reem", "خبيرة شعر"],
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error === "empty"
      ? "أدخلي اسم الدخول وكلمة المرور"
      : error === "invalid"
        ? "بيانات الدخول غير صحيحة"
        : null;

  return (
    <div className="login-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <BrandLogo size="hero" />
        <p className="mt-3 text-center font-script text-4xl leading-none text-rose">
          Glowy
        </p>
        <p className="mt-1 text-center text-sm font-medium text-muted">
          نظام الإدارة الداخلي
        </p>

        <form
          action={loginAction}
          className="mt-8 space-y-4 rounded-2xl border border-line bg-paper/95 p-6 shadow-lg shadow-fuchsia-100/60 backdrop-blur"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              اسم الدخول
            </label>
            <input
              name="username"
              autoComplete="username"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              كلمة المرور
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-rose py-2.5 font-medium text-white shadow-md shadow-rose/30 transition hover:bg-rose-dark"
          >
            دخول
          </button>
        </form>

        {process.env.NODE_ENV !== "production" ? (
          <div className="mt-6 rounded-2xl border border-line bg-paper/80 p-5 text-sm text-muted backdrop-blur">
            <p className="font-medium text-ink">
              حسابات التجريب · كلمة المرور 123456
            </p>
            <ul className="mt-3 space-y-1">
              {accounts.map(([user, role]) => (
                <li key={user}>
                  <span className="font-medium text-gold">{user}</span> — {role}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-muted">
            استخدمي حساب المديرة من إعدادات الاستضافة (ADMIN_USERNAME /
            ADMIN_PASSWORD).
          </p>
        )}
      </div>
    </div>
  );
}
