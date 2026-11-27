import api from "@/lib/api";
import { isRejectedEnvelope, record } from "@/lib/api-error";
import { API_URL } from "@/config/backend.mjs";

const BYTES_PER_MIB = 1024 ** 2;

function metric(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`The metrics response omitted a valid ${label}.`);
  }
  return value;
}

function optionalMetric(value: unknown, label: string) {
  return value == null ? null : metric(value, label);
}

function memoryMiB(bytes: unknown, legacyMiB: unknown, label: string) {
  if (bytes == null) return optionalMetric(legacyMiB, label);
  return metric(bytes, label) / BYTES_PER_MIB;
}

export function parseRuntimeMetrics(input: unknown) {
  if (isRejectedEnvelope(input)) throw new Error("The backend rejected the metrics request.");
  const data = record(record(input).data ?? input);
  const requests = record(data.requests ?? data.http);
  const latency = record(requests.durationMs ?? requests.latencyMs ?? requests.responseTimeMs ?? data.latencyMs ?? data.responseTimeMs);
  const memory = record(data.memoryBytes ?? data.memoryUsage ?? data.memory);
  const statuses = requests.statusClasses ?? requests.statusCounts ?? requests.byStatus ?? data.statusCounts ?? data.responseStatusCounts;
  if (statuses != null && (typeof statuses !== "object" || Array.isArray(statuses))) throw new Error("The metrics response returned invalid HTTP status counts.");
  const statusCounts = statuses == null ? null : Object.entries(statuses).map(([status, count]) => {
    if (!/^[1-5](?:\d{2}|xx)$/.test(status)) throw new Error("The metrics response returned an invalid HTTP status.");
    return { status, count: metric(count, "HTTP status count") };
  }).sort((a, b) => a.status.localeCompare(b.status));
  return {
    uptimeSeconds: metric(data.uptimeSeconds, "uptime"),
    total: metric(requests.total ?? requests.totalRequests ?? data.totalRequests, "request total"),
    inFlight: optionalMetric(requests.inFlight ?? requests.inFlightRequests ?? data.inFlightRequests, "in-flight count"),
    statusCounts,
    sampleSize: optionalMetric(requests.sampleSize, "latency sample count"),
    average: optionalMetric(latency.average ?? latency.avg ?? latency.mean ?? latency.avgMs, "average latency"),
    p50: optionalMetric(latency.p50 ?? latency.p50Ms, "p50 latency"),
    p95: optionalMetric(latency.p95 ?? latency.p95Ms, "p95 latency"),
    p99: optionalMetric(latency.p99 ?? latency.p99Ms, "p99 latency"),
    memoryMiB: {
      rss: memoryMiB(memory.rss ?? memory.rssBytes, memory.rssMb, "RSS memory"),
      heapUsed: memoryMiB(memory.heapUsed ?? memory.heapUsedBytes, memory.heapUsedMb, "used heap memory"),
    },
  };
}

export async function fetchRuntimeMetrics() {
  const { data } = await api.get("/admin/operations/runtime-metrics", { cache: "no-store" });
  return { ...parseRuntimeMetrics(data), refreshedAt: new Date().toISOString() };
}

export async function fetchBackendReadiness() {
  const target = new URL("/health/ready", API_URL);
  const response = await fetch(target, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(12000) });
  if (response.status === 503) return "Backend is not ready";
  if (!response.ok) throw new Error(`Readiness check returned HTTP ${response.status}.`);
  const body: unknown = await response.json();
  if (isRejectedEnvelope(body) || record(record(body).data ?? body).status !== "READY") {
    throw new Error("The backend did not confirm readiness.");
  }
  return "Backend is ready";
}
