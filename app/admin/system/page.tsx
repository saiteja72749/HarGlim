"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiResource } from "@/hooks/use-api-resource";
import { fetchBackendReadiness, fetchRuntimeMetrics } from "@/lib/runtime-metrics";

const formatMetric = (value: number | null, unit: string) => value === null ? "Unavailable" : `${value.toFixed(1)} ${unit}`;

export default function AdminSystemPage() {
  const metrics = useApiResource("runtime-metrics", fetchRuntimeMetrics);
  const readiness = useApiResource("backend-readiness", fetchBackendReadiness);
  const data = metrics.data;
  const latency = (value: number | null) => data?.sampleSize === 0 ? "No samples yet" : formatMetric(value, "ms");
  const values = data ? [
    ["Uptime", `${Math.floor(data.uptimeSeconds / 3600)}h ${Math.floor(data.uptimeSeconds / 60) % 60}m ${Math.floor(data.uptimeSeconds) % 60}s`],
    ["Total requests", data.total.toLocaleString("en-IN")],
    ["In-flight requests", data.inFlight?.toLocaleString("en-IN") ?? "Unavailable"],
    ["Average response time", latency(data.average)],
    ["p50", latency(data.p50)],
    ["p95", latency(data.p95)],
    ["p99", latency(data.p99)],
    ["Resident memory", formatMetric(data.memoryMiB.rss, "MiB")],
    ["Used heap", formatMetric(data.memoryMiB.heapUsed, "MiB")],
  ] : [];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">System monitoring</h1>
          <p className="mt-2 text-muted-foreground">Metrics reflect one backend instance and reset when it restarts.</p>
        </div>
        <Button disabled={metrics.loading || readiness.loading} onClick={() => { void metrics.reload(); void readiness.reload(); }}>Refresh</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Readiness</CardTitle></CardHeader>
        <CardContent><p role={readiness.error ? "alert" : "status"}>
          {readiness.error ? "Backend readiness could not be checked." : readiness.data ?? "Checking backend readiness…"}
        </p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Runtime metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {metrics.error && <p role="alert">{metrics.error.response?.status === 403
            ? "You do not have permission to view runtime metrics."
            : data ? "Refresh failed. The last verified snapshot is shown." : "Runtime metrics could not be verified. Refresh to try again."}</p>}
          {metrics.loading && <p role="status">Refreshing runtime metrics…</p>}
          {data && <>
            <p className="text-sm text-muted-foreground">Last refreshed <time dateTime={data.refreshedAt}>{new Date(data.refreshedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</time></p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{values.map(([label, value]) =>
              <div className="rounded-lg border p-3" key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl>
            <h2 className="font-semibold">HTTP response status counts</h2>
            {data.statusCounts?.length ? <dl className="flex flex-wrap gap-4">{data.statusCounts.map(({ status, count }) =>
              <div key={status} className="rounded-lg border p-3"><dt>HTTP {status}</dt><dd className="font-semibold">{count.toLocaleString("en-IN")}</dd></div>)}</dl>
              : <p>{data.statusCounts ? "No status counts reported yet." : "Unavailable"}</p>}
          </>}
        </CardContent>
      </Card>
    </div>
  );
}
