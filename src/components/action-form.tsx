"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

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

export function ActionForm({
  action,
  children,
  className,
  successHref,
  onSuccess,
  refreshOnSuccess = true,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  successHref?: string;
  onSuccess?: (result: ActionResult) => void | Promise<void>;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={className}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(formData);
            if (
              result &&
              typeof result === "object" &&
              "error" in result &&
              result.error
            ) {
              setError(String(result.error));
              return;
            }
            await onSuccess?.(result);
            if (successHref) {
              router.push(successHref);
            }
            if (refreshOnSuccess) {
              router.refresh();
            }
          } catch (err) {
            if (isNextNavigationError(err)) throw err;
            setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {error ? (
        <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
