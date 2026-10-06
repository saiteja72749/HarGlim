"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, ShieldCheck, QrCode, ArrowRight, Loader2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api, { bootstrapUserContext } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { canOpenAuthorDashboard, isPaidAuthorDashboardEnabled } from "@/lib/author-access";
import toast from "react-hot-toast";

/**
 * Paid author dashboard access is switched off on the backend
 * (AUTHOR_DASHBOARD_PAID_ACCESS_ENABLED=false). The purchase / QR / UTR flow is
 * only mounted when /users/me/context reports features.paidAuthorDashboardAccess === true;
 * otherwise nothing here calls the purchase endpoints and the user is sent on.
 */
export default function PurchaseDashboardAccessPage() {
  const router = useRouter();
  const { user, userContext, contextStatus } = useAuthStore();
  const contextSettled = contextStatus === "ready" || contextStatus === "error";
  const paidEnabled = isPaidAuthorDashboardEnabled(userContext);

  useEffect(() => {
    if (!contextSettled || paidEnabled) return;
    router.replace(canOpenAuthorDashboard(user, userContext) ? "/author" : "/dashboard/become-author");
  }, [contextSettled, paidEnabled, user, userContext, router]);

  if (!contextSettled || !paidEnabled) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {contextSettled
            ? "The author dashboard is free for approved authors. Redirecting..."
            : "Checking your author access..."}
        </p>
      </div>
    );
  }

  return <PaidDashboardAccessPurchase />;
}

