const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Match types ───────────────────────────────────────────────────────────────

export interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string;
  price_usd: number;
  is_published: boolean;
}

export interface PredictionReport {
  match_id: number;
  home_team: string;
  away_team: string;
  xg_home: number;
  xg_away: number;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  prob_over_25: number;
  prob_under_25: number;
  prob_over_35: number;
  asian_handicap: Record<string, number>;
  prob_extra_time: number;
  prob_penalties: number;
  prob_btts: number;
  corners?: { home?: number; away?: number; total?: number; home_pred?: number; away_pred?: number } | null;
  cards?: { home?: number; away?: number; total?: number; home_pred?: number; away_pred?: number } | null;
  value_bets: Array<{
    outcome: string;
    market: string;
    edge: number;
    decimal_odd: number;
    our_prob: number;
  }>;
}

export interface PaymentSubmitPayload {
  match_id: number;
  op_number: string;
  method: "yape" | "plin";
  email: string;
}

export interface PaymentResponse {
  token?: string;
  expires_at?: string;
  status: string;
  message?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getMatches = (): Promise<Match[]> =>
  apiFetch<Match[]>("/matches/");

export const getMatchPreview = (id: number): Promise<Match> =>
  apiFetch<Match>(`/matches/${id}/preview`);

export const submitPayment = (
  data: PaymentSubmitPayload
): Promise<PaymentResponse> =>
  apiFetch<PaymentResponse>("/payments/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const verifyPayment = (op_number: string): Promise<PaymentResponse> =>
  apiFetch<PaymentResponse>("/payments/verify", {
    method: "POST",
    body: JSON.stringify({ op_number }),
  });

export const getReport = (
  match_id: number,
  token: string
): Promise<PredictionReport> =>
  apiFetch<PredictionReport>(`/predictions/${match_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ── Admin types ───────────────────────────────────────────────────────────────

export interface AdminPayment {
  id: number;
  op_number: string;
  method: string;
  amount: number;
  status: "pending" | "verified" | "rejected";
  created_at: string;
  email: string | null;
  match_name: string | null;
}

export interface AdminDashboard {
  total_pagos: number;
  pagos_pendientes: number;
  pagos_verificados: number;
  ingresos_total_usd: number;
}

// ── Admin API calls (via Next.js proxy /api/admin/* to avoid CORS) ───────────

async function adminFetch<T>(path: string, apiKey: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: { "x-admin-key": apiKey, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const getAdminDashboard = (apiKey: string): Promise<AdminDashboard> =>
  adminFetch<AdminDashboard>("dashboard", apiKey);

export const getAdminPayments = (apiKey: string): Promise<AdminPayment[]> =>
  adminFetch<AdminPayment[]>("payments", apiKey);

export const adminVerifyPayment = (payment_id: number, apiKey: string) =>
  adminFetch<{ status: string; token: string }>(`payments/${payment_id}/verify`, apiKey, { method: "POST" });

export const adminRejectPayment = (payment_id: number, apiKey: string) =>
  adminFetch<{ status: string }>(`payments/${payment_id}/reject`, apiKey, { method: "POST" });
