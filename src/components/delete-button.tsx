"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ActionResult = { error?: string } | void | unknown;

function isNextNavigationError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const digest =
    "digest" in err && err.digest != null ? String(err.digest) : "";
  const message = err instanceof Error ? err.message : "";
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    message.includes("NEXT_REDIRECT") ||
    message.includes("NEXT_NOT_FOUND")
  );
}

export function DeleteButton({
  action,
  id,
  confirmMessage,
  successHref,
  label = "حذف",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  id: string;
  confirmMessage: string;
  successHref?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="font-medium text-danger hover:underline disabled:opacity-50"
        onClick={() => {
          if (!window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const formData = new FormData();
            formData.set("id", id);
            try {
              const result = await action(formData);
              if (
                result &&
                typeof result === "object" &&
                "error" in result &&
                result.error
              ) {
                const message = String(result.error);
                setError(message);
                window.alert(message);
                return;
              }
              if (successHref) router.push(successHref);
              router.refresh();
            } catch (err) {
              if (isNextNavigationError(err)) throw err;
              const message =
                err instanceof Error ? err.message : "تعذر حذف البيانات";
              setError(message);
              window.alert(message);
            }
          });
        }}
      >
        {pending ? "جارٍ الحذف..." : label}
      </button>
      {error ? (
        <p className="max-w-[16rem] text-xs leading-5 text-danger">{error}</p>
      ) : null}
    </div>
  );
}
