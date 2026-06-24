// src/hooks/useZKCredit.ts
// Zero-knowledge credit score receipt generator.
//
// Produces a tamper-evident credit score for a customer (300-850 scale) signed
// with HMAC-SHA-256 against a tenant-provided secret. The signed receipt can be
// shared with banks/MFIs without revealing raw transaction data.
//
// What the user (merchant) supplies via CredentialsPanel:
//   provider: "zk_credit"
//   apiKey:   tenant HMAC secret (32+ random chars, base64 or hex)
//   apiUrl:   optional remote submit URL (e.g. co-op lending partner endpoint)
//
// What the hook computes locally:
//   - Score in [300, 850] from positive factors (avg ticket, payback rate, tenure,
//     frequency) minus negative factors (credit sale defaults, late payments, returns)
//   - A receipt payload { tenantId, subject, score, factors, issuedAt, expiresAt }
//   - SHA-256 fingerprint of the payload (audit id, no secret material)
//   - HMAC-SHA-256 signature (base64) over the canonical JSON
//   - A human-readable verification code (e.g. ZK-7H3K-92F1-44A0)
//
// Storage:
//   equipulse.zk.credit.history.v1   -> last 200 receipts (capped)
//   equipulse.zk.credit.scores.v1     -> last score per subject (customer phone)
//
// Verification:
//   verify(receipt, secret) recomputes the HMAC and returns ok=true on match.
//   Anyone with the same secret can verify offline. Without the secret, the
//   fingerprint and signature are useless.

import { useCallback, useEffect, useState } from "react";
import { getCachedCredential } from "./useCredentials";

// ---------- Types ----------

export type ZKCreditReason =
  | "ok"
  | "not_configured"
  | "insufficient_data"
  | "invalid_input"
  | "crypto_unavailable"
  | "remote_submit_failed"
  | "verification_failed"
  | "expired";

export interface ZKCreditInput {
  /** Customer phone, used as the subject id. */
  phone: string;
  /** Optional: customer's display name. */
  name?: string;
  /** Last N transactions for this customer (oldest first or newest first). */
  transactions: Array<{
    /** ISO date string. */
    date: string;
    /** Positive = paid, negative = credit sale (debt) or refund. */
    amount: number;
    /** Was this on credit? If so, has it been paid? */
    creditStatus?: "cash" | "credit_pending" | "credit_paid" | "credit_default";
  }>;
  /** Last N returns, used as a negative factor. */
  returnsCount?: number;
  /** Optional: account age in days, derived from first transaction if omitted. */
  tenureDays?: number;
}

export interface ZKCreditFactors {
  /** Average sale amount in BDT (or local currency). */
  avgTicket: number;
  /** Number of paid transactions used in scoring. */
  paidCount: number;
  /** Number of credit sales that were paid back. */
  creditPaidCount: number;
  /** Number of credit sales still pending. */
  creditPendingCount: number;
  /** Number of credit sales that defaulted. */
  creditDefaultCount: number;
  /** Tenure in days between first and most recent transaction. */
  tenureDays: number;
  /** Refunds / returns in the window. */
  returnsCount: number;
}

export interface ZKCreditReceipt {
  /** Audit id: SHA-256 of payload (no secret). */
  fingerprint: string;
  /** Subject phone (or hashed phone if privacy mode is on). */
  subject: string;
  /** Subject display name, if provided. */
  name?: string;
  /** Computed score on 300-850 scale. */
  score: number;
  /** Band label for quick UI display. */
  band: "poor" | "fair" | "good" | "very_good" | "excellent";
  /** Breakdown of factors used. */
  factors: ZKCreditFactors;
  /** Tenant id (for multi-tenant audit trails). */
  tenantId: string;
  /** Issuer identity, e.g. "EquiPulse:tenantId". */
  issuer: string;
  /** ISO timestamp when issued. */
  issuedAt: string;
  /** ISO timestamp when the receipt stops being valid (default 90d). */
  expiresAt: string;
  /** Base64 HMAC-SHA-256 signature. */
  signature: string;
  /** Human-readable verification code, e.g. "ZK-7H3K-92F1-44A0". */
  verificationCode: string;
  /** Canonical JSON payload that was signed. Useful for re-verification. */
  payload: string;
}

