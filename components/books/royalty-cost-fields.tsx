"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COST_FIELDS, hasCosts, readCosts, royaltyPerCopy, totalCosts, type RoyaltyCosts } from "@/lib/royalty";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Admin book form inputs for the per-copy deductions, with the resulting royalty
 * (MRP − printing − platform − delivery) shown live. `currentPerCopy` is what a book saved
 * before these charges existed pays now, shown until charges are entered.
 */
export function RoyaltyCostFields({
  mrp,
  values,
  onChange,
  currentPerCopy = null,
}: {
  mrp: string | number;
  values: Record<keyof RoyaltyCosts, string>;
  onChange: (key: keyof RoyaltyCosts, value: string) => void;
  currentPerCopy?: number | null;
}) {
  const costs = readCosts(values);
  const price = Number(mrp) || 0;
  const perCopy = royaltyPerCopy(price, costs);
  const overMrp = price > 0 && totalCosts(costs) > price;

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-3">
        {COST_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
              {label} (₹)
            </Label>
            <Input
              id={key}
              name={key}
              type="number"
              min="0"
              step="0.01"
              value={values[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="0"
              className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold font-mono"
            />
          </div>
        ))}
      </div>

      <div
        className={`rounded-xl border p-3 text-xs ${
          overMrp ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
      >
        <p className="font-mono">
          MRP {inr(price)} − Printing {inr(costs.printingCost)} − Platform {inr(costs.platformCharges)} − Delivery{" "}
          {inr(costs.deliveryCharges)}
        </p>
        {!hasCosts(costs) && currentPerCopy !== null ? (
          <p className="mt-1 font-bold">
            Current royalty per copy: {inr(currentPerCopy)}. Enter the charges to recalculate it.
          </p>
        ) : (
          <p className="mt-1 font-bold">
            Author royalty per copy: {inr(perCopy)}
            {overMrp && " (charges exceed the MRP)"}
          </p>
        )}
      </div>
    </div>
  );
}
