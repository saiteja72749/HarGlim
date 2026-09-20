"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  AlertTriangle,
  BookOpen,
  Layers,
  History,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<"reservations" | "low-stock" | "timeline">("low-stock");

  // Low Stock State
  const [lowStockBooks, setLowStockBooks] = useState<any[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  // Reservations State
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Timeline Ledger State
  const [ledgerTimeline, setLedgerTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Fetch Low Stock Books
  const fetchLowStock = useCallback(async () => {
    setLoadingLowStock(true);
    try {
      const res = await api.get("/admin/operations/inventory/low-stock").catch(() => null);
      let items = res?.data?.data?.books || res?.data?.books || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      if (items.length === 0) {
        // Fallback: query books with stock <= 5
        const booksRes = await api.get("/books", { params: { limit: 100 } }).catch(() => null);
        const bList = booksRes?.data?.data?.books || (Array.isArray(booksRes?.data?.data) ? booksRes.data.data : []) || [];
        items = bList.filter((b: any) => typeof b.stock === "number" && b.stock <= 5);
      }
      setLowStockBooks(items);
    } catch (err) {
      console.warn("Low stock fetch notice:", err);
    } finally {
      setLoadingLowStock(false);
    }
  }, []);

  // Fetch Reservations
  const fetchReservations = useCallback(async () => {
    setLoadingReservations(true);
    try {
      const res = await api.get("/admin/operations/inventory/reservations").catch(() => null);
      const items = res?.data?.data?.reservations || res?.data?.reservations || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      setReservations(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Reservations fetch notice:", err);
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  // Fetch Timeline Ledger
  const fetchTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const res = await api.get("/admin/operations/ledger/timeline").catch(() => null);
      const items = res?.data?.data?.timeline || res?.data?.timeline || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      setLedgerTimeline(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Ledger timeline fetch notice:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "low-stock") fetchLowStock();
    if (activeTab === "reservations") fetchReservations();
    if (activeTab === "timeline") fetchTimeline();
  }, [activeTab, fetchLowStock, fetchReservations, fetchTimeline]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Monitor real-time book copies, checkout reservations, low-stock thresholds, and stock movement ledger.
          </p>
        </div>
        <Link href="/admin/books">
          <Button variant="outline" className="text-xs font-bold gap-1.5 border-[#0F3D3E]/30 text-[#0F3D3E]">
            <BookOpen className="h-4 w-4" />
            <span>Manage Catalog Stock</span>
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-[#E2E6DF]/60 p-1">
          <TabsTrigger value="low-stock" className="text-xs font-bold gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Low Stock Alerts ({lowStockBooks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="text-xs font-bold gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>Active Reservations</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs font-bold gap-1.5">
            <History className="h-3.5 w-3.5" />
            <span>Ledger Timeline</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Low Stock Alerts */}
        <TabsContent value="low-stock" className="space-y-4 pt-4">
          <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Book Title</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Format</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Current Stock</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLowStock ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                      </TableCell>
                    </TableRow>
                  ) : lowStockBooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-[#5C6E6E]">
                        All books have sufficient inventory reserves. No low stock alerts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockBooks.map((book) => {
                      const bId = book._id || book.id;
                      const stockVal = Number(book.stock ?? 0);
                      const isOutOfStock = stockVal === 0;

                      return (
                        <TableRow key={bId} className="hover:bg-[#F8F9F7]/60 text-xs">
                          <TableCell>
                            <p className="font-bold text-sm text-[#0F3D3E]">{book.title}</p>
                            <p className="text-[11px] font-mono text-[#5C6E6E]">ISBN: {book.isbn || "N/A"}</p>
                          </TableCell>
                          <TableCell className="capitalize font-medium text-[#5C6E6E]">
                            {book.format || "Paperback"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-serif font-bold text-base text-[#0F3D3E]">{stockVal}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isOutOfStock ? (
                              <Badge className="bg-rose-500/15 text-rose-800 border-rose-300 text-[11px]">
                                Out of Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 text-[11px]">
                                Low Stock (≤ 5)
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/admin/books`}>
                              <Button size="sm" variant="outline" className="h-8 text-xs font-bold text-[#0F3D3E]">
                                Restock Copies
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Reservations */}
        <TabsContent value="reservations" className="space-y-4 pt-4">
          <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Reservation ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Book Item</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Qty Reserved</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Expires At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingReservations ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                      </TableCell>
                    </TableRow>
                  ) : reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-[#5C6E6E]">
                        No active checkout reservations. Inventory copies are currently unlocked.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((r) => (
                      <TableRow key={r._id || r.id} className="text-xs">
                        <TableCell className="font-mono font-bold text-[#0F3D3E]">{r._id || r.id}</TableCell>
                        <TableCell>{r.book?.title || r.bookTitle || "Catalog Book"}</TableCell>
                        <TableCell className="text-center font-bold">{r.quantity || 1}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/15 text-blue-800 text-[10px]">{r.status || "HELD"}</Badge>
                        </TableCell>
                        <TableCell className="text-[#5C6E6E]">
                          {r.expiresAt ? new Date(r.expiresAt).toLocaleTimeString() : "15 mins"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Timeline Ledger */}
        <TabsContent value="timeline" className="space-y-4 pt-4">
          <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Timestamp</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Event Type</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Book Reference</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Delta</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Reason / Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTimeline ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                      </TableCell>
                    </TableRow>
                  ) : ledgerTimeline.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-[#5C6E6E]">
                        No stock delta events recorded in ledger timeline yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerTimeline.map((item, idx) => (
                      <TableRow key={item._id || idx} className="text-xs">
                        <TableCell className="text-[#5C6E6E]">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recent"}
                        </TableCell>
                        <TableCell className="font-bold text-[#0F3D3E]">{item.type || item.event || "STOCK_ADJUST"}</TableCell>
                        <TableCell>{item.book?.title || item.bookId || "N/A"}</TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {item.delta > 0 ? `+${item.delta}` : item.delta}
                        </TableCell>
                        <TableCell className="text-[#5C6E6E]">{item.reason || "Manual update"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