function PaidDashboardAccessPurchase() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [purchase, setPurchase] = useState<any>(null);

  const [purchasing, setPurchasing] = useState(false);
  const [utr, setUtr] = useState("");
  const [verifying, setVerifying] = useState(false);

  // 1. Load current author access state & plans
  const loadAccessState = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/authors/me/dashboard-access");
      const resData = data.data || data;

      setAccessState(resData);
      setActivePlan(resData.activePlan || {
        name: "Author Analytics Pro Plan",
        amount: 2999,
        currency: "INR",
        description: "Lifetime analytics & royalty tracking access",
      });

      if (resData.purchase) {
        setPurchase(resData.purchase);
      }
    } catch (err: any) {
      console.warn("Failed to load dashboard access status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessState();
  }, []);

  // 2. Trigger purchase creation
  const handleInitiatePurchase = async () => {
    setPurchasing(true);
    try {
      const { data } = await api.post("/authors/me/dashboard-access/purchase");
      const purchaseData = data.data || data;

      setPurchase(purchaseData);
      toast.success("Payment intent created! Please complete UPI payment.");
      loadAccessState();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.error === "AUTHOR_DASHBOARD_PAID_ACCESS_DISABLED") {
        // Flag was switched off after this page loaded: the dashboard is free now.
        toast.success("The author dashboard is now free for approved authors.");
        await bootstrapUserContext();
        router.replace("/author");
        return;
      }
      toast.error(err.response?.data?.message || "Failed to initiate purchase.");
    } finally {
      setPurchasing(false);
    }
  };

  // 3. Submit UTR for verification
  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUtr = utr.trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6) {
      toast.error("Please enter a valid UTR number (at least 6 characters).");
      return;
    }

    const purchaseId = purchase?._id || purchase?.id;
    if (!purchaseId) {
      toast.error("Purchase reference missing.");
      return;
    }

    setVerifying(true);
    try {
      await api.put(`/authors/me/dashboard-access/purchases/${purchaseId}/verify-payment`, {
        utr: cleanUtr,
      });

      toast.success("UTR submitted! Admin will verify your payment shortly.");
      setUtr("");
      loadAccessState();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit UTR reference.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking author dashboard access state...</p>
      </div>
    );
  }

  const isAlreadyActive = accessState?.state === "ACTIVE";
  const isVerificationPending = purchase?.status === "VERIFICATION_PENDING" || accessState?.state === "VERIFICATION_PENDING";

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Author Analytics Upgrade</span>
        </div>
        <h1 className="text-3xl font-bold font-serif text-foreground">
          Unlock Author Dashboard & Royalty Analytics
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Gain full visibility into real-time book sales time-series, accrued royalties, performance breakdowns, and settlement payouts.
        </p>
      </div>

      {isAlreadyActive ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl bg-card border border-emerald-500/30 text-center space-y-4 shadow-sm"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard Access Active</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You have active author dashboard access! You can view all metrics, analytics, and royalty settlements.
          </p>
          <Button onClick={() => router.push("/author")} className="gap-2 mt-2">
            <span>Go to Author Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      ) : isVerificationPending ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl bg-card border border-amber-500/30 text-center space-y-4 shadow-sm"
        >
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Payment Verification Pending</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your payment reference <strong className="text-foreground">{purchase?.utr || "submitted"}</strong> is currently being verified by our admin team. Access will be unlocked automatically upon approval.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button onClick={loadAccessState} variant="outline" size="sm">
              Refresh Status
            </Button>
            <Button onClick={() => router.push("/author/books")} size="sm" variant="ghost">
              Continue to Book Publishing (Free)
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Plan Summary Card */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-6 shadow-sm">
            <div>
              <h3 className="text-xl font-bold text-foreground">{activePlan?.name || "Author Pro Plan"}</h3>
              <p className="text-xs text-muted-foreground mt-1">One-time dashboard analytics entitlement</p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-foreground">
                ₹{activePlan?.amount || 2999}
              </span>
              <span className="text-xs text-muted-foreground">INR (inclusive of taxes)</span>
            </div>

            <div className="space-y-3 pt-2 text-sm text-muted-foreground border-t border-border/80">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Real-time Sales & Revenue Analytics</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Accrued & Settled Royalty Ledger</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Book Performance Metrics Breakdown</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Settlement Batch & Payout History</span>
              </div>
            </div>

            {!purchase && (
              <Button
                onClick={handleInitiatePurchase}
                disabled={purchasing}
                className="w-full h-11 font-medium shadow-md"
              >
                {purchasing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating QR...
                  </span>
                ) : (
                  "Proceed to UPI Payment"
                )}
              </Button>
            )}
          </div>

          {/* Payment QR & UTR Submission Form */}
          {purchase ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl bg-card border border-primary/30 space-y-6 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div>
                  <h3 className="font-bold text-foreground">Scan UPI QR Code</h3>
                  <p className="text-xs text-muted-foreground">Complete payment using any UPI app</p>
                </div>
                <QrCode className="h-6 w-6 text-primary" />
              </div>

              {/* QR Image preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-xl border border-border text-center space-y-3">
                {purchase?.qrMetadata?.qrCodeUrl || purchase?.qrMetadata?.qrCodeDataUrl || purchase?.qrCodeDataUrl ? (
                  <Image
                    src={purchase?.qrMetadata?.qrCodeUrl || purchase?.qrMetadata?.qrCodeDataUrl || purchase?.qrCodeDataUrl}
                    alt="UPI QR Code"
                    width={176}
                    height={176}
                    className="w-44 h-44 object-contain rounded-lg bg-white p-2 border"
                  />
                ) : (
                  <div className="w-44 h-44 bg-white rounded-lg p-3 border flex flex-col items-center justify-center text-center">
                    <QrCode className="h-20 w-20 text-slate-800 mb-1" />
                    <span className="text-[10px] text-slate-600 font-mono">paytmqr123456789</span>
                  </div>
                )}

                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">UPI ID: {purchase?.qrMetadata?.upiId || "harglim@upi"}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">Amount: ₹{purchase?.amount || activePlan?.amount || 2999}</p>
                </div>
              </div>

              {/* UTR Form */}
              <form onSubmit={handleVerifyUtr} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="utr" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Enter UTR / Transaction Reference
                  </Label>
                  <Input
                    id="utr"
                    type="text"
                    placeholder="e.g. 423910293847"
                    className="h-11 bg-background"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Found in your UPI app payment receipt (Google Pay, PhonePe, Paytm, BHIM)
                  </p>
                </div>

                <Button type="submit" disabled={verifying} className="w-full h-11 font-medium">
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting UTR...
                    </span>
                  ) : (
                    "Submit UTR Reference"
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-border/80 flex flex-col items-center justify-center text-center space-y-3 min-h-[320px]">
              <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Ready to Upgrade?</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Click &quot;Proceed to UPI Payment&quot; to generate your payment QR code.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
