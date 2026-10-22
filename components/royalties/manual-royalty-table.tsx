import { formatINR } from "@/lib/author-dashboard";
import type { ManualRoyaltyStatement } from "@/lib/manual-royalties";

/** Read-only statement table; shared shape with the author's Royalties page. */
export function ManualRoyaltyTable({ statement }: { statement: ManualRoyaltyStatement }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#E2E6DF]">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#F8F9F7] text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">
          <tr>
            <th className="p-2">Book name</th>
            <th className="p-2 text-right">Royalty per book</th>
            <th className="p-2 text-right">Books sold</th>
            <th className="p-2 text-right">Total royalty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E6DF]">
          {statement.items.map((item, i) => (
            <tr key={`${item.bookId || item.bookTitle}-${i}`}>
              <td className="p-2 font-medium text-[#0F3D3E]">{item.bookTitle}</td>
              <td className="p-2 text-right tabular-nums">{formatINR(item.royaltyPerBook)}</td>
              <td className="p-2 text-right tabular-nums">{item.unitsSold.toLocaleString("en-IN")}</td>
              <td className="p-2 text-right tabular-nums font-semibold text-emerald-700">{formatINR(item.totalRoyalty)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-[#F8F9F7] font-bold text-[#0F3D3E]">
          <tr>
            <td className="p-2" colSpan={2}>Total</td>
            <td className="p-2 text-right tabular-nums">{statement.totalUnits.toLocaleString("en-IN")}</td>
            <td className="p-2 text-right tabular-nums text-emerald-700">{formatINR(statement.totalRoyalty)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
