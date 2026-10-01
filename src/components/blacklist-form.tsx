"use client";

import { addBlacklistEntry } from "@/actions/blacklist";
import { ActionForm } from "@/components/action-form";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { BLACKLIST_SCOPE, labels } from "@/lib/constants";
import { useState } from "react";

export function BlacklistForm({
  customers,
  experts,
  selectedCustomerId,
}: {
  customers: { id: string; name: string; phone: string }[];
  experts: { id: string; name: string }[];
  selectedCustomerId?: string;
}) {
  const [scope, setScope] = useState<string>(BLACKLIST_SCOPE.CENTER);

  return (
    <ActionForm action={addBlacklistEntry} className="grid gap-3">
      <Field label="العميلة">
        <Select name="customerId" required defaultValue={selectedCustomerId ?? ""}>
          <option value="">اختاري عميلة مسجّلة</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} — {customer.phone}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="نوع المنع">
        <Select
          name="scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value={BLACKLIST_SCOPE.CENTER}>
            {labels.blacklistScope.CENTER}
          </option>
          <option value={BLACKLIST_SCOPE.EXPERT}>
            {labels.blacklistScope.EXPERT}
          </option>
        </Select>
      </Field>
      {scope === BLACKLIST_SCOPE.EXPERT ? (
        <Field label="الخبيرة التي ترفض التعامل">
          <Select name="expertId" required>
            <option value="">اختاري الخبيرة</option>
            {experts.map((expert) => (
              <option key={expert.id} value={expert.id}>
                {expert.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label="السبب (اختياري)">
        <Textarea
          name="reason"
          placeholder="سوء معاملة، مشاكل سابقة، عدم الالتزام..."
        />
      </Field>
      <Button type="submit">إضافة للقائمة السوداء</Button>
    </ActionForm>
  );
}
