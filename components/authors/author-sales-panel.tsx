"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatINR, type AuthorDashboardSummary } from "@/lib/author-dashboard";

/**
 * "Which books sold" view built from the author dashboard payload.
 * Used in the admin Authors drawer and on the author's own dashboard.
 * `bookHref` decides where a book title links (admin book page vs public page).
 */
export function AuthorSalesPanel({
  summary,
  bookHref,
  compact = false,
}: {
  summary: AuthorDashboardSummary;
  bookHref?: (bookId: string) => string;
  compact?: boolean;
}) {
  const Title = ({ id, title, available }: { id: string | null; title: string; available: boolean }) =>
    id && available && bookHref ? (
      <Link href={bookHref(id)} className="font-semibold text-[#0F3D3E] hover:underline">
        {title}
      </Link>
    ) : (
      <span className={available ? "font-semibold text-[#0F3D3E]" : "italic text-[#5C6E6E]"}>{title}</span>
    );

  return (
    <div className="space-y-5 text-xs">
      {/* Totals */}
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {[
          ["Units sold", summary.unitsSold.toLocaleString("en-IN")],
          ["Gross book revenue", formatINR(summary.grossRevenue)],
          ["Royalty accrued", formatINR(summary.accrued)],
          ["Eligible for payout", formatINR(summary.eligibleUnsettled)],
          ["Payout pending", formatINR(summary.pendingPayout)],
          ["Paid lifetime", formatINR(summary.paidLifetime)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#E2E6DF] bg-[#F8F9F7] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">{label}</p>
            <p className="text-base font-serif font-bold text-[#0F3D3E] tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {(summary.dataStatus !== "COMPLETE" || summary.unresolvedLegacySales > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {summary.unresolvedLegacySales > 0
              ? `${summary.unresolvedLegacySales} older sale(s) have no stored royalty rate and are excluded from settlements.`
              : `Royalty data status: ${summary.dataStatus.toLowerCase()}.`}
          </span>
        </div>
      )}

      {/* Sales by book */}
      <div>
        <p className="font-bold uppercase tracking-wider text-[#5C6E6E] mb-2">Sales by book</p>
        {summary.topBooks.length === 0 ? (
          <p className="text-[#5C6E6E]">No book sales yet.</p>
        ) : (
          <ul className="space-y-2">
            {summary.topBooks.map((b, i) => (
              <li key={b.bookId || i} className="flex items-center gap-3 rounded-xl border border-[#E2E6DF] p-2.5">
                {b.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverImage} alt="" className="h-12 w-9 rounded object-cover border border-[#E2E6DF] shrink-0" />
                ) : (
                  <div className="h-12 w-9 rounded bg-[#F8F9F7] border border-[#E2E6DF] flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-[#5C6E6E]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Title id={b.bookId} title={b.title} available={Boolean(b.bookId)} />
                  <p className="text-[11px] text-[#5C6E6E]">
                    {b.unitsSold} sold · {formatINR(b.grossRevenue)} revenue
                    {b.royaltyPercent !== null ? ` · ${b.royaltyPercent}% royalty` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-emerald-700 tabular-nums">{formatINR(b.royalty)}</p>
                  {b.status && <Badge variant="outline" className="text-[9px] capitalize mt-0.5">{b.status}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent sales: which book was in which order */}
      <div>
        <p className="font-bold uppercase tracking-wider text-[#5C6E6E] mb-2">Recent orders of these books</p>
        {summary.recentSales.length === 0 ? (
          <p className="text-[#5C6E6E]">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E2E6DF]">
            <table className="w-full text-left">
              <thead className="bg-[#F8F9F7] text-[10px] uppercase tracking-wider text-[#5C6E6E]">
                <tr>
                  <th className="p-2">Book</th>
                  <th className="p-2">Order</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Royalty</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6DF]">
                {summary.recentSales.map((s, i) => (
                  <tr key={`${s.orderNumber}-${s.bookId}-${i}`}>
                    <td className="p-2 max-w-[180px]">
                      <Title id={s.bookId} title={s.bookTitle} available={s.bookAvailable} />
                    </td>
                    <td className="p-2 font-mono whitespace-nowrap">
                      {s.orderNumber || "—"}
                      {s.orderStatus && <span className="block text-[10px] text-[#5C6E6E] capitalize">{s.orderStatus.toLowerCase()}</span>}
                    </td>
                    <td className="p-2 text-center tabular-nums">{s.quantity}</td>
                    <td className="p-2 text-right tabular-nums">{formatINR(s.unitPrice)}</td>
                    <td className="p-2 text-right tabular-nums text-emerald-700">
                      {formatINR(s.royalty)}
                      {s.royaltyPercent !== null && <span className="block text-[10px] text-[#5C6E6E]">{s.royaltyPercent}%</span>}
                    </td>
                    <td className="p-2 whitespace-nowrap text-[#5C6E6E]">
                      {s.saleDate ? new Date(s.saleDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
