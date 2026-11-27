"use client";

import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError } from "@/lib/api-error";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { accountActive, accountId, accountRole, adminResponse, adminRows, adminUserRecord, verifyAdminAccount } from "@/lib/admin-account-api";
import { notifyLiveChange } from "@/lib/live-sync";
import { announceInvite, resendAuthorInvite } from "@/lib/admin-authors";
import { ErrorState } from "@/components/ui/error-state";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Ban,
  Shield,
  Trash2,
  Pencil,
  UserPlus,
  X,
  Check,
  Loader2,
  KeyRound,
  Send,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";



const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-emerald-500/10 text-emerald-600";
    case "Suspended":
      return "bg-red-500/10 text-red-600";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case "admin":
      return "bg-primary text-primary-foreground";
    case "author":
      return "bg-blue-500/10 text-blue-600";
    case "reader":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const accountStatus = (user: AdminUser) => {
  const active = accountActive(user);
  return active === undefined ? "Unavailable" : active ? "Active" : "Suspended";
};

type AdminUser = {
  _id: string;
  id?: string;
  createdAt?: string;
  email?: string;
  fullName?: string;
  name?: string;
  isActive?: boolean;
  joinDate?: string;
  orders?: number;
  role?: string;
  spent?: number;
  status?: string;
};