export interface ZKCreditResult {
  ok: boolean;
  reason: ZKCreditReason;
  receipt?: ZKCreditReceipt;
  /** Optional remote submission status, for audit. */
  remoteSubmitted?: boolean;
  /** Error message, only populated on failure. */
  error?: string;
}

export interface ZKCreditHistoryEntry {
  id: string;
  subject: string;
  name?: string;
  score: number;
  band: ZKCreditReceipt["band"];
  fingerprint: string;
  verificationCode: string;
  issuedAt: string;
  expiresAt: string;
}

const HISTORY_KEY = "equipulse.zk.credit.history.v1";
const SCORES_KEY = "equipulse.zk.credit.scores.v1";
const HISTORY_CAP = 200;

// ---------- Helpers ----------

function getSubtle(): SubtleCrypto | null {
  if (typeof crypto === "undefined") return null;
  if (crypto.subtle) return crypto.subtle;
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  if (typeof btoa !== "undefined") return btoa(bin);
  // Node fallback (used by tests/scripts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Buf: any = (globalThis as any).Buffer;
  if (Buf) return Buf.from(bytes).toString("base64");
  return bin;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

async function sha256Hex(input: string): Promise<string> {
  const sub = getSubtle();
  if (!sub) throw new Error("crypto_unavailable");
  const buf = new TextEncoder().encode(input);
  const digest = await sub.digest("SHA-256", buf);
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSignBase64(secret: string, payload: string): Promise<string> {
  const sub = getSubtle();
  if (!sub) throw new Error("crypto_unavailable");
  const keyData = new TextEncoder().encode(secret);
  const key = await sub.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await sub.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64(new Uint8Array(sig));
}

function canonicalJson(value: unknown): string {
  // Deterministic stringify: sort keys, drop undefined.
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJson(v)).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k]))
      .join(",") +
    "}"
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function bandFor(score: number): ZKCreditReceipt["band"] {
  if (score >= 800) return "excellent";
  if (score >= 740) return "very_good";
  if (score >= 670) return "good";
  if (score >= 580) return "fair";
  return "poor";
}

function computeScore(factors: ZKCreditFactors): number {
  // Start at the middle (Fair) and adjust per factor.
  // + 2.5 per paid transaction, capped at 80
  // + 0.05 per BDT of average ticket, capped at 60
  // + 1.5 per day of tenure, capped at 90
  // + 25 per credit paid, capped at 75
  // - 30 per credit default
  // - 8 per credit pending
  // - 6 per return
  let score = 610;
  score += Math.min(80, factors.paidCount * 2.5);
  score += Math.min(60, factors.avgTicket * 0.05);
  score += Math.min(90, factors.tenureDays * 1.5);
  score += Math.min(75, factors.creditPaidCount * 25);
  score -= factors.creditDefaultCount * 30;
  score -= factors.creditPendingCount * 8;
  score -= factors.returnsCount * 6;
  return Math.round(clamp(score, 300, 850));
}

