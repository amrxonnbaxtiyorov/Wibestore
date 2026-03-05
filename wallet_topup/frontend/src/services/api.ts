const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export type PaymentMethod = { code: string; display_name: string; card_number?: string };

export async function getPaymentMethods(currency: string): Promise<PaymentMethod[]> {
  const res = await fetch(`${API_BASE}/api/v1/payment-methods?currency=${encodeURIComponent(currency)}`);
  if (!res.ok) throw new Error("Failed to load payment methods");
  const json = await res.json();
  if (!json.success || !json.data) throw new Error("Invalid response");
  return json.data;
}

function parseErrorMessage(json: Record<string, unknown>, fallback: string): string {
  const detail = json?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const msg = (detail as Record<string, unknown>).message;
    if (typeof msg === "string") return msg;
  }
  if (typeof detail === "string") return detail;
  const err = json?.error;
  if (err && typeof err === "object" && !Array.isArray(err)) {
    const msg = (err as Record<string, unknown>).message;
    if (typeof msg === "string") return msg;
  }
  return fallback;
}

export async function submitTopUp(
  initData: string,
  currency: string,
  paymentMethod: string,
  amount: number,
  receiptFile: File
): Promise<{ transaction_uid: string; status: string }> {
  const form = new FormData();
  form.append("initData", initData);
  form.append("currency", currency);
  form.append("payment_method", paymentMethod);
  form.append("amount", String(amount));
  form.append("receipt", receiptFile);

  const res = await fetch(`${API_BASE}/api/v1/submit`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(parseErrorMessage(json, "Submission failed"));
  }
  if (!json.success || !json.data) throw new Error("Invalid response");
  return json.data;
}

export async function getUserBalance(): Promise<{ telegram_id: number; username: string | null; wallet_balance: string }> {
  const initData = window.Telegram?.WebApp?.initData;
  const res = await fetch(`${API_BASE}/api/v1/users/me`, {
    headers: initData ? { "X-Telegram-Init-Data": initData } : {},
  });
  const json = await res.json();
  if (!res.ok) throw new Error(parseErrorMessage(json, "Failed to fetch balance"));
  if (!json.success || !json.data) throw new Error("Invalid response");
  return json.data;
}
