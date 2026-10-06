"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Loader2,
  Calendar,
  ShoppingBag,
  ShieldCheck,
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
import { loadSavedAddress, saveAddress } from "@/lib/saved-address";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(false);
  const [totalOrders, setTotalOrders] = useState<number>(0);

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

  const fetchProfile = async () => {
    setIsFetching(true);
    setError(false);

    try {
      const userId = user?._id || user?.id;
      const [res, ordersRes] = await Promise.allSettled([
        // GET /users/me is the documented "current user profile" endpoint.
        api.get("/users/me", { cache: "no-store" } as any),
        api.get(`/users/${userId}/orders`, { params: { limit: 100 } }),
      ]);

      // Phone/address are not part of the backend user profile; they live on this device.
      const saved = loadSavedAddress(userId);

      if (res.status === "fulfilled") {
        const userData = res.value.data?.data?.user || res.value.data?.data || res.value.data?.user || res.value.data;
        if (userData) {
          setFormData({
            name: userData.name || user?.name || "",
            email: userData.email || user?.email || "",
            phone: saved?.phone || userData.phone || "",
            bio: userData.bio || "",
            address: saved?.addressLine1 || userData.address || "",
            city: saved?.city || userData.city || "",
            state: saved?.state || userData.state || "",
            pincode: saved?.postalCode || userData.pincode || "",
          });
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
        setTotalOrders(typeof total === "number" ? total : Array.isArray(oData) ? oData.length : 0);
      }
    } catch (err) {
      console.warn("Could not fetch remote profile details, using session data:", err);
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
        }));
      } else {
        setError(true);
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReset = () => {
    fetchProfile();
    toast.success("Changes reset to original profile details.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?._id || user?.id;

    if (!formData.name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setIsLoading(true);
    try {
      // Backend UserUpdateRequest only accepts name, bio and profilePicture.
      await api.put(`/users/${userId}`, { name: formData.name.trim(), bio: formData.bio });
      if (user) setUser({ ...user, name: formData.name.trim() });

      const savedLocally = saveAddress(userId, {
        fullName: formData.name,
        email: formData.email,
        phone: formData.phone,
        addressLine1: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.pincode,
        country: "India",
      });

      toast.success(
        savedLocally
          ? "Profile saved. Your delivery address is saved on this device and will pre-fill checkout."
          : "Profile saved."
      );
    } catch (err: any) {
      console.error("Failed to update profile", err);
      toast.error(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
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
    : new Date().getFullYear();

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

        {/* Primary Action CTA (Header Quick Bar) */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-[#E2E6DF] text-[#0F3D3E] hover:bg-[#F0F2ED] h-11 px-5 rounded-xl text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium h-11 px-6 rounded-xl shadow-xs text-xs gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4 text-[#D4AF37]" />
            )}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* 2. Left Column: Upgraded Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white border border-[#E2E6DF] shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden sticky top-24">
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
                  <Button
                    type="button"
                    size="icon"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#D4AF37] text-[#0F3D3E] shadow-sm hover:scale-105 transition-transform"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div>
                  <h3 className="font-serif font-bold text-xl text-[#0F3D3E]">
                    {formData.name || "Reader Name"}
                  </h3>
                  <p className="text-xs text-[#5C6E6E] font-sans mt-0.5 truncate max-w-[200px]">
                    {formData.email || "reader@harglim.com"}
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
                      {joinedYear}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center justify-center gap-1">
                      <ShoppingBag className="h-3 w-3 text-[#0F3D3E]" />
                      Orders
                    </p>
                    <p className="font-serif font-bold text-sm text-[#0F3D3E] mt-1">
                      {totalOrders} Orders
                    </p>
                  </div>
                </div>

                <div className="w-full pt-2">
                  <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-left flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-[#0F3D3E] shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#0F3D3E]">Verified Account</p>
                      <p className="text-[11px] text-[#5C6E6E]">Harglim Reader Privileges Active</p>
                    </div>
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
                          onChange={handleChange}
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
                        value={formData.phone}
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
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E6DF]">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="border-[#E2E6DF] text-[#0F3D3E] hover:bg-[#F0F2ED] h-11 px-6 rounded-xl text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium h-11 px-8 rounded-xl shadow-xs text-xs gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 text-[#D4AF37]" />
                )}
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