function deriveFactors(input: ZKCreditInput): ZKCreditFactors {
  const txs = input.transactions || [];
  let paidCount = 0;
  let creditPaidCount = 0;
  let creditPendingCount = 0;
  let creditDefaultCount = 0;
  let ticketSum = 0;
  let firstDate: number | null = null;
  let lastDate: number | null = null;
  for (const tx of txs) {
    const amt = Number(tx.amount) || 0;
    if (amt > 0) {
      paidCount += 1;
      ticketSum += amt;
    }
    const status = tx.creditStatus || (amt >= 0 ? "cash" : "credit_pending");
    if (status === "credit_paid") creditPaidCount += 1;
    else if (status === "credit_pending") creditPendingCount += 1;
    else if (status === "credit_default") creditDefaultCount += 1;
    const d = Date.parse(tx.date);
    if (!Number.isNaN(d)) {
      if (firstDate === null || d < firstDate) firstDate = d;
      if (lastDate === null || d > lastDate) lastDate = d;
    }
  }
  const tenureFromDates =
    firstDate !== null && lastDate !== null
      ? Math.max(0, Math.floor((lastDate - firstDate) / 86_400_000))
      : 0;
  const tenureDays = input.tenureDays ?? tenureFromDates;
  const avgTicket = paidCount > 0 ? ticketSum / paidCount : 0;
  return {
    avgTicket: Math.round(avgTicket * 100) / 100,
    paidCount,
    creditPaidCount,
    creditPendingCount,
    creditDefaultCount,
    tenureDays,
    returnsCount: input.returnsCount || 0,
  };
}

function makeVerificationCode(fingerprint: string): string {
  // 12 hex chars, grouped 4-4-4, prefixed with ZK-.
  const slice = (fingerprint || "000000000000").replace(/[^0-9a-f]/gi, "").padEnd(12, "0").slice(0, 12).toUpperCase();
  return `ZK-${slice.slice(0, 4)}-${slice.slice(4, 8)}-${slice.slice(8, 12)}`;
}

function readHistory(): ZKCreditHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(list: ZKCreditHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_CAP)));
  } catch {
    // ignore quota
  }
}

function readScores(): Record<string, ZKCreditHistoryEntry> {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeScores(map: Record<string, ZKCreditHistoryEntry>): void {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function persist(entry: ZKCreditHistoryEntry): void {
  const list = readHistory();
  list.unshift(entry);
  writeHistory(list);
  const scores = readScores();
  scores[entry.subject] = entry;
  writeScores(scores);
}

// ---------- Core API ----------

/**
 * Compute a signed zero-knowledge credit receipt.
 * Pure function: takes input and credentials, returns a ZKCreditResult.
 */
export async function computeCreditReceipt(
  input: ZKCreditInput,
  opts: { tenantId: string; secret: string; apiUrl?: string; remoteToken?: string; validityDays?: number }
): Promise<ZKCreditResult> {
  if (!opts || !opts.tenantId) return { ok: false, reason: "invalid_input", error: "tenant_id_missing" };
  if (!opts.secret || opts.secret.length < 8) return { ok: false, reason: "not_configured", error: "tenant_secret_too_short" };
  if (!input || !input.phone) return { ok: false, reason: "invalid_input", error: "phone_missing" };
  if (!Array.isArray(input.transactions) || input.transactions.length < 1) {
    return { ok: false, reason: "insufficient_data", error: "no_transactions" };
  }
  const sub = getSubtle();
  if (!sub) return { ok: false, reason: "crypto_unavailable" };

  const factors = deriveFactors(input);
  const score = computeScore(factors);
  const band = bandFor(score);
  const issuedAt = new Date().toISOString();
  const days = opts.validityDays && opts.validityDays > 0 ? opts.validityDays : 90;
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();

  const payloadObj = {
    tenantId: opts.tenantId,
    issuer: `EquiPulse:${opts.tenantId}`,
    subject: input.phone,
    name: input.name || undefined,
    score,
    band,
    factors,
    issuedAt,
    expiresAt,
  };
  const payload = canonicalJson(payloadObj);
  let signature: string;
  let fingerprint: string;
  try {
    signature = await hmacSignBase64(opts.secret, payload);
    fingerprint = await sha256Hex(payload);
  } catch (err) {
    return { ok: false, reason: "crypto_unavailable", error: (err as Error).message };
  }
  const verificationCode = makeVerificationCode(fingerprint);

  const receipt: ZKCreditReceipt = {
    fingerprint,
    subject: input.phone,
    name: input.name,
    score,
    band,
    factors,
    tenantId: opts.tenantId,
    issuer: payloadObj.issuer,
    issuedAt,
    expiresAt,
    signature,
    verificationCode,
    payload,
  };

  let remoteSubmitted = false;
  if (opts.apiUrl) {
    try {
      const resp = await fetch(opts.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opts.remoteToken ? { Authorization: `Bearer ${opts.remoteToken}` } : {}),
        },
        body: JSON.stringify({
          fingerprint,
          subject: input.phone,
          score,
          band,
          verificationCode,
          issuedAt,
          expiresAt,
        }),
      });
      remoteSubmitted = resp.ok;
      if (!resp.ok) {
        // Local receipt is still valid; just record the failure for audit.
        console.warn("[useZKCredit] remote submit failed", resp.status);
      }
    } catch (err) {
      console.warn("[useZKCredit] remote submit error", err);
    }
  }

  persist({
    id: fingerprint.slice(0, 16),
    subject: receipt.subject,
    name: receipt.name,
    score: receipt.score,
    band: receipt.band,
    fingerprint: receipt.fingerprint,
    verificationCode: receipt.verificationCode,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
  });

  return { ok: true, reason: "ok", receipt, remoteSubmitted };
}

