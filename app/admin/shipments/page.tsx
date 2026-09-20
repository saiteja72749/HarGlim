"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  Truck,
  Search,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

const popularCouriers = [
  { name: "India Post (Speed Post)", prefix: "https://www.indiapost.gov.in/_layouts/15/dptcp.gear.uip/ItemTracking.aspx?ConsignmentId=" },
  { name: "DTDC Courier", prefix: "https://www.dtdc.in/tracking/tracking_results.asp?trackId=" },
  { name: "Delhivery", prefix: "https://www.delhivery.com/track/package/" },
  { name: "Blue Dart", prefix: "https://www.bluedart.com/tracking?trackNumber=" },
  { name: "Ekart Logistics", prefix: "https://ekartlogistics.com/shipmenttrack/" },
  { name: "Professional Couriers", prefix: "https://www.tpcindia.com/tracking.aspx?type=doc&docid=" },
  { name: "Other / Custom Courier", prefix: "" },
];

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Assign Courier Modal State
  const [selectedShipmentForCourier, setSelectedShipmentForCourier] = useState<any | null>(null);
  const [courierForm, setCourierForm] = useState({
    provider: "manual",
    serviceName: "India Post (Speed Post)",
    trackingNumber: "",
    trackingUrl: "",
    estimatedDelivery: "",
  });
  const [submittingCourier, setSubmittingCourier] = useState(false);

  // Update Status Modal State
  const [selectedShipmentForStatus, setSelectedShipmentForStatus] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("IN_TRANSIT");
  const [statusDescription, setStatusDescription] = useState("Package dispatched via courier");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (statusFilter !== "ALL") params.status = statusFilter;

      let res: any;
      if (searchQuery.trim()) {
        res = await api.get("/admin/shipments/search", { params: { q: searchQuery.trim() } }).catch(() =>
          api.get("/admin/shipments", { params: { search: searchQuery.trim(), ...params } })
        );
      } else {
        res = await api.get("/admin/shipments", { params });
      }

      const items =
        res?.data?.data?.shipments ||
        res?.data?.shipments ||
        (Array.isArray(res?.data?.data) ? res.data.data : []) ||
        (Array.isArray(res?.data) ? res.data : []);
      setShipments(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Shipments fetch notice:", err);
      // If shipments endpoint not yet seeded, set empty gracefully
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Open Assign Courier
  const openAssignModal = (shipment: any) => {
    setSelectedShipmentForCourier(shipment);
    const existingCourier = shipment.courierName || shipment.carrier || shipment.serviceName || "India Post (Speed Post)";
    const existingTracking = shipment.trackingNumber || shipment.trackingId || "";
    setCourierForm({
      provider: "manual",
      serviceName: existingCourier,
      trackingNumber: existingTracking,
      trackingUrl: shipment.trackingUrl || "",
      estimatedDelivery: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().split("T")[0] : "",
    });
  };

  // Auto-generate tracking URL when courier or tracking number changes
  const handleTrackingNumberChange = (val: string) => {
    const cleanNum = val.trim();
    const matched = popularCouriers.find((c) => c.name === courierForm.serviceName);
    const generatedUrl = matched && matched.prefix && cleanNum ? `${matched.prefix}${encodeURIComponent(cleanNum)}` : courierForm.trackingUrl;
    setCourierForm((prev) => ({
      ...prev,
      trackingNumber: cleanNum,
      trackingUrl: generatedUrl || prev.trackingUrl,
    }));
  };

  const handleCourierSelect = (service: string) => {
    const matched = popularCouriers.find((c) => c.name === service);
    const generatedUrl = matched && matched.prefix && courierForm.trackingNumber
      ? `${matched.prefix}${encodeURIComponent(courierForm.trackingNumber)}`
      : courierForm.trackingUrl;
    setCourierForm((prev) => ({
      ...prev,
      serviceName: service,
      trackingUrl: generatedUrl,
    }));
  };

  // Submit Assign Courier
  const handleAssignCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentForCourier) return;
    if (!courierForm.trackingNumber.trim()) {
      toast.error("Tracking Number / AWB is required.");
      return;
    }

    const shipmentId = selectedShipmentForCourier._id || selectedShipmentForCourier.id;
    setSubmittingCourier(true);

    try {
      const payload = {
        provider: courierForm.provider,
        serviceName: courierForm.serviceName,
        trackingNumber: courierForm.trackingNumber.trim(),
        trackingUrl: courierForm.trackingUrl.trim() || undefined,
        estimatedDelivery: courierForm.estimatedDelivery ? new Date(courierForm.estimatedDelivery).toISOString() : undefined,
      };

      await api.post(`/admin/shipments/${shipmentId}/assign-courier`, payload);
      toast.success("Courier assigned and tracking URL recorded! 🚚");
      setSelectedShipmentForCourier(null);
      fetchShipments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign courier.");
    } finally {
      setSubmittingCourier(false);
    }
  };

  // Submit Status Update
  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentForStatus) return;
    const shipmentId = selectedShipmentForStatus._id || selectedShipmentForStatus.id;
    setSubmittingStatus(true);
    try {
      await api.post(`/admin/shipments/${shipmentId}/update-status`, {
        status: newStatus,
        description: statusDescription,
      });
      toast.success(`Shipment updated to ${newStatus}! ✅`);
      setSelectedShipmentForStatus(null);
      fetchShipments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update shipment status.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Cancel Shipment
  const handleCancelShipment = async (shipment: any) => {
    const reason = prompt("Enter cancellation reason:", "Order cancelled by customer or admin");
    if (!reason) return;
    const sId = shipment._id || shipment.id;
    try {
      await api.post(`/admin/shipments/${sId}/cancel`, { reason });
      toast.success("Shipment cancelled.");
      fetchShipments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel shipment.");
    }
  };

  const getShipmentBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "DELIVERED":
        return <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">DELIVERED</Badge>;
      case "IN_TRANSIT":
      case "DISPATCHED":
        return <Badge className="bg-blue-500/15 text-blue-800 border-blue-300 text-[11px]">IN TRANSIT</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500/15 text-rose-800 border-rose-300 text-[11px]">CANCELLED</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 text-[11px]">{status || "CREATED"}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Shipments & Courier Tracking
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Assign external parcel couriers (India Post, DTDC, Delhivery), record tracking links, and update transit status.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search by tracking number or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["ALL", "CREATED", "IN_TRANSIT", "DELIVERED"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="text-xs"
              >
                {st}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Shipment ID / Order</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Courier & Service</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Tracking Number</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Est. Delivery</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading shipment records...</p>
                  </TableCell>
                </TableRow>
              ) : shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6E6E]">
                    No shipments found matching the active filter. Dispatched orders will appear here automatically.
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((s) => {
                  const sId = s._id || s.id;
                  const trackingNum = s.trackingNumber || s.trackingId || s.awb;
                  const trackingUrl = s.trackingUrl || (trackingNum ? `https://www.indiapost.gov.in/_layouts/15/dptcp.gear.uip/ItemTracking.aspx?ConsignmentId=${trackingNum}` : "");

                  return (
                    <TableRow key={sId} className="hover:bg-[#F8F9F7]/60 text-xs">
                      <TableCell>
                        <p className="font-bold text-sm text-[#0F3D3E]">{sId}</p>
                        <p className="text-[11px] font-mono text-[#5C6E6E]">
                          Order: {s.order?.orderNumber || s.orderNumber || s.orderId || "N/A"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-[#0F3D3E]">
                          {s.serviceName || s.courierName || s.carrier || "Courier Unassigned"}
                        </p>
                        <p className="text-[11px] text-[#5C6E6E] font-mono">{s.provider || "manual"}</p>
                      </TableCell>
                      <TableCell>
                        {trackingNum ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-[#0F3D3E] bg-[#0F3D3E]/5 px-2 py-0.5 rounded">
                              {trackingNum}
                            </span>
                            {trackingUrl && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <span>Track External</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#5C6E6E] italic">Pending courier assignment</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getShipmentBadge(s.status)}
                      </TableCell>
                      <TableCell className="text-[#5C6E6E]">
                        {s.estimatedDelivery
                          ? new Date(s.estimatedDelivery).toLocaleDateString()
                          : "TBD"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssignModal(s)}
                            className="h-8 text-xs font-bold text-[#0F3D3E] border-[#0F3D3E]/30"
                          >
                            <span>{trackingNum ? "Edit Courier" : "Assign Courier"}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedShipmentForStatus(s);
                              setNewStatus(s.status || "IN_TRANSIT");
                            }}
                            className="h-8 text-xs text-blue-700 border-blue-200"
                          >
                            Update Status
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelShipment(s)}
                            className="h-8 text-rose-600 hover:bg-rose-50"
                          >
                            Cancel
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

      {/* Assign Courier Modal */}
      {selectedShipmentForCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-[#0F3D3E]" />
                <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                  Assign Courier & Tracking Details
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedShipmentForCourier(null)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAssignCourierSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Courier Provider Service *
                </label>
                <Select
                  value={courierForm.serviceName}
                  onValueChange={handleCourierSelect}
                >
                  <SelectTrigger className="bg-[#F8F9F7]">
                    <SelectValue placeholder="Select courier service" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularCouriers.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Tracking Number / AWB Consignment Code *
                </label>
                <Input
                  placeholder="e.g. ED123456789IN or 128940348"
                  value={courierForm.trackingNumber}
                  onChange={(e) => handleTrackingNumberChange(e.target.value)}
                  className="bg-[#F8F9F7] font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Direct Tracking Webpage Link (Important)
                </label>
                <Input
                  placeholder="Auto-generated or custom tracking portal URL"
                  value={courierForm.trackingUrl}
                  onChange={(e) => setCourierForm({ ...courierForm, trackingUrl: e.target.value })}
                  className="bg-[#F8F9F7] font-mono text-xs"
                />
                <p className="text-[11px] text-[#5C6E6E]">
                  The customer will click this exact URL in "My Orders" to view live transit updates on the courier's website.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Estimated Delivery Date
                </label>
                <Input
                  type="date"
                  value={courierForm.estimatedDelivery}
                  onChange={(e) => setCourierForm({ ...courierForm, estimatedDelivery: e.target.value })}
                  className="bg-[#F8F9F7]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedShipmentForCourier(null)}
                  disabled={submittingCourier}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingCourier}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2"
                >
                  {submittingCourier ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Courier & Mark Shipped</span>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Update Status Modal */}
      {selectedShipmentForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                Update Shipment Status
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedShipmentForStatus(null)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleStatusUpdateSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">New Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-[#F8F9F7]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATED">CREATED</SelectItem>
                    <SelectItem value="IN_TRANSIT">IN_TRANSIT (Dispatched)</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</SelectItem>
                    <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">Description / Notes</label>
                <Input
                  value={statusDescription}
                  onChange={(e) => setStatusDescription(e.target.value)}
                  className="bg-[#F8F9F7]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedShipmentForStatus(null)}
                  disabled={submittingStatus}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingStatus}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold"
                >
                  {submittingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Update Status</span>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
