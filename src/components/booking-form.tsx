"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBooking,
  listExpertsForService,
  listSlots,
} from "@/actions/bookings";
import { searchBlacklist } from "@/actions/blacklist";
import { BlacklistAlert, BlacklistMatches } from "@/components/blacklist-alert";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import {
  blacklistVerdict,
  type BlacklistLookup,
} from "@/lib/blacklist";
import { formatMoney } from "@/lib/money";

export type ExpertOption = {
  id: string;
  name: string;
  price: number;
  commissionPercent: number;
  roomName: string;
  serviceId: string;
  serviceName: string;
};

export type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
};

export function BookingForm({
  experts,
  services,
}: {
  experts: ExpertOption[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"expert" | "service">("expert");
  const [expertId, setExpertId] = useState(experts[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Tripoli" }),
  );
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [serviceExperts, setServiceExperts] = useState<
    Awaited<ReturnType<typeof listExpertsForService>>
  >([]);
  const [isGift, setIsGift] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [blacklist, setBlacklist] = useState<BlacklistLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedExpert = useMemo(
    () => experts.find((e) => e.id === expertId),
    [experts, expertId],
  );

  useEffect(() => {
    if (mode !== "expert" || !expertId || !date) return;
    let cancelled = false;
    listSlots(expertId, date).then((next) => {
      if (!cancelled) {
        setSlots(next);
        setTime(next[0] ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, expertId, date]);

  useEffect(() => {
    if (mode !== "service" || !serviceId || !date) return;
    let cancelled = false;
    listExpertsForService(serviceId, date).then((next) => {
      if (!cancelled) {
        setServiceExperts(next);
        const first = next[0];
        setExpertId(first?.id ?? "");
        setSlots(first?.slots ?? []);
        setTime(first?.slots[0] ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode, serviceId, date]);

  useEffect(() => {
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (name.length < 2 && phone.replace(/\D/g, "").length < 8) {
      setBlacklist(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchBlacklist(name, phone).then((next) => {
        if (!cancelled) setBlacklist(next);
      });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerName, customerPhone]);

  const displayExpert =
    mode === "service"
      ? serviceExperts.find((e) => e.id === expertId)
      : selectedExpert;

  const verdict = blacklist
    ? blacklistVerdict(blacklist, expertId)
    : null;
  const blocked = Boolean(verdict?.blocked);

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        const formData = new FormData(event.currentTarget);
        formData.set("expertId", expertId);
        formData.set("date", date);
        formData.set("time", time);
        if (isGift) formData.set("isGift", "on");
        try {
          const result = await createBooking(formData);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          if ("id" in result) router.push(`/bookings/${result.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "تعذر إنشاء الحجز");
        } finally {
          setPending(false);
        }
      }}
    >
      <Card>
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("expert")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${mode === "expert" ? "bg-rose text-white shadow-sm shadow-rose/30" : "bg-cream text-muted border border-line"}`}
          >
            خبيرة محددة
          </button>
          <button
            type="button"
            onClick={() => setMode("service")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${mode === "service" ? "bg-rose text-white shadow-sm shadow-rose/30" : "bg-cream text-muted border border-line"}`}
          >
            حسب الخدمة
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم العميلة">
            <Input
              name="customerName"
              required
              placeholder="مثال: منى"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </Field>
          <Field label="رقم الهاتف">
            <Input
              name="customerPhone"
              required
              placeholder="0910000000"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </Field>

          {mode === "expert" ? (
            <Field label="الخبيرة">
              <Select
                value={expertId}
                onChange={(e) => setExpertId(e.target.value)}
              >
                {experts.map((expert) => {
                  const listed = blacklist?.blockedExperts.some(
                    (item) => item.id === expert.id,
                  );
                  return (
                    <option key={expert.id} value={expert.id}>
                      {expert.name} — {expert.serviceName} — {expert.roomName}
                      {listed ? " — في قائمتها السوداء" : ""}
                    </option>
                  );
                })}
              </Select>
            </Field>
          ) : (
            <Field label="الخدمة">
              <Select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.durationMinutes} دقيقة)
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="التاريخ">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>

          {mode === "service" ? (
            <Field label="الخبيرة المتاحة">
              <Select
                value={expertId}
                onChange={(e) => {
                  const next = e.target.value;
                  setExpertId(next);
                  const found = serviceExperts.find((x) => x.id === next);
                  setSlots(found?.slots ?? []);
                  setTime(found?.slots[0] ?? "");
                }}
              >
                {serviceExperts.length === 0 ? (
                  <option value="">لا توجد خبيرة متاحة في هذا اليوم</option>
                ) : (
                  serviceExperts.map((expert) => {
                    const listed = blacklist?.blockedExperts.some(
                      (item) => item.id === expert.id,
                    );
                    return (
                      <option key={expert.id} value={expert.id}>
                        {expert.name} — {formatMoney(expert.price)} —{" "}
                        {expert.roomName}
                        {listed ? " — في قائمتها السوداء" : ""}
                      </option>
                    );
                  })
                )}
              </Select>
            </Field>
          ) : null}

          <Field label="الوقت المتاح">
            <Select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            >
              {slots.length === 0 ? (
                <option value="">لا توجد أوقات متاحة</option>
              ) : (
                slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))
              )}
            </Select>
          </Field>
        </div>

        {verdict ? (
          <div className="mt-5">
            <BlacklistAlert verdict={verdict} />
            {blacklist ? <BlacklistMatches lookup={blacklist} /> : null}
          </div>
        ) : null}

        <label className="mt-5 flex items-start gap-3 rounded-xl bg-cream px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => setIsGift(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium">هدية من الخبيرة</span>
            <span className="mt-0.5 block text-muted">
              قيمة الخدمة تصبح 0 د.ل وتُسجَّل في تقرير الخبيرة حتى لا تُعد خطأً
              أو إيرادًا مفقودًا.
            </span>
          </span>
        </label>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-muted">ملخص الحجز</h2>
        {displayExpert ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">الخبيرة</dt>
              <dd>{displayExpert.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">التخصص</dt>
              <dd>
                {"serviceName" in displayExpert
                  ? displayExpert.serviceName
                  : selectedExpert?.serviceName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">الغرفة</dt>
              <dd>
                {"roomName" in displayExpert
                  ? displayExpert.roomName
                  : selectedExpert?.roomName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">سعر الخبيرة</dt>
              <dd>{formatMoney(displayExpert.price)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt>المبلغ المطلوب</dt>
              <dd className="font-semibold">
                {isGift ? formatMoney(0) : formatMoney(displayExpert.price)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted">اختاري خبيرة لعرض السعر.</p>
        )}
        <Button className="mt-6 w-full" disabled={pending || !time || blocked} type="submit">
          {pending
            ? "جاري الحفظ..."
            : blocked
              ? "الحجز ممنوع لهذه العميلة"
              : "تأكيد الحجز"}
        </Button>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>
    </form>
  );
}