export default function AdminUsersPage() {
  const pendingAccounts = useRef(new Set<string>());
  const pendingCreate = useRef(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter !== "all") params.role = roleFilter.toLowerCase();
      if (statusFilter !== "all") {
        params.isActive = statusFilter === "Active" ? "true" : "false";
      }

      const { data } = await api.get("/admin/users", { params, cache: "no-store" });
      setUsers(adminRows<AdminUser>(data, "users").filter(user => Boolean(accountId(user))));
    } catch (err) {
      console.error("Failed to fetch admin users:", describeApiError(err));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery, statusFilter]);

  useEffect(() => scheduleRequest(fetchUsers), [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const name = user.name || user.fullName || "";
    const email = user.email || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    const userRole = accountRole(user.role);
    const matchesRole = roleFilter === "all" || userRole === roleFilter.toLowerCase();
    const userStatus = accountStatus(user);
    const matchesStatus = statusFilter === "all" || userStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesRole && matchesStatus;
  });

  const currentLoggedInUser = useAuthStore((state) => state.user);
  const currentUserId = currentLoggedInUser?._id || currentLoggedInUser?.id;

  // Create User State (POST /api/admin/users)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "reader",
    isActive: true,
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingCreate.current) return;
    // An author needs no password: leaving it empty emails them a set-password invitation.
    const inviteAuthor = createForm.role === "author" && !createForm.password;
    if (!createForm.name.trim() || !createForm.email.trim() || (!createForm.password && !inviteAuthor)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    pendingCreate.current = true;
    setIsSubmittingCreate(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        ...(inviteAuthor ? {} : { password: createForm.password }),
        role: createForm.role === "user" ? "reader" : createForm.role,
        isActive: Boolean(createForm.isActive),
      };

      const { data } = await api.post("/admin/users", payload);
      const created = adminUserRecord(data);
      const id = accountId(created);
      if (!id) throw new Error("The backend did not return a confirmed account ID. Refresh Users & Accounts before retrying.");
      await verifyAdminAccount(id, payload);
      announceInvite({
        email: typeof created.email === "string" ? created.email : payload.email,
        invited: created.invited === true,
        emailSent: typeof created.emailSent === "boolean" ? created.emailSent : undefined,
      });
      toast.success(`User "${createForm.name}" created.`);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "reader",
        isActive: true,
      });
      await fetchUsers();
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      console.error("Failed to create user:", describeApiError(err));
      if (err.response?.status === 409) {
        toast.error("A user with this email address already exists (409 Conflict).");
      } else {
        toast.error(err.response?.data?.message || err.message);
      }
    } finally {
      pendingCreate.current = false;
      setIsSubmittingCreate(false);
    }
  };

  // Edit & Delete State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "user",
    status: "Active",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset Password State (POST /api/admin/users/:id/reset-password)
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    const targetUserId = accountId(resetPasswordUser);
    if (!targetUserId || pendingAccounts.current.has(targetUserId)) return;
    pendingAccounts.current.add(targetUserId);
    setIsSubmittingReset(true);
    try {
      const { data } = await api.post(`/admin/users/${encodeURIComponent(targetUserId)}/reset-password`, {
        password: newPasswordInput,
      });
      adminResponse(data);
      toast.success(`Password reset successfully for ${resetPasswordUser.name}! 🔑`);
      setResetPasswordUser(null);
      setNewPasswordInput("");
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(err.response?.data?.message || err.message);
    } finally {
      pendingAccounts.current.delete(targetUserId);
      setIsSubmittingReset(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!id || pendingAccounts.current.has(id)) return;
    if (id === currentUserId) {
      toast.error("You cannot delete or deactivate your own logged-in account.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to deactivate user "${name}"? This performs a production-safe soft delete preserving order history, payments, and book credits.`
      )
    ) {
      return;
    }
    pendingAccounts.current.add(id);
    setDeletingId(id);
    try {
      const { data } = await api.delete(`/admin/users/${encodeURIComponent(id)}`);
      adminResponse(data);
      await verifyAdminAccount(id, { isActive: false });
      notifyLiveChange("account-access", false);

      toast.success(`User "${name}" deactivated (soft deleted) successfully.`);
      await fetchUsers();
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      console.error("Failed to delete user:", describeApiError(err));
      toast.error(err.response?.data?.message || err.message);
    } finally {
      pendingAccounts.current.delete(id);
      setDeletingId(null);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || user.fullName || "",
      email: user.email || "",
      role: accountRole(user.role),
      status: accountStatus(user),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const userId = accountId(editingUser);
    if (!userId || pendingAccounts.current.has(userId)) return;
    if (userId === currentUserId) {
      toast.error("Ask another administrator to change your account role or status.");
      return;
    }
    const role = accountRole(editForm.role);
    if (!["reader", "author", "admin", "visitor"].includes(role) || !["Active", "Suspended"].includes(editForm.status)) {
      toast.error("Select a valid role and account status.");
      return;
    }
    pendingAccounts.current.add(userId);
    setIsSubmittingEdit(true);

    try {
      // PATCH /admin/users/{id} accepts role and isActive/status only; name and email are
      // owned by the user's own profile, so they are shown read-only in this form.
      const expected = { role, isActive: editForm.status === "Active" };
      const { data } = await api.patch(`/admin/users/${encodeURIComponent(userId)}`, expected);
      adminResponse(data);
      await verifyAdminAccount(userId, expected);
      notifyLiveChange("account-access", false);

      toast.success(`User details for "${editForm.name}" updated successfully!`);
      setEditingUser(null);
      await fetchUsers();
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      console.error("Failed to update user details:", describeApiError(err));
      toast.error(err.response?.data?.message || err.message);
    } finally {
      pendingAccounts.current.delete(userId);
      setIsSubmittingEdit(false);
    }
  };

  const handleSuspend = async (id: string, currentStatus: string) => {
    if (!id || pendingAccounts.current.has(id) || currentStatus === "Unavailable") return;
    if (id === currentUserId) {
      toast.error("Ask another administrator to change your account status.");
      return;
    }
    const isActive = currentStatus === "Suspended";
    pendingAccounts.current.add(id);
    try {
      const { data } = await api.patch(`/admin/users/${encodeURIComponent(id)}/status`, { isActive });
      adminResponse(data);
      await verifyAdminAccount(id, { isActive });
      notifyLiveChange("account-access", false);
      toast.success(isActive ? "Account activated." : "Account suspended.");
      await fetchUsers();
    } catch (caughtError) {
      const error = describeApiError(caughtError);
      toast.error(error.response?.data.message || error.message);
    } finally {
      pendingAccounts.current.delete(id);
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Could not load users"
        message="We encountered an issue fetching the users list. Please try again."
        onRetry={fetchUsers}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform users, roles, and credentials
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-primary text-primary-foreground font-bold">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => accountActive(u) === true).length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => accountRole(u.role) === "author").length}
                </p>
                <p className="text-sm text-muted-foreground">Authors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <Ban className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => accountActive(u) === false).length}
                </p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Shield className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="reader">Reader</SelectItem>
                <SelectItem value="Author">Author</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user, index) => {
                  const status = accountStatus(user);
                  const role = accountRole(user.role) || "Unavailable";
                  return (
                    <motion.tr
                      key={accountId(user)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium uppercase">
                            {(user.name || "?").charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(role)}>{role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{user.orders ?? "Unavailable"}</TableCell>
                      <TableCell className="text-right">
                        {user.spent == null ? "Unavailable" : `₹${user.spent.toLocaleString("en-IN")}`}
                      </TableCell>
                      <TableCell>
                        {(user.createdAt || user.joinDate) ? new Date(user.createdAt || user.joinDate || "").toLocaleDateString() : "Unavailable"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                      </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(user)}
                          title="Edit User"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(accountId(user), user.name || "User")}
                          disabled={deletingId === (accountId(user))}
                          title="Delete User"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === (accountId(user)) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEditModal(user)}>
                              <Pencil className="mr-2 h-4 w-4 text-primary" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setResetPasswordUser(user);
                              setNewPasswordInput("");
                            }}>
                              <KeyRound className="mr-2 h-4 w-4 text-[#D4AF37]" />
                              Reset Password
                            </DropdownMenuItem>
                            {String(role).toLowerCase() === "author" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  resendAuthorInvite(accountId(user)).catch((err: unknown) =>
                                    toast.error(describeApiError(err).response?.data.message || "Could not resend the invitation.")
                                  )
                                }
                              >
                                <Send className="mr-2 h-4 w-4 text-primary" />
                                Resend Invite
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${user.email}`}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={
                                status !== "Suspended"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }
                              disabled={status === "Unavailable" || accountId(user) === currentUserId}
                              onClick={() => handleSuspend(accountId(user), status)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              {status !== "Suspended" ? "Suspend Account" : "Activate Account"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive font-semibold"
                              onClick={() => handleDeleteUser(accountId(user), user.name || "User")}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </motion.tr>
                );})}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold font-serif text-foreground">Edit User Profile</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingUser(null)}
                aria-label="Close"
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Full Name
                </label>
                <Input value={editForm.name} readOnly disabled />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Email Address
                </label>
                <Input type="email" value={editForm.email} readOnly disabled />
                <p className="text-[11px] text-muted-foreground">
                  Name and email are changed by the user from their own profile. Admins can change role and status.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    User Role
                  </label>
                  <Select
                    value={editForm.role}
                    onValueChange={(val) => setEditForm({ ...editForm, role: val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reader">Reader</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="visitor">Visitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Account Status
                  </label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="gap-2 bg-primary text-primary-foreground font-bold"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Create User Modal (POST /api/admin/users) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Add New User</h2>
                  <p className="text-xs text-muted-foreground">
                    Provision a new reader, author, or admin account
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmittingCreate}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Full Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Vikram Seth"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Email Address *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. vikram@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  {createForm.role === "author" ? "Password (optional)" : "Password *"}
                </label>
                <Input
                  type="password"
                  required={createForm.role !== "author"}
                  placeholder={createForm.role === "author" ? "Leave empty to email a set-password invitation" : "Enter strong password (min 6 chars)"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Account Role
                  </label>
                  <Select
                    value={createForm.role}
                    onValueChange={(val) => setCreateForm({ ...createForm, role: val })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reader">Reader (User)</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Initial Status
                  </label>
                  <Select
                    value={createForm.isActive ? "Active" : "Suspended"}
                    onValueChange={(val) => setCreateForm({ ...createForm, isActive: val === "Active" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="gap-2 bg-primary text-primary-foreground font-bold"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Create User</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal (POST /api/admin/users/:id/reset-password) */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-foreground">Reset Password</h3>
                  <p className="text-xs text-muted-foreground">{resetPasswordUser.name} ({resetPasswordUser.email})</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setResetPasswordUser(null)}
                className="h-8 w-8 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter new strong password (min 6 chars)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="bg-background text-sm"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  This will immediately update the user password on the backend.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordUser(null)}
                  disabled={isSubmittingReset}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2"
                >
                  {isSubmittingReset ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Set New Password</span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
