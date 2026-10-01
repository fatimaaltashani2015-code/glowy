export const ROLES = {
  MANAGER: "MANAGER",
  RECEPTION: "RECEPTION",
  EXPERT: "EXPERT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PAYMENT_METHODS = {
  CASH: "CASH",
  CARD: "CARD",
  TRANSFER: "TRANSFER",
} as const;

export const PAYMENT_TYPES = {
  DEPOSIT: "DEPOSIT",
  FULL: "FULL",
  REMAINDER: "REMAINDER",
} as const;

export const REFUND_REASONS = {
  EXPERT_APOLOGY: "EXPERT_APOLOGY",
  FORCE_MAJEURE: "FORCE_MAJEURE",
} as const;

export const BOOKING_STATUS = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const ATTENDANCE = {
  PENDING: "PENDING",
  ATTENDED: "ATTENDED",
  NO_SHOW: "NO_SHOW",
} as const;

export const BLACKLIST_SCOPE = {
  CENTER: "CENTER",
  EXPERT: "EXPERT",
} as const;

export const TIMEZONE = "Africa/Tripoli";
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 21;
export const SLOT_STEP_MINUTES = 30;

export const labels = {
  role: {
    MANAGER: "مدير",
    RECEPTION: "استقبال",
    EXPERT: "خبيرة",
  },
  method: {
    CASH: "نقدي",
    CARD: "بطاقة",
    TRANSFER: "تحويل مصرفي",
  },
  paymentType: {
    DEPOSIT: "عربون",
    FULL: "دفع كامل",
    REMAINDER: "دفعة لاحقة",
  },
  refundReason: {
    EXPERT_APOLOGY: "اعتذار الخبيرة",
    FORCE_MAJEURE: "ظرف قهري",
  },
  status: {
    SCHEDULED: "مؤكد",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
  },
  attendance: {
    PENDING: "لم يُسجَّل",
    ATTENDED: "حضرت",
    NO_SHOW: "لم تحضر",
  },
  blacklistScope: {
    CENTER: "المركز بالكامل",
    EXPERT: "خبيرة معيّنة",
  },
} as const;
