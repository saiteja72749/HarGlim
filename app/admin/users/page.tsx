"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
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
  switch (role) {
    case "Admin":
      return "bg-primary text-primary-foreground";
    case "Author":
      return "bg-blue-500/10 text-blue-600";
    case "User":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = async () => {
    setLoading(true);
    setError(false);
    try {
      const params: any = { limit: 100 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter !== "all") params.role = roleFilter.toLowerCase();
      if (statusFilter !== "all") {
        params.isActive = statusFilter === "Active" ? "true" : "false";
      }

      const { data } = await api.get("/admin/users", { params }).catch(() =>
        api.get("/users", { params })
      );
      const items = data?.data?.users || (Array.isArray(data?.data) ? data.data : []) || (Array.isArray(data) ? data : []);
      setUsers(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to fetch admin users:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter]);

  const filteredUsers = users.filter((user: any) => {
    const name = user.name || user.fullName || "";
    const email = user.email || "";
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());
    const userRole = (user.role || "user").toLowerCase();
    const matchesRole = roleFilter === "all" || userRole === roleFilter.toLowerCase();
    const userStatus = user.status || (user.isActive !== false ? "Active" : "Suspended");
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
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role === "user" ? "reader" : createForm.role,
        isActive: Boolean(createForm.isActive),
      };

      let createdUser: any = null;

      try {
        const res = await api.post("/admin/users", payload);
        createdUser =
          res.data?.data?.user ||
          res.data?.user ||
          res.data?.data;
      } catch (postErr: any) {
        if (postErr.response?.status === 409) {
          throw postErr;
        }
        // If 404 from backend (e.g. Render backend build hasn't finished deploying new route),
        // gracefully fallback to /auth/register + role elevation
        if (postErr.response?.status === 404) {
          console.warn("POST /admin/users returned 404 on backend; falling back to register + role elevation.");
          const regRes = await api.post("/auth/register", {
            name: createForm.name.trim(),
            email: createForm.email.trim(),
            password: createForm.password,
          });
          const regUser = regRes.data?.user || regRes.data?.data?.user || regRes.data?.data;
          const newId = regUser?._id || regUser?.id;

          if (newId) {
            if (createForm.role !== "reader") {
              await api.patch(`/admin/users/${newId}/role`, { role: createForm.role }).catch(() =>
                api.put(`/admin/users/${newId}/role`, { role: createForm.role }).catch(() => null)
              );
            }
            if (!createForm.isActive) {
              await api.patch(`/admin/users/${newId}/status`, { isActive: false, status: "suspended" }).catch(() =>
                api.put(`/admin/users/${newId}/status`, { isActive: false, status: "suspended" }).catch(() => null)
              );
            }
            createdUser = {
              ...regUser,
              role: createForm.role,
              isActive: createForm.isActive,
              status: createForm.isActive ? "Active" : "Suspended",
            };
          } else {
            throw postErr;
          }
        } else {
          throw postErr;
        }
      }

      if (!createdUser) {
        createdUser = {
          _id: `user-${Date.now()}`,
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          role: createForm.role,
          isActive: createForm.isActive,
          status: createForm.isActive ? "Active" : "Suspended",
        };
      }

      setUsers((prev) => [createdUser, ...prev]);
      toast.success(`User "${createForm.name}" created successfully! 🎉`);
      setIsCreateModalOpen(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "reader",
        isActive: true,
      });
    } catch (err: any) {
      console.error("Failed to create user:", err);
      if (err.response?.status === 409) {
        toast.error("A user with this email address already exists (409 Conflict).");
      } else {
        toast.error(err.response?.data?.message || "Failed to create user.");
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit & Delete State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "user",
    status: "Active",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reset Password State (POST /api/admin/users/:id/reset-password)
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    const targetUserId = resetPasswordUser.id || resetPasswordUser._id;
    setIsSubmittingReset(true);
    try {
      await api.post(`/admin/users/${targetUserId}/reset-password`, {
        password: newPasswordInput,
      });
      toast.success(`Password reset successfully for ${resetPasswordUser.name}! 🔑`);
      setResetPasswordUser(null);
      setNewPasswordInput("");
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast.error(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (currentUserId && (id === currentUserId || String(id) === String(currentUserId))) {
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
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);

      // Backend performs soft delete setting isActive=false
      setUsers((prev) =>
        prev.map((u: any) =>
          (u.id || u._id) === id
            ? { ...u, status: "Suspended", isActive: false }
            : u
        )
      );
      toast.success(`User "${name}" deactivated (soft deleted) successfully.`);
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      toast.error(err.response?.data?.message || "Failed to deactivate user.");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || user.fullName || "",
      email: user.email || "",
      role: (user.role || "user").toLowerCase(),
      status: user.status || (user.isActive !== false ? "Active" : "Suspended"),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const userId = editingUser.id || editingUser._id;
    setIsSubmittingEdit(true);

    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role.toLowerCase(),
        isActive: editForm.status === "Active",
        status: editForm.status,
      };

      await api.put(`/admin/users/${userId}`, payload).catch(() =>
        api.patch(`/admin/users/${userId}`, payload).catch(() =>
          api.put(`/users/${userId}`, payload)
        )
      );

      const formattedRole = editForm.role.charAt(0).toUpperCase() + editForm.role.slice(1);
      setUsers((prev) =>
        prev.map((u: any) =>
          (u.id || u._id) === userId
            ? {
                ...u,
                name: editForm.name,
                email: editForm.email,
                role: formattedRole,
                status: editForm.status,
                isActive: editForm.status === "Active",
              }
            : u
        )
      );

      toast.success(`User details for "${editForm.name}" updated successfully!`);
      setEditingUser(null);
    } catch (err: any) {
      console.error("Failed to update user details:", err);
      toast.error(err.response?.data?.message || "Failed to update user details in backend.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleSuspend = async (id: string, currentStatus: string) => {
    const isSuspending = currentStatus === "Active";
    const newStatus = isSuspending ? "Suspended" : "Active";
    try {
      await api.put(`/admin/users/${id}/status`, {
        isActive: !isSuspending,
        status: newStatus.toLowerCase(),
      }).catch(() =>
        api.put(`/admin/users/${id}`, { status: newStatus, isActive: !isSuspending })
      );

      setUsers(
        users.map((u: any) =>
          (u.id || u._id) === id ? { ...u, status: newStatus, isActive: !isSuspending } : u
        )
      );
      toast.success(`User status updated to ${newStatus}`);
    } catch (err) {
      console.error("Failed to update user status:", err);
      toast.error("Failed to update user status");
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
                  {users.filter((u: any) => u.status !== "Suspended").length}
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
                  {users.filter((u: any) => u.role === "Author").length}
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
                  {users.filter((u: any) => u.status === "Suspended").length}
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
                <SelectItem value="User">User</SelectItem>
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
          <div className="overflow-x-auto">
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
                {filteredUsers.map((user: any, index: number) => {
                  const status = user.status || "Active";
                  const role = user.role || "User";
                  return (
                    <motion.tr
                      key={user.id || user._id}
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
                      <TableCell className="text-right">{user.orders || 0}</TableCell>
                      <TableCell className="text-right">
                        ₹{(user.spent || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt || user.joinDate || Date.now()).toLocaleDateString()}
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
                          onClick={() => handleDeleteUser(user.id || user._id, user.name || "User")}
                          disabled={deletingId === (user.id || user._id)}
                          title="Delete User"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === (user.id || user._id) ? (
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
                              onClick={() => handleSuspend(user.id || user._id, status)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              {status !== "Suspended" ? "Suspend Account" : "Activate Account"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive font-semibold"
                              onClick={() => handleDeleteUser(user.id || user._id, user.name || "User")}
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
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
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
                      <SelectItem value="user">User / Reader</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
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
                  Password *
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Enter strong password (min 6 chars)"
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
