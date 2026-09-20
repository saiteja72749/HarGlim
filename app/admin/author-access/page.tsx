"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  ShieldCheck,
  CreditCard,
  UserX,
  RotateCcw,
  Plus,
  AlertCircle,
  Loader2,
  X,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";

export default function AdminAuthorAccessPage() {
  const [activeTab, setActiveTab] = useState<"entitlements" | "plans" | "purchases">("entitlements");
  const [paidAccessFeatureEnabled, setPaidAccessFeatureEnabled] = useState(false);

  // Entitlements State
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);

  // Grant Modal State
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantReason, setGrantReason] = useState("Manual admin grant");
  const [submittingGrant, setSubmittingGrant] = useState(false);

  // Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "Author Dashboard Access",
    description: "One-time lifetime access to author publishing analytics & sales dashboard",
    amount: 999,
    currency: "INR",
    status: "ACTIVE",
  });
  const [submittingPlan, setSubmittingPlan] = useState(false);

  // Purchases State
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Check paid feature flag
  useEffect(() => {
    async function checkFeature() {
      try {
        const { data } = await api.get("/users/me/context").catch(() => ({ data: null }));
        const features = data?.data?.features || data?.features || {};
        if (features.paidAuthorDashboardAccess !== undefined) {
          setPaidAccessFeatureEnabled(Boolean(features.paidAuthorDashboardAccess));
        }
      } catch {
        // Fallback
      }
    }
    checkFeature();
  }, []);

  // Fetch Entitlements
  const fetchEntitlements = useCallback(async () => {
    setLoadingEntitlements(true);
    try {
      const res: any = await api.get("/admin/author-access/entitlements", { params: { limit: 50 } }).catch(() => null);
      const items = res?.data?.data?.entitlements || res?.data?.data?.items || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      setEntitlements(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Failed to fetch author entitlements:", err);
    } finally {
      setLoadingEntitlements(false);
    }
  }, []);

  // Fetch Plans
  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res: any = await api.get("/admin/author-access/plans").catch(() => null);
      const items = res?.data?.data?.plans || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      setPlans(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Failed to fetch author access plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  // Fetch Purchases
  const fetchPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const res: any = await api.get("/admin/author-access/purchases", { params: { limit: 50 } }).catch(() => null);
      const items = res?.data?.data?.purchases || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      setPurchases(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Failed to fetch author access purchases:", err);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "entitlements") fetchEntitlements();
    if (activeTab === "plans") fetchPlans();
    if (activeTab === "purchases") fetchPurchases();
  }, [activeTab, fetchEntitlements, fetchPlans, fetchPurchases]);

  // Manual Grant Action
  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId.trim()) {
      toast.error("User ID is required.");
      return;
    }
    setSubmittingGrant(true);
    try {
      await api.post("/admin/author-access/entitlements/grant", {
        userId: grantUserId.trim(),
        reason: grantReason.trim(),
      });
      toast.success("Author dashboard access granted successfully! 🛡️");
      setIsGrantModalOpen(false);
      setGrantUserId("");
      fetchEntitlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to grant access.");
    } finally {
      setSubmittingGrant(false);
    }
  };

  // Revoke Action
  const handleRevoke = async (userId: string) => {
    const reason = prompt("Enter reason for revoking author access:", "Admin revoked access");
    if (!reason) return;
    try {
      await api.post(`/admin/author-access/entitlements/${userId}/revoke`, { reason });
      toast.success("Author access revoked.");
      fetchEntitlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to revoke access.");
    }
  };

  // Restore Action
  const handleRestore = async (userId: string) => {
    try {
      await api.post(`/admin/author-access/entitlements/${userId}/restore`, {
        reason: "Admin restored access",
      });
      toast.success("Author access restored! ✅");
      fetchEntitlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to restore access.");
    }
  };

  // Create Plan Action
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPlan(true);
    try {
      await api.post("/admin/author-access/plans", planForm);
      toast.success("Author access plan created! 🏷️");
      setIsCreatePlanOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create plan.");
    } finally {
      setSubmittingPlan(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Author Dashboard Access
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Manage author entitlement grants, access plans, and purchase verification.
          </p>
        </div>
        <Button
          onClick={() => setIsGrantModalOpen(true)}
          className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2 shadow-xs"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Manual Access Grant</span>
        </Button>
      </div>

      {/* Feature Flag Banner */}
      {!paidAccessFeatureEnabled && (
        <Card className="border-amber-300 bg-amber-500/10 text-amber-900 rounded-2xl shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3 text-xs">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">Free Author Dashboard Mode Active</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Backend has <code className="font-mono bg-white/60 px-1 py-0.5 rounded">paidAuthorDashboardAccess=false</code>.
                Approved authors have unrestricted access to their analytics studio without mandatory plan purchase.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-[#E2E6DF]/60 p-1">
          <TabsTrigger value="entitlements" className="text-xs font-bold gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Entitlements</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs font-bold gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span>Access Plans</span>
          </TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs font-bold gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Purchases Queue</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Entitlements */}
        <TabsContent value="entitlements" className="space-y-4 pt-4">
          <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Author / User ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Source</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Granted At</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEntitlements ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                        <p className="text-xs text-[#5C6E6E] mt-2">Loading author entitlements...</p>
                      </TableCell>
                    </TableRow>
                  ) : entitlements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-[#5C6E6E]">
                        No author entitlements found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entitlements.map((ent) => {
                      const uId = ent.user?._id || ent.user?.id || ent.userId || ent._id;
                      const isActive = ent.status === "ACTIVE";
                      return (
                        <TableRow key={ent._id || uId} className="hover:bg-[#F8F9F7]/60 text-xs">
                          <TableCell>
                            <p className="font-bold text-[#0F3D3E]">{ent.user?.name || "Author Account"}</p>
                            <p className="font-mono text-[11px] text-[#5C6E6E]">{uId}</p>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-[#5C6E6E]">
                            {ent.source || "ADMIN_GRANT"}
                          </TableCell>
                          <TableCell className="text-center">
                            {isActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">
                                ACTIVE
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/15 text-rose-800 border-rose-300 text-[11px]">
                                {ent.status || "REVOKED"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[#5C6E6E]">
                            {ent.createdAt ? new Date(ent.createdAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevoke(uId)}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-7 gap-1"
                              >
                                <UserX className="h-3 w-3" />
                                <span>Revoke</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestore(uId)}
                                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs h-7 gap-1"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </Button>
                            )}
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

        {/* Tab 2: Plans */}
        <TabsContent value="plans" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setIsCreatePlanOpen(true)}
              className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Access Plan</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingPlans ? (
              <div className="col-span-3 py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
              </div>
            ) : plans.length === 0 ? (
              <Card className="col-span-3 p-8 text-center text-xs text-[#5C6E6E] border-[#E2E6DF]">
                No access plans created yet. Click "Create Access Plan" to define author entitlement tiers.
              </Card>
            ) : (
              plans.map((p) => (
                <Card key={p._id || p.id} className="border border-[#E2E6DF] bg-white rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#0F3D3E]">{p.name}</h4>
                    <Badge className="bg-emerald-500/15 text-emerald-800 text-[10px]">
                      {p.status || "ACTIVE"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5C6E6E] line-clamp-2">{p.description}</p>
                  <div className="pt-2 border-t border-[#E2E6DF] flex items-center justify-between">
                    <span className="text-xl font-serif font-bold text-[#0F3D3E]">
                      ₹{p.amount?.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#5C6E6E] uppercase font-mono">{p.currency || "INR"}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Purchases Queue */}
        <TabsContent value="purchases" className="space-y-4 pt-4">
          <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Purchase ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Author</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Amount</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPurchases ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                      </TableCell>
                    </TableRow>
                  ) : purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-xs text-[#5C6E6E]">
                        No pending author dashboard purchase intents recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchases.map((pc) => (
                      <TableRow key={pc._id || pc.id} className="text-xs">
                        <TableCell className="font-mono text-[#0F3D3E] font-bold">{pc._id || pc.id}</TableCell>
                        <TableCell>{pc.user?.name || pc.userId}</TableCell>
                        <TableCell className="font-bold">₹{(pc.amount || 999).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-500/15 text-amber-800 text-[10px]">
                            {pc.status || "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#5C6E6E]">
                          {pc.createdAt ? new Date(pc.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Grant Modal */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#0F3D3E]" />
                <h3 className="font-serif font-bold text-base text-[#0F3D3E]">Grant Author Access</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGrantModalOpen(false)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleGrant} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Author User ID (Mongo _id) *
                </label>
                <Input
                  placeholder="e.g. 6a5bc084122e8768e881f363"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="bg-[#F8F9F7] font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Grant Rationale / Notes
                </label>
                <Input
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="bg-[#F8F9F7]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGrantModalOpen(false)}
                  disabled={submittingGrant}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingGrant}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2"
                >
                  {submittingGrant ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Grant Access</span>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Create Plan Modal */}
      {isCreatePlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <Package className="h-5 w-5 text-[#0F3D3E]" />
                <h3 className="font-serif font-bold text-base text-[#0F3D3E]">Create Access Plan</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreatePlanOpen(false)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">Plan Name *</label>
                <Input
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="bg-[#F8F9F7]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">Description</label>
                <Textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="bg-[#F8F9F7] h-20 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">Amount (INR) *</label>
                <Input
                  type="number"
                  value={planForm.amount}
                  onChange={(e) => setPlanForm({ ...planForm, amount: Number(e.target.value) })}
                  className="bg-[#F8F9F7]"
                  min={0}
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreatePlanOpen(false)}
                  disabled={submittingPlan}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPlan}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2"
                >
                  {submittingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Save Plan</span>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
