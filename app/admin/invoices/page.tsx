"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  Receipt,
  Search,
  Download,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let res: any;
      if (searchQuery.trim()) {
        res = await api.get("/admin/invoices/search", { params: { q: searchQuery.trim() } }).catch(() =>
          api.get("/admin/invoices", { params: { search: searchQuery.trim(), limit: 50 } })
        );
      } else {
        res = await api.get("/admin/invoices", { params: { limit: 50 } });
      }

      let items = res?.data?.data?.invoices || res?.data?.invoices || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      
      // If invoices collection is not separately seeded yet, fallback to orders with verified payments
      if (items.length === 0) {
        const ordersRes = await api.get("/admin/orders", { params: { limit: 50 } }).catch(() => null);
        const orderList = ordersRes?.data?.data?.orders || (Array.isArray(ordersRes?.data?.data) ? ordersRes.data.data : []) || [];
        items = orderList.map((ord: any) => ({
          _id: ord._id || ord.id,
          invoiceNumber: `INV-${(ord.orderNumber || ord._id || "1000").toString().slice(-6)}`,
          orderNumber: ord.orderNumber || ord._id,
          customerName: ord.shippingAddress?.fullName || ord.shippingAddress?.name || ord.user?.name || "Customer",
          customerEmail: ord.shippingAddress?.email || ord.user?.email || "N/A",
          totalAmount: ord.totalPrice ?? ord.totalAmount ?? ord.amount ?? 0,
          paymentStatus: ord.paymentStatus || (ord.isPaid ? "PAID" : "PENDING"),
          createdAt: ord.createdAt || new Date().toISOString(),
          items: ord.items || [],
        }));
      }

      setInvoices(items);
    } catch (err) {
      console.warn("Invoices fetch error:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownloadInvoice = async (invoice: any) => {
    const invId = invoice._id || invoice.id;
    setDownloadingId(invId);
    try {
      // First attempt backend PDF stream: GET /api/admin/invoices/:id/download
      const response = await api.get(`/admin/invoices/${invId}/download`, {
        responseType: "blob",
      }).catch(() => null);

      if (response && response.data) {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoice-${invoice.invoiceNumber || invId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Invoice PDF downloaded successfully! 📄");
      } else {
        // Fallback: Browser print dialog
        window.print();
      }
    } catch (err) {
      console.error("Failed to download invoice:", err);
      window.print();
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Platform Invoices & Billing
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Browse tax invoices generated for book orders, inspect billing breakdowns, and download customer receipts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search invoice number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <p className="text-xs text-[#5C6E6E]">
            Total Invoices: <span className="font-bold text-[#0F3D3E]">{invoices.length}</span>
          </p>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Invoice No</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Order Ref</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Billed Customer</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Total Amount</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Payment Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Invoice Date</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-36 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading invoices...</p>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-[#5C6E6E]">
                    No invoices found. Invoices are generated automatically as orders are verified.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const invId = inv._id || inv.id;
                  const isPaid = inv.paymentStatus === "PAID" || inv.paymentStatus === "VERIFIED";

                  return (
                    <TableRow key={invId} className="hover:bg-[#F8F9F7]/60 text-xs">
                      <TableCell className="font-mono font-bold text-[#0F3D3E]">
                        {inv.invoiceNumber || `INV-${invId.slice(-6)}`}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-[#5C6E6E]">
                        {inv.orderNumber || "N/A"}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-[#0F3D3E]">{inv.customerName || "Reader"}</p>
                        <p className="text-[11px] text-[#5C6E6E]">{inv.customerEmail}</p>
                      </TableCell>
                      <TableCell className="text-right font-serif font-bold text-sm text-[#0F3D3E]">
                        ₹{Number(inv.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {isPaid ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">
                            PAID
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 text-[11px]">
                            {inv.paymentStatus || "PENDING"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[#5C6E6E]">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-8 text-xs text-[#0F3D3E] border-[#0F3D3E]/30 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadInvoice(inv)}
                            disabled={downloadingId === invId}
                            className="h-8 text-xs bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-1"
                          >
                            {downloadingId === invId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            <span>PDF</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <Receipt className="h-5 w-5 text-[#0F3D3E]" />
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                    {selectedInvoice.invoiceNumber || "Invoice Summary"}
                  </h3>
                  <p className="text-xs text-[#5C6E6E]">Order: {selectedInvoice.orderNumber}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedInvoice(null)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-[#E2E6DF]">
                <div>
                  <p className="text-[#5C6E6E]">Billed To:</p>
                  <p className="font-bold text-sm text-[#0F3D3E]">{selectedInvoice.customerName}</p>
                  <p className="text-[11px] text-[#5C6E6E]">{selectedInvoice.customerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#5C6E6E]">Date:</p>
                  <p className="font-medium text-[#0F3D3E]">
                    {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </p>
                  <Badge className="bg-emerald-500/15 text-emerald-800 text-[10px] mt-1">
                    {selectedInvoice.paymentStatus || "PAID"}
                  </Badge>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="font-bold uppercase tracking-wider text-[#5C6E6E]">Itemized Details</p>
                <div className="space-y-1.5">
                  {(selectedInvoice.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 rounded-lg bg-[#F8F9F7]">
                      <span>{item.book?.title || item.title || "Book Item"} (×{item.quantity || 1})</span>
                      <span className="font-bold text-[#0F3D3E]">₹{Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="pt-3 border-t border-[#E2E6DF] flex justify-between items-center text-sm">
                <span className="font-bold text-[#0F3D3E]">Total Paid:</span>
                <span className="font-serif font-bold text-lg text-[#0F3D3E]">
                  ₹{Number(selectedInvoice.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E6DF] flex justify-end gap-2 bg-[#F8F9F7]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="bg-[#0F3D3E] text-white text-xs gap-1.5 font-bold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Invoice PDF</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