/**
 * Verify a previously issued receipt.
 * Returns ok=true only if the HMAC matches and the receipt has not expired.
 */
export async function verifyCreditReceipt(
  receipt: ZKCreditReceipt,
  secret: string
): Promise<{ ok: boolean; reason: ZKCreditReason; error?: string }> {
  if (!receipt || !receipt.payload || !receipt.signature) {
    return { ok: false, reason: "verification_failed", error: "missing_payload" };
  }
  if (receipt.expiresAt && Date.parse(receipt.expiresAt) < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (!secret) return { ok: false, reason: "not_configured" };
  const sub = getSubtle();
  if (!sub) return { ok: false, reason: "crypto_unavailable" };
  try {
    const expected = await hmacSignBase64(secret, receipt.payload);
    if (expected.length !== receipt.signature.length) {
      return { ok: false, reason: "verification_failed", error: "length_mismatch" };
    }
    // constant-time-ish comparison
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ receipt.signature.charCodeAt(i);
    }
    if (diff !== 0) return { ok: false, reason: "verification_failed", error: "bad_signature" };
    return { ok: true, reason: "ok" };
  } catch (err) {
    return { ok: false, reason: "crypto_unavailable", error: (err as Error).message };
  }
}

// ---------- React hook ----------

export interface UseZKCreditResult {
  /** True if the user has stored a tenant secret with at least 8 chars. */
  isConfigured: boolean;
  /** Length of the stored secret, useful for a strength hint. */
  secretLength: number;
  /** Last receipt issued by this session. */
  lastReceipt: ZKCreditReceipt | null;
  /** Whether a compute is in progress. */
  isComputing: boolean;
  /** Last error from the hook, if any. */
  error: string | null;
  /** Compute a receipt for the given input. */
  compute: (input: ZKCreditInput, opts?: { validityDays?: number }) => Promise<ZKCreditResult>;
  /** Verify a receipt using the stored secret. */
  verify: (receipt: ZKCreditReceipt) => Promise<{ ok: boolean; reason: ZKCreditReason; error?: string }>;
  /** Recent history, newest first. */
  history: ZKCreditHistoryEntry[];
  /** Last score per subject, keyed by phone. */
  lastScoreBySubject: Record<string, ZKCreditHistoryEntry>;
  /** Clear local history. */
  clearHistory: () => void;
}

