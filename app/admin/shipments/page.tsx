"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  Truck,
  Search,
  ExternalLink,
  Loader2,
  X,
  Layers,
  Globe,
  Package,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { DELIVERY_PLANS, resolveCourierTrackingUrl } from "@/lib/couriers";

export default function AdminShipmentsPage() {
  const [activeTab, setActiveTab] = useState<"shipments" | "plans">("shipments");
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Delivery Plans tab state
  const [planSearch, setPlanSearch] = useState("");
  const [selectedPlanCategory, setSelectedPlanCategory] = useState<string>("ALL");

  // Assign Courier Modal State
  const [selectedShipmentForCourier, setSelectedShipmentForCourier] = useState<any | null>(null);
  const [courierForm, setCourierForm] = useState({
    provider: "manual",
    serviceName: "India Post",
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
  const openAssignModal = (shipment: any, defaultCourier?: string) => {
    setSelectedShipmentForCourier(shipment);
    const existingCourier = defaultCourier || shipment.courierName || shipment.carrier || shipment.serviceName || "India Post";
    const existingTracking = shipment.trackingNumber || shipment.trackingId || "";
    const existingUrl = shipment.trackingUrl || resolveCourierTrackingUrl(existingCourier, existingTracking);

    setCourierForm({
      provider: "manual",
      serviceName: existingCourier,
      trackingNumber: existingTracking,
      trackingUrl: existingUrl,
      estimatedDelivery: shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toISOString().split("T")[0] : "",
    });
  };

  // Auto-generate tracking URL when courier or tracking number changes
  const handleTrackingNumberChange = (val: string) => {
    const cleanNum = val.trim();
    const generatedUrl = resolveCourierTrackingUrl(courierForm.serviceName, cleanNum);
    setCourierForm((prev) => ({
      ...prev,
      trackingNumber: cleanNum,
      trackingUrl: generatedUrl || prev.trackingUrl,
    }));
  };

  const handleCourierSelect = (service: string) => {
    const generatedUrl = resolveCourierTrackingUrl(service, courierForm.trackingNumber);
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
    
    // Digital Delivery doesn't require physical AWB tracking number
    const isDigital = courierForm.serviceName.toLowerCase().includes("digital");
    if (!isDigital && !courierForm.trackingNumber.trim() && !courierForm.trackingUrl.trim()) {
      toast.error("Tracking Number / AWB or tracking URL is required.");
      return;
    }

    const shipmentId = selectedShipmentForCourier._id || selectedShipmentForCourier.id;
    setSubmittingCourier(true);

    try {
      const finalTrackingNumber = courierForm.trackingNumber.trim() || (isDigital ? "DIGITAL-FULFILLMENT" : "");
      const payload = {
        provider: courierForm.provider,
        serviceName: courierForm.serviceName,
        courierName: courierForm.serviceName,
        trackingNumber: finalTrackingNumber,
        trackingUrl: courierForm.trackingUrl.trim() || undefined,
        estimatedDelivery: courierForm.estimatedDelivery ? new Date(courierForm.estimatedDelivery).toISOString() : undefined,
      };

      await api.post(`/admin/shipments/${shipmentId}/assign-courier`, payload);
      toast.success(`Assigned ${courierForm.serviceName} and tracking URL updated! 🚚`);
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

  // Filter Delivery Plans
  const filteredPlans = useMemo(() => {
    return DELIVERY_PLANS.filter((plan) => {
      const matchesCategory =
        selectedPlanCategory === "ALL" || plan.category.toLowerCase() === selectedPlanCategory.toLowerCase();
      const query = planSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        plan.name.toLowerCase().includes(query) ||
        plan.category.toLowerCase().includes(query) ||
        plan.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [planSearch, selectedPlanCategory]);

  const planCategories = [
    "ALL",
    "National Express",
    "Hyperlocal & Rapid",
    "Surface & Freight",
    "Cross-Border & Global",
    "Postal",
    "Digital / Virtual",
  ];

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "National Express":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Hyperlocal & Rapid":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Surface & Freight":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Cross-Border & Global":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Postal":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Digital / Virtual":
        return "bg-teal-50 text-teal-800 border-teal-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E] flex items-center gap-3">
            <Truck className="h-7 w-7 text-[#8A6D1E]" />
            <span>Shipments & Delivery Plans</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Dispatch orders, assign external courier tracking, and configure {DELIVERY_PLANS.length} active delivery plans.
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 bg-[#F8F9F7] p-1 rounded-xl border border-[#E2E6DF]">
          <Button
            size="sm"
            variant={activeTab === "shipments" ? "default" : "ghost"}
            onClick={() => setActiveTab("shipments")}
            className={
              activeTab === "shipments"
                ? "bg-[#0F3D3E] text-white hover:bg-[#174C4D] text-xs font-semibold gap-1.5"
                : "text-[#5C6E6E] hover:text-[#0F3D3E] text-xs gap-1.5"
            }
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Active Shipments</span>
            <span className="text-[10px] ml-1 px-1.5 py-0.2 rounded-full bg-white/20">
              {shipments.length}
            </span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === "plans" ? "default" : "ghost"}
            onClick={() => setActiveTab("plans")}
            className={
              activeTab === "plans"
                ? "bg-[#0F3D3E] text-white hover:bg-[#174C4D] text-xs font-semibold gap-1.5"
                : "text-[#5C6E6E] hover:text-[#0F3D3E] text-xs gap-1.5"
            }
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Delivery Plans & Categories</span>
            <span className="text-[10px] ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-900">
              {DELIVERY_PLANS.length}
            </span>
          </Button>
        </div>
      </div>

      {activeTab === "shipments" ? (
        <>
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
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {["ALL", "CREATED", "IN_TRANSIT", "DELIVERED"].map((st) => (
                  <Button
                    key={st}
                    variant={statusFilter === st ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(st)}
                    className={
                      statusFilter === st
                        ? "bg-[#0F3D3E] text-white hover:bg-[#174C4D] text-xs"
                        : "text-xs border-[#E2E6DF]"
                    }
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
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Delivery Plan & Partner</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Tracking Number / Link</TableHead>
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
                      <TableCell colSpan={6} className="h-36 text-center text-xs text-[#5C6E6E]">
                        <Package className="h-8 w-8 mx-auto text-[#5C6E6E]/40 mb-2" />
                        <p className="font-semibold text-[#0F3D3E]">No shipments found matching filter.</p>
                        <p className="text-[11px] text-[#5C6E6E] mt-0.5">
                          Orders marked as Shipped in Orders & Verification will show up here automatically.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipments.map((s) => {
                      const sId = s._id || s.id;
                      const cName = s.serviceName || s.courierName || s.carrier || "Courier Unassigned";
                      const trackingNum = s.trackingNumber || s.trackingId || s.awb;
                      const trackingUrl = s.trackingUrl || resolveCourierTrackingUrl(cName, trackingNum);

                      return (
                        <TableRow key={sId} className="hover:bg-[#F8F9F7]/60 text-xs">
                          <TableCell>
                            <p className="font-bold text-sm text-[#0F3D3E]">{sId}</p>
                            <p className="text-[11px] font-mono text-[#5C6E6E]">
                              Order: {s.order?.orderNumber || s.orderNumber || s.orderId || "N/A"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-bold text-[#0F3D3E] flex items-center gap-1.5">
                                <span>{cName}</span>
                              </p>
                              <span className="text-[10px] text-[#5C6E6E] font-mono bg-[#F8F9F7] px-1.5 py-0.5 rounded border border-[#E2E6DF]/80">
                                {s.provider || "Manual Courier"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {trackingNum ? (
                              <div className="space-y-1">
                                <span className="font-mono font-bold text-[#0F3D3E] bg-[#0F3D3E]/5 px-2 py-0.5 rounded border border-[#0F3D3E]/10">
                                  {trackingNum}
                                </span>
                                {trackingUrl && (
                                  <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold pt-0.5"
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
                                className="h-8 text-xs font-bold text-[#0F3D3E] border-[#0F3D3E]/30 hover:bg-[#0F3D3E]/5"
                              >
                                <span>{trackingNum ? "Edit Plan" : "Assign Plan"}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedShipmentForStatus(s);
                                  setNewStatus(s.status || "IN_TRANSIT");
                                }}
                                className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                Status
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
        </>
      ) : (
        /* Tab 2: Delivery Plans & Categories Catalog */
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-white border border-[#E2E6DF] rounded-2xl shadow-2xs p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] block">
                Total Delivery Plans
              </span>
              <p className="text-2xl font-serif font-bold text-[#0F3D3E] mt-1">
                {DELIVERY_PLANS.length}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
                100% Active in Admin Dispatch
              </span>
            </Card>

            <Card className="bg-white border border-[#E2E6DF] rounded-2xl shadow-2xs p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] block">
                National Express
              </span>
              <p className="text-2xl font-serif font-bold text-blue-800 mt-1">
                {DELIVERY_PLANS.filter((p) => p.category === "National Express").length}
              </p>
              <span className="text-[11px] text-[#5C6E6E] font-medium mt-0.5 block">
                BlueDart, Delhivery, DTDC, etc.
              </span>
            </Card>

            <Card className="bg-white border border-[#E2E6DF] rounded-2xl shadow-2xs p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] block">
                Hyperlocal & Rapid
              </span>
              <p className="text-2xl font-serif font-bold text-amber-800 mt-1">
                {DELIVERY_PLANS.filter((p) => p.category === "Hyperlocal & Rapid").length}
              </p>
              <span className="text-[11px] text-[#5C6E6E] font-medium mt-0.5 block">
                BLITZ, Shadowfax, Zippee, etc.
              </span>
            </Card>

            <Card className="bg-white border border-[#E2E6DF] rounded-2xl shadow-2xs p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] block">
                Surface & Cross-Border
              </span>
              <p className="text-2xl font-serif font-bold text-indigo-800 mt-1">
                {DELIVERY_PLANS.filter((p) => p.category === "Surface & Freight" || p.category === "Cross-Border & Global").length}
              </p>
              <span className="text-[11px] text-[#5C6E6E] font-medium mt-0.5 block">
                Safexpress, DPWorld, Gati, etc.
              </span>
            </Card>
          </div>

          {/* Search & Category Filter Pills */}
          <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                <Input
                  placeholder="Search delivery plan or courier service..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="pl-9 text-xs bg-[#F8F9F7]"
                />
              </div>
              <span className="text-xs text-[#5C6E6E]">
                Showing <strong className="text-[#0F3D3E]">{filteredPlans.length}</strong> of {DELIVERY_PLANS.length} providers
              </span>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {planCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedPlanCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                    selectedPlanCategory === cat
                      ? "bg-[#0F3D3E] text-white border-[#0F3D3E] shadow-2xs"
                      : "bg-[#F8F9F7] text-[#5C6E6E] border-[#E2E6DF] hover:bg-neutral-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          {/* Delivery Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan) => (
              <Card
                key={plan.id}
                className="bg-white border border-[#E2E6DF] rounded-2xl shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-serif font-bold text-[#0F3D3E]">
                        {plan.name}
                      </CardTitle>
                      <Badge className={`mt-1 text-[10px] font-semibold border ${getCategoryBadgeClass(plan.category)}`}>
                        {plan.category}
                      </Badge>
                    </div>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <CardDescription className="text-xs text-[#5C6E6E] mt-2 line-clamp-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="p-2.5 bg-[#F8F9F7] rounded-xl border border-[#E2E6DF]/80 text-[11px] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block">
                      Tracking Integration
                    </span>
                    {plan.prefix ? (
                      <p className="font-mono text-[10px] text-[#0F3D3E] truncate">
                        {plan.prefix}&#123;AWB&#125;
                      </p>
                    ) : plan.name === "Digital Delivery" ? (
                      <p className="text-teal-700 font-medium text-[11px]">
                        Instant eBook / Portal Digital Delivery (No AWB needed)
                      </p>
                    ) : (
                      <p className="text-[#5C6E6E] italic text-[11px]">
                        Custom / Manual Tracking Portal
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E2E6DF]/60">
                    {plan.website ? (
                      <a
                        href={plan.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#8A6D1E] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Globe className="h-3 w-3" />
                        <span>Carrier Portal</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#5C6E6E]">Local / System</span>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveTab("shipments");
                        toast.success(`Selected ${plan.name} for dispatch assignments!`);
                      }}
                      className="h-7 text-xs text-[#0F3D3E] font-bold gap-1 hover:bg-[#0F3D3E]/5"
                    >
                      <span>Use in Dispatch</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assign Courier / Delivery Plan Modal */}
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
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                    Assign Delivery Plan & Tracking
                  </h3>
                  <p className="text-[11px] text-[#5C6E6E]">
                    Choose from {DELIVERY_PLANS.length} supported courier delivery partners.
                  </p>
                </div>
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
                  Delivery Plan / Courier Service *
                </label>
                <Select
                  value={courierForm.serviceName}
                  onValueChange={handleCourierSelect}
                >
                  <SelectTrigger className="bg-[#F8F9F7] h-10">
                    <SelectValue placeholder="Select delivery plan / courier partner" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 bg-white">
                    {DELIVERY_PLANS.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        <div className="flex items-center justify-between gap-3 w-full py-0.5">
                          <span className="font-semibold text-xs text-[#0F3D3E]">{c.name}</span>
                          <span className="text-[10px] text-[#5C6E6E] px-1.5 py-0.2 rounded bg-neutral-100 border border-[#E2E6DF]">
                            {c.category}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center justify-between">
                  <span>Tracking Number / AWB Consignment Code</span>
                  {courierForm.serviceName.toLowerCase().includes("digital") && (
                    <span className="text-[10px] text-teal-700 font-normal">Optional for Digital Delivery</span>
                  )}
                </label>
                <Input
                  placeholder={
                    courierForm.serviceName.toLowerCase().includes("digital")
                      ? "DIGITAL-FULFILLMENT (Optional)"
                      : "e.g. ED123456789IN or 128940348"
                  }
                  value={courierForm.trackingNumber}
                  onChange={(e) => handleTrackingNumberChange(e.target.value)}
                  className="bg-[#F8F9F7] font-mono text-sm"
                  required={!courierForm.serviceName.toLowerCase().includes("digital")}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Direct Tracking Webpage Link (Auto-Generated)
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
                  {submittingCourier ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Plan & Dispatch</span>}
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
