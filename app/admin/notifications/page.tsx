"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Search,
  RotateCcw,
  Mail,
  Smartphone,
  Loader2,
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

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let res: any;
      if (searchQuery.trim()) {
        res = await api.get("/admin/notifications/search", { params: { q: searchQuery.trim() } }).catch(() =>
          api.get("/admin/notifications", { params: { search: searchQuery.trim(), limit: 50 } })
        );
      } else {
        res = await api.get("/admin/notifications", { params: { limit: 50 } }).catch(() => null);
      }

      const items = res?.data?.data?.notifications || res?.data?.notifications || (Array.isArray(res?.data?.data) ? res.data.data : []) || [];
      setNotifications(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Notifications fetch notice:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Retry notification: POST /api/admin/notifications/:id/retry
  const handleRetry = async (notificationId: string) => {
    setRetryingId(notificationId);
    try {
      await api.post(`/admin/notifications/${notificationId}/retry`, {
        reason: "Manual admin retry",
        force: false,
      });
      toast.success("Notification redelivery queued! 📬");
      fetchNotifications();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to retry notification.");
    } finally {
      setRetryingId(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const recipient = (n.recipient || n.email || n.phone || "").toLowerCase();
    const subject = (n.subject || n.title || n.type || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return recipient.includes(q) || subject.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Notification Delivery Logs
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Track automated order confirmations, author status updates, and dispatch retries for failed email/SMS alerts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search recipient email or notification subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <p className="text-xs text-[#5C6E6E]">
            Total Logs: <span className="font-bold text-[#0F3D3E]">{notifications.length}</span>
          </p>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Event / Subject</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Channel</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Recipient</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Sent At</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading notification logs...</p>
                  </TableCell>
                </TableRow>
              ) : filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6E6E]">
                    No notification logs matching criteria. Automated email and SMS events will appear here in real-time.
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications.map((notif) => {
                  const nId = notif._id || notif.id;
                  const isSuccess = notif.status === "DELIVERED" || notif.status === "SENT";
                  const isFailed = notif.status === "FAILED" || notif.status === "ERROR";

                  return (
                    <TableRow key={nId} className="hover:bg-[#F8F9F7]/60 text-xs">
                      <TableCell>
                        <p className="font-bold text-sm text-[#0F3D3E]">{notif.subject || notif.title || notif.type}</p>
                        <p className="text-[11px] text-[#5C6E6E] font-mono">{notif.templateId || "system-template"}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-[#5C6E6E]">
                          {notif.channel === "SMS" ? <Smartphone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          <span>{notif.channel || "EMAIL"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#0F3D3E]">
                        {notif.recipient || notif.email || notif.phone || "Customer"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSuccess ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 text-[10px]">DELIVERED</Badge>
                        ) : isFailed ? (
                          <Badge className="bg-rose-500/15 text-rose-800 text-[10px]">FAILED</Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-800 text-[10px]">{notif.status || "QUEUED"}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[#5C6E6E]">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : "Recent"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isFailed ? (
                          <Button
                            size="sm"
                            onClick={() => handleRetry(nId)}
                            disabled={retryingId === nId}
                            className="h-7 text-xs bg-[#0F3D3E] text-white gap-1"
                          >
                            {retryingId === nId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            <span>Retry</span>
                          </Button>
                        ) : (
                          <span className="text-[#5C6E6E] text-[11px]">Logged</span>
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
    </div>
  );
}