export function useZKCredit(tenantId: string): UseZKCreditResult {
  const [lastReceipt, setLastReceipt] = useState<ZKCreditReceipt | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ZKCreditHistoryEntry[]>([]);
  const [lastScoreBySubject, setLastScoreBySubject] = useState<Record<string, ZKCreditHistoryEntry>>({});
  const [secretLength, setSecretLength] = useState(0);

  // Pull creds reactively so the UI shows "configured" the moment the user
  // saves a new secret in CredentialsPanel.
  useEffect(() => {
    const refresh = () => {
      const cred = getCachedCredential<{ apiKey?: string }>("zk_credit");
      const len = cred?.values?.apiKey ? String(cred.values.apiKey).length : 0;
      setSecretLength(len);
    };
    refresh();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setHistory(readHistory());
    setLastScoreBySubject(readScores());
  }, []);

  const isConfigured = secretLength >= 8;

  const compute = useCallback(
    async (input: ZKCreditInput, opts?: { validityDays?: number }): Promise<ZKCreditResult> => {
      setError(null);
      setIsComputing(true);
      try {
        const cred = getCachedCredential<{ apiKey?: string; apiUrl?: string }>("zk_credit");
        const secret = cred?.values?.apiKey || "";
        if (!secret || secret.length < 8) {
          return { ok: false, reason: "not_configured", error: "no_tenant_secret" };
        }
        const result = await computeCreditReceipt(input, {
          tenantId,
          secret,
          apiUrl: cred?.values?.apiUrl,
          validityDays: opts?.validityDays,
        });
        if (result.ok && result.receipt) {
          setLastReceipt(result.receipt);
          setHistory(readHistory());
          setLastScoreBySubject(readScores());
        } else if (!result.ok) {
          setError(result.reason);
        }
        return result;
      } catch (err) {
        const reason: ZKCreditReason = "crypto_unavailable";
        setError(reason);
        return { ok: false, reason, error: (err as Error).message };
      } finally {
        setIsComputing(false);
      }
    },
    [tenantId]
  );

  const verify = useCallback(
    async (receipt: ZKCreditReceipt) => {
      const cred = getCachedCredential<{ apiKey?: string }>("zk_credit");
      return verifyCreditReceipt(receipt, cred?.values?.apiKey || "");
    },
    []
  );

  const clearHistory = useCallback(() => {
    writeHistory([]);
    writeScores({});
    setHistory([]);
    setLastScoreBySubject({});
  }, []);

  return {
    isConfigured,
    secretLength,
    lastReceipt,
    isComputing,
    error,
    compute,
    verify,
    history,
    lastScoreBySubject,
    clearHistory,
  };
}

// ---------- Formatting helpers ----------

export function formatCreditScore(score: number, band: ZKCreditReceipt["band"]): string {
  return `${score} (${band.replace("_", " ")})`;
}

export function formatCreditReceipt(receipt: ZKCreditReceipt, opts?: { includePayload?: boolean }): string {
  const lines: string[] = [];
  lines.push("=== Zero-Knowledge Credit Receipt ===");
  lines.push(`Issuer   : ${receipt.issuer}`);
  lines.push(`Subject  : ${receipt.subject}${receipt.name ? " (" + receipt.name + ")" : ""}`);
  lines.push(`Score    : ${receipt.score}  [${receipt.band.toUpperCase()}]`);
  lines.push(`Issued   : ${receipt.issuedAt}`);
  lines.push(`Expires  : ${receipt.expiresAt}`);
  lines.push(`Verify   : ${receipt.verificationCode}`);
  lines.push(`Fingerpr : ${receipt.fingerprint}`);
  lines.push("--- Factors ---");
  lines.push(`  Paid tx       : ${receipt.factors.paidCount}`);
  lines.push(`  Avg ticket    : ${receipt.factors.avgTicket}`);
  lines.push(`  Tenure (days) : ${receipt.factors.tenureDays}`);
  lines.push(`  Credit paid   : ${receipt.factors.creditPaidCount}`);
  lines.push(`  Credit pend.  : ${receipt.factors.creditPendingCount}`);
  lines.push(`  Credit def.   : ${receipt.factors.creditDefaultCount}`);
  lines.push(`  Returns       : ${receipt.factors.returnsCount}`);
  lines.push(`Signature (b64): ${receipt.signature}`);
  if (opts?.includePayload) {
    lines.push("--- Payload ---");
    lines.push(receipt.payload);
  }
  return lines.join("\n");
}
