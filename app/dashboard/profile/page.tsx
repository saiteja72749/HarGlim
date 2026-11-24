"use client";

import { describeApiError } from "@/lib/api-error";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Save,
  Loader2,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";
import { ErrorState } from "@/components/ui/error-state";
import api from "@/lib/api";
import {
  fetchSavedAddresses,
  getDefaultAddress,
  saveAddresses,
  withDefaultAddress,
  type SavedAddress,
} from "@/lib/saved-address";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const pending = useRef(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(false);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [original, setOriginal] = useState(formData);
  const profileChanged = formData.name.trim() !== original.name.trim() || formData.bio.trim() !== original.bio.trim();
  const addressChanged = (["phone", "address", "city", "state", "pincode"] as const).some(
    (key) => formData[key].trim() !== original[key].trim()
  );
  const addressValid = !addressChanged || Boolean(formData.address.trim() && formData.city.trim() && formData.pincode.trim());
  const phoneValid = !formData.phone.trim() || /^\+?\d{7,15}$/.test(formData.phone.replace(/[\s()-]/g, ""));
  const pinValid = !addressChanged || !/^(india|in)$/i.test(getDefaultAddress(savedAddresses)?.country || "India") || /^[1-9]\d{5}$/.test(formData.pincode.trim());
  const canSave = Boolean(formData.name.trim() && addressValid && phoneValid && pinValid && (profileChanged || addressChanged));

  const fetchProfile = useCallback(async () => {
    setIsFetching(true);
    setError(false);

    try {
      const userId = user?._id || user?.id;
      const [res, ordersRes, addressesRes] = await Promise.allSettled([
        // GET /users/me is the documented "current user profile" endpoint.
        api.get("/users/me", { cache: "no-store" }),
        // Only the count is shown: pagination.total from a 1-item page.
        api.get(`/users/${userId}/orders`, { params: { limit: 1 } }),
        fetchSavedAddresses(),
      ]);

      if (res.status === 'rejected') throw res.reason;
      if (addressesRes.status === 'rejected') throw addressesRes.reason;
      // Phone/address come from the default saved address (GET /users/me/addresses).
      const addresses = addressesRes.status === "fulfilled" ? addressesRes.value : [];
      setSavedAddresses(addresses);
      const saved = getDefaultAddress(addresses);

      if (res.status === "fulfilled") {
        const userData = res.value.data?.data?.user || res.value.data?.data || res.value.data?.user || res.value.data;
        if (userData) {
          const values = {
            name: userData.name || user?.name || "",
            email: userData.email || user?.email || "",
            phone: saved?.phone || userData.phone || "",
            bio: userData.bio || "",
            address: saved?.addressLine1 || userData.address || "",
            city: saved?.city || userData.city || "",
            state: saved?.state || userData.state || "",
            pincode: saved?.postalCode || userData.pincode || "",
          };
          setOriginal(values);
          setFormData(values);
        }
      } else if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
        }));
      }

      if (ordersRes.status === "fulfilled") {
        const total = ordersRes.value.data?.pagination?.total;
        const oData = ordersRes.value.data?.data || ordersRes.value.data;
        setTotalOrders(typeof total === "number" ? total : typeof oData?.pagination?.total === "number" ? oData.pagination.total : null);
      }
    } catch (err) {
      console.warn("Could not fetch remote profile details, using session data:", describeApiError(err));
      setError(true);
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReset = () => {
    setFormData(original);
    setEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?._id || user?.id;
    if (!editing || pending.current || !canSave || !userId) return;
    pending.current = true;
    setIsLoading(true);
    let partial = false;
    try {
      if (profileChanged) {
        const name = formData.name.trim();
        const bio = formData.bio.trim();
        await api.put(`/users/${userId}`, { name, bio });
        const { data } = await api.get("/users/me", { cache: "no-store" });
        const result = data?.data?.user || data?.data || data?.user || data;
        if (result?.name !== name || (result?.bio || "") !== bio) throw new Error("Profile changes could not be verified.");
        setOriginal((previous) => ({ ...previous, name, bio }));
        partial = true;
      }
      if (addressChanged) {
        const current = await fetchSavedAddresses();
        const saved = getDefaultAddress(current);
        const shipping = {
          _id: saved?._id,
          label: saved?.label || "Home",
          fullName: formData.name.trim(),
          email: formData.email,
          phone: formData.phone.trim(),
          addressLine1: formData.address.trim(),
          addressLine2: saved?.addressLine2,
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.pincode.trim(),
          country: saved?.country || "India",
        };
        const next = withDefaultAddress(current, shipping);
        const confirmed = next ? await saveAddresses(next) : current;
        const result = getDefaultAddress(confirmed);
        if (!result || result.addressLine1 !== shipping.addressLine1 || result.city !== shipping.city ||
          (result.state || "") !== shipping.state || result.postalCode !== shipping.postalCode || (result.phone || "") !== shipping.phone) {
          throw new Error("Default delivery address could not be verified.");
        }
        setSavedAddresses(confirmed);
      }
      setOriginal(formData);
      setEditing(false);
      if (user && profileChanged) setUser({ ...user, name: formData.name.trim() });
      toast.success("Profile changes saved.");
    } catch (cause) {
      const failure = describeApiError(cause);
      toast.error(partial
        ? "Your personal details were saved. Your delivery address could not be confirmed. Try saving the address again."
        : failure.response?.data?.message || failure.message);
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="Could not load profile"
          message="We were unable to load your profile information. Please try again."
          onRetry={fetchProfile}
        />
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F3D3E]" />
      </div>
    );
  }

  const joinedYear = (user as any)?.createdAt
    ? new Date((user as any).createdAt).getFullYear()
    : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Header with Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E6DF] pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            My Profile
          </h1>
          <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
            Manage your personal information, contact details, and default delivery address.
          </p>
        </div>

        {!editing && <Button type="button" variant="outline" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Edit profile</Button>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* 2. Left Column: Upgraded Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white border border-[#E2E6DF] shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden ">
              <div className="h-24 bg-gradient-to-r from-[#0F3D3E] to-[#174C4D] relative">
                <div className="absolute top-2 right-2">
                  <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-bold text-[10px] uppercase tracking-wider shadow-xs">
                    {user?.role || "Reader"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6 pt-0 relative flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div className="-mt-12 relative group">
                  <div className="h-24 w-24 rounded-2xl bg-[#0F3D3E] border-4 border-white text-white flex items-center justify-center font-serif font-bold text-3xl shadow-md">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : "R"}
                  </div>

                </div>

                <div>
                  <h3 className="font-serif font-bold text-xl text-[#0F3D3E]">
                    {formData.name}
                  </h3>
                  <p className="text-xs text-[#5C6E6E] font-sans mt-0.5 truncate max-w-[200px]">
                    {formData.email}
                  </p>
                </div>

                {/* Badges & Stats Overview */}
                <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-[#E2E6DF]">
                  <div className="p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center justify-center gap-1">
                      <Calendar className="h-3 w-3 text-[#0F3D3E]" />
                      Joined
                    </p>
                    <p className="font-serif font-bold text-sm text-[#0F3D3E] mt-1">
                      {joinedYear ?? "Unavailable"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center justify-center gap-1">
                      <ShoppingBag className="h-3 w-3 text-[#0F3D3E]" />
                      Orders
                    </p>
                    <p className="font-serif font-bold text-sm text-[#0F3D3E] mt-1">
                      {totalOrders ?? "Unavailable"} Orders
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>

          {/* 3. Right 2 Columns: Form Grouped Sections */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white border border-[#E2E6DF] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 bg-[#F8F9F7] border-b border-[#E2E6DF]">
                  <CardTitle className="text-lg font-serif font-bold text-[#0F3D3E] flex items-center gap-2">
                    <User className="h-5 w-5 text-[#0F3D3E]" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        readOnly={!editing || isLoading}
                        onChange={handleChange}
                        className="bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm"
                        placeholder="Your full legal name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          readOnly
                          className="pl-10 bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        readOnly={!editing || isLoading}
                        onChange={handleChange}
                        className="pl-10 bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm"
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                      Personal Bio / Reader Interests
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      readOnly={!editing || isLoading}
                        onChange={handleChange}
                      rows={3}
                      className="bg-white border-[#E2E6DF] rounded-xl focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm p-3"
                      placeholder="Share a brief intro or your favorite book genres..."
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Section 2: Address Information */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white border border-[#E2E6DF] shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 bg-[#F8F9F7] border-b border-[#E2E6DF]">
                  <CardTitle className="text-lg font-serif font-bold text-[#0F3D3E] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#0F3D3E]" />
                    Default Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                      Street Address & House / Flat No.
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      readOnly={!editing || isLoading}
                        onChange={handleChange}
                      className="bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm"
                      placeholder="e.g. House No. 42, Green Park Avenue"
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                        City
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        readOnly={!editing || isLoading}
                        onChange={handleChange}
                        className="bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm"
                        placeholder="e.g. New Delhi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                        State
                      </Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        readOnly={!editing || isLoading}
                        onChange={handleChange}
                        className="bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm"
                        placeholder="e.g. Delhi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                        PIN Code
                      </Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        readOnly={!editing || isLoading}
                        onChange={handleChange}
                        className="bg-white border-[#E2E6DF] rounded-xl h-11 focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E] text-sm font-mono"
                        placeholder="e.g. 110001"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Bottom Save Action Bar */}
            {editing && <>
              {!addressValid && <p className="text-sm text-muted-foreground">Enter the street, city, and postal code to update your delivery address.</p>}
              {!phoneValid && <p className="text-sm text-red-700">Enter a valid phone number.</p>}
              {!pinValid && addressValid && <p className="text-sm text-red-700">Enter a valid six-digit PIN code for India.</p>}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="border-[#E2E6DF] text-[#0F3D3E] hover:bg-[#F0F2ED] h-11 px-6 rounded-xl text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !canSave}
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium h-11 px-8 rounded-xl shadow-xs text-xs gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 text-[#D4AF37]" />
                )}
                <span>Save changes</span>
              </Button>
            </div></>}
          </div>
        </div>
      </form>
    </div>
  );
}
