"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  User,
  CreditCard,
  Save,
  Camera,
  Pencil,
  X,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  BookOpen,
  CheckCircle2,
  Building2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHashSection } from "@/hooks/use-hash-section";

// PUT /authors/{id}/payment-details is live but undocumented in the handover (verified:
// it requires auth, while unknown /authors/* routes return 404). Set to false to hide
// payout editing if the backend ever removes it.
const PAYOUT_DETAILS_API_AVAILABLE = true;

export default function AuthorSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  useHashSection(!loading);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imgError, setImgError] = useState(false);

  // View / Edit toggles
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Author Profile Form & Saved state for cancellation
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    profileImage: user?.profileImage || "",
  });

  const [savedProfile, setSavedProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    profileImage: user?.profileImage || "",
  });

  // Payment Details Form & Saved state for cancellation
  const [paymentForm, setPaymentForm] = useState({
    accountHolderName: user?.name || "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });

  const [savedPayment, setSavedPayment] = useState({
    accountHolderName: user?.name || "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });

  useEffect(() => {
    // Fetch profile & payment details
    const fetchSettings = async () => {
      if (!user?._id && !user?.id) return;
      try {
        const authorId = user._id || user.id;
        // Public GET /authors/{id} never includes payout details; the authenticated
        // GET /users/me returns the owner's own document, so read them from there.
        const [res, meRes] = await Promise.all([
          api.get(`/authors/${authorId}`, { cache: "no-store" } as any).catch(() => null),
          api.get("/users/me", { cache: "no-store" } as any).catch(() => null),
        ]);
        const me = meRes?.data?.data?.user || meRes?.data?.data || meRes?.data?.user || {};
        if (res?.data || me?._id) {
          const authObj = { ...(res?.data?.data || res?.data || {}), paymentDetails: me.paymentDetails || (res?.data?.data || res?.data || {}).paymentDetails };
          const imgUrl =
            authObj.profileImage ||
            authObj.profilePicture ||
            user?.profileImage ||
            "";

          const initialProfile = {
            name: authObj.name || user?.name || "",
            email: authObj.email || user?.email || "",
            bio: authObj.bio || "",
            profileImage: imgUrl,
          };
          setProfileForm(initialProfile);
          setSavedProfile(initialProfile);
          setImagePreview(imgUrl);
          setImgError(false);

          if (authObj.paymentDetails) {
            const initialPayment = {
              accountHolderName:
                authObj.paymentDetails.accountHolderName ||
                authObj.name ||
                user?.name ||
                "",
              bankName: authObj.paymentDetails.bankName || "",
              accountNumber: authObj.paymentDetails.accountNumber || "",
              ifscCode: authObj.paymentDetails.ifscCode || "",
              upiId: authObj.paymentDetails.upiId || "",
            };
            setPaymentForm(initialPayment);
            setSavedPayment(initialPayment);
          }
        }
      } catch (e) {
        console.error("Failed to load author settings:", e);
      }
    };
    fetchSettings();
  }, [user]);

  // Handle local image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImgError(false);

      // Generate base64 data preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setImagePreview(resultStr);
        setProfileForm((prev) => ({ ...prev, profileImage: resultStr }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelProfile = () => {
    setProfileForm(savedProfile);
    setImagePreview(savedProfile.profileImage);
    setImageFile(null);
    setImgError(false);
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authorId = user?._id || user?.id;
      let finalImage = profileForm.profileImage || imagePreview;

      // 1. Upload image file if selected
      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("image", imageFile);

          const uploadRes = await api.post("/uploads/image", uploadFormData);
          const uploadedUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url;
          if (!uploadedUrl) throw new Error("no url");
          finalImage = uploadedUrl;
        } catch (imgErr: any) {
          // Don't save a base64 preview as the profile photo; tell the author instead.
          toast.error(imgErr?.response?.data?.message || "Photo upload failed. Other changes were not saved.");
          return;
        }
      }

      // PUT /authors/{id} is live (undocumented); PUT /users/{id} is the documented
      // UserUpdateRequest (name, bio, profilePicture). Send both photo field names, since
      // the documented one is profilePicture and the old code only sent profileImage.
      const payload: Record<string, string> = {
        name: profileForm.name.trim(),
        bio: profileForm.bio,
      };
      if (finalImage && /^https?:\/\//.test(finalImage)) {
        payload.profilePicture = finalImage;
        payload.profileImage = finalImage;
      }

      await api.put(`/authors/${authorId}`, payload).catch((err) => {
        if (err?.response?.status === 404) return api.put(`/users/${authorId}`, payload);
        throw err;
      });

      if (user) {
        setUser({
          ...user,
          name: profileForm.name,
          profileImage: finalImage,
        });
      }

      setSavedProfile({
        name: profileForm.name,
        email: profileForm.email,
        bio: profileForm.bio,
        profileImage: finalImage,
      });
      setImageFile(null);
      setIsEditingProfile(false);

      toast.success("Author profile updated successfully! 👤");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setPaymentForm(savedPayment);
    setIsEditingPayment(false);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authorId = user?._id || user?.id;
      const payload = {
        paymentDetails: paymentForm,
      };

      await api
        .put(`/authors/${authorId}/payment-details`, payload)
        .catch(() => api.put(`/authors/${authorId}`, payload));

      setSavedPayment({ ...paymentForm });
      setIsEditingPayment(false);

      toast.success("Payment & payout details saved securely! 💳");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save payment details.");
    } finally {
      setLoading(false);
    }
  };

  // Mask account number for secure preview
  const formatMaskedAccount = (accNum: string) => {
    if (!accNum) return "Not specified";
    if (showAccountNumber) return accNum;
    if (accNum.length <= 4) return accNum;
    const last4 = accNum.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  const hasPaymentDetails = Boolean(
    savedPayment.accountHolderName ||
      savedPayment.bankName ||
      savedPayment.accountNumber ||
      savedPayment.upiId
  );

  return (
    <div className="space-y-8 text-[#0F3D3E] font-sans max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#E2E6DF] pb-5">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
          Profile & Payment Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#5C6E6E] mt-0.5">
          View and manage your public author biography, profile photo, and bank details for royalty payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 1. Author Profile Card */}
        <Card id="profile" className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden scroll-mt-20">
          <CardHeader className="p-6 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <User className="h-5 w-5 text-[#D4AF37]" />
              <div>
                <CardTitle className="font-serif font-bold text-lg text-[#0F3D3E]">
                  Public Author Profile
                </CardTitle>
                <p className="text-xs text-[#5C6E6E]">
                  {isEditingProfile
                    ? "Make changes below and click Save Changes."
                    : "Displayed publicly to readers and book buyers."}
                </p>
              </div>
            </div>

            {/* Toggle Edit Button */}
            {!isEditingProfile ? (
              <Button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                variant="outline"
                className="border-[#D4AF37] text-[#0F3D3E] hover:bg-[#D4AF37]/10 font-serif font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs transition-colors shrink-0"
              >
                <Pencil className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCancelProfile}
                variant="ghost"
                className="text-xs font-semibold text-[#5C6E6E] hover:text-[#0F3D3E] hover:bg-black/5 h-9 px-3 rounded-xl gap-1 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-6">
            {!isEditingProfile ? (
              /* ================= READ-ONLY VIEW MODE ================= */
              <div className="space-y-6">
                {/* Author Info Showcase */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-5 rounded-2xl bg-[#F8F9F7] border border-[#E2E6DF]">
                  {/* Avatar Circle */}
                  <div className="relative h-24 w-24 shrink-0 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-sm bg-white flex items-center justify-center">
                    {(profileForm.profileImage || imagePreview) && !imgError ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={profileForm.profileImage || imagePreview}
                        alt={profileForm.name || "Author"}
                        className="h-full w-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#0F3D3E]/10 to-[#D4AF37]/15 text-[#0F3D3E]">
                        {profileForm.name ? (
                          <span className="text-2xl font-serif font-bold">
                            {profileForm.name.slice(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <User className="h-10 w-10 text-[#0F3D3E]/40" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0F3D3E]">
                        {profileForm.name || "Unnamed Author"}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Verified Author
                      </span>
                    </div>

                    <p className="text-xs text-[#5C6E6E] flex items-center justify-center sm:justify-start gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-[#5C6E6E]" />
                      <span>{profileForm.email || user?.email || "No email available"}</span>
                    </p>
                  </div>
                </div>

                {/* Bio Block */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#D4AF37]" />
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                      Author Biography & Introduction
                    </Label>
                  </div>

                  {profileForm.bio?.trim() ? (
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-xs sm:text-sm text-[#2C3E50] leading-relaxed whitespace-pre-line font-serif">
                      {profileForm.bio}
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-[#F8F9F7] border border-dashed border-[#CBD5E1] text-center text-xs text-[#5C6E6E] italic">
                      No public biography added yet. Click &quot;Edit Profile&quot; to introduce yourself to your readers.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ================= EDIT MODE ================= */
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Photo Upload & Preview Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#F8F9F7] border border-[#E2E6DF]">
                  <div className="relative group">
                    <div className="relative h-24 w-24 shrink-0 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-sm bg-white flex items-center justify-center">
                      {(imagePreview || profileForm.profileImage) && !imgError ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imagePreview || profileForm.profileImage}
                          alt={profileForm.name || "Author Preview"}
                          className="h-full w-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#0F3D3E]/10 to-[#D4AF37]/15 text-[#0F3D3E]">
                          {profileForm.name ? (
                            <span className="text-2xl font-serif font-bold">
                              {profileForm.name.slice(0, 2).toUpperCase()}
                            </span>
                          ) : (
                            <User className="h-10 w-10 text-[#0F3D3E]/40" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                      Author Profile Image Upload
                    </Label>
                    <p className="text-xs text-[#5C6E6E]">
                      Upload a portrait (JPG, PNG, WebP) to display on your public author page.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 justify-center sm:justify-start">
                      <label className="inline-flex items-center gap-2 bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-xs px-4 h-9 rounded-xl cursor-pointer shadow-xs transition-colors">
                        <Camera className="h-4 w-4" />
                        <span>{imageFile ? "Change Image" : "Upload New Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>

                      {imageFile && (
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          ✓ {imageFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="name"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={profileForm.email}
                      disabled
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="bio"
                    className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                  >
                    Author Bio & Introduction (Public)
                  </Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="Share a brief introduction about yourself and your published works..."
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                    className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="profileImage"
                    className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                  >
                    Or Enter Direct Profile Image URL
                  </Label>
                  <Input
                    id="profileImage"
                    placeholder="https://example.com/photo.jpg"
                    value={profileForm.profileImage}
                    onChange={(e) => {
                      setProfileForm({ ...profileForm, profileImage: e.target.value });
                      setImagePreview(e.target.value);
                      setImgError(false);
                    }}
                    className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                  />
                </div>

                {/* Save & Cancel Buttons (Only rendered in Edit Mode) */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-xs h-11 px-6 rounded-xl gap-2 shadow-xs"
                  >
                    <Save className="h-4 w-4 text-[#D4AF37]" />
                    <span>Save Profile Changes</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelProfile}
                    className="border-[#E2E6DF] text-[#5C6E6E] hover:bg-gray-100 font-medium text-xs h-11 px-5 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* 2. Royalty Payout & Bank Details Card */}
        <Card id="payout" className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden scroll-mt-20">
          <CardHeader className="p-6 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-5 w-5 text-[#D4AF37]" />
              <div>
                <CardTitle className="font-serif font-bold text-lg text-[#0F3D3E]">
                  Royalty Payout & Bank Details
                </CardTitle>
                <p className="text-xs text-[#5C6E6E]">
                  {isEditingPayment
                    ? "Update your bank or UPI details for royalty disbursements."
                    : "Royalties are paid by manual bank/UPI transfer after each settlement."}
                </p>
              </div>
            </div>

            {/* Toggle Edit Button: hidden until the backend exposes a payout-details endpoint. */}
            {!PAYOUT_DETAILS_API_AVAILABLE ? null : !isEditingPayment ? (
              <Button
                type="button"
                onClick={() => setIsEditingPayment(true)}
                variant="outline"
                className="border-[#D4AF37] text-[#0F3D3E] hover:bg-[#D4AF37]/10 font-serif font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs transition-colors shrink-0"
              >
                <Pencil className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>{hasPaymentDetails ? "Edit Details" : "Set Up Details"}</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCancelPayment}
                variant="ghost"
                className="text-xs font-semibold text-[#5C6E6E] hover:text-[#0F3D3E] hover:bg-black/5 h-9 px-3 rounded-xl gap-1 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-6">
            {!PAYOUT_DETAILS_API_AVAILABLE && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                Payout details can&apos;t be saved online yet. Please send your account holder name, bank name,
                account number, IFSC and/or UPI ID to the Harglim team from the{" "}
                <a href="/contact" className="underline font-semibold">contact page</a>. Settlements are paid manually to
                these details.
              </div>
            )}
            {!isEditingPayment ? (
              /* ================= READ-ONLY VIEW MODE ================= */
              <div className="space-y-6">
                {hasPaymentDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account Holder Name */}
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-[#D4AF37]" />
                        Account Holder Name
                      </span>
                      <p className="text-sm font-serif font-bold text-[#0F3D3E]">
                        {paymentForm.accountHolderName || "—"}
                      </p>
                    </div>

                    {/* Bank Name */}
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#D4AF37]" />
                        Bank Name
                      </span>
                      <p className="text-sm font-bold text-[#0F3D3E]">
                        {paymentForm.bankName || "—"}
                      </p>
                    </div>

                    {/* Account Number */}
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-[#D4AF37]" />
                          Account Number
                        </span>
                        {paymentForm.accountNumber && (
                          <button
                            type="button"
                            onClick={() => setShowAccountNumber(!showAccountNumber)}
                            className="text-[#5C6E6E] hover:text-[#0F3D3E] flex items-center gap-1 text-[10px] font-medium"
                          >
                            {showAccountNumber ? (
                              <>
                                <EyeOff className="h-3 w-3" /> Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" /> Reveal
                              </>
                            )}
                          </button>
                        )}
                      </span>
                      <p className="text-sm font-mono font-bold text-[#0F3D3E]">
                        {formatMaskedAccount(paymentForm.accountNumber)}
                      </p>
                    </div>

                    {/* IFSC Code */}
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
                        IFSC Code
                      </span>
                      <p className="text-sm font-mono font-bold text-[#0F3D3E] tracking-wider">
                        {paymentForm.ifscCode || "—"}
                      </p>
                    </div>

                    {/* UPI ID */}
                    <div className="sm:col-span-2 p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-[#D4AF37]" />
                        UPI ID (Direct Transfer)
                      </span>
                      <p className="text-sm font-mono text-[#0F3D3E]">
                        {paymentForm.upiId || "Not configured"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#F8F9F7] border border-dashed border-[#CBD5E1] text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center mx-auto">
                      <CreditCard className="h-6 w-6 text-[#D4AF37]" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h3 className="text-sm font-serif font-bold text-[#0F3D3E]">
                        No Payout Details Configured
                      </h3>
                      <p className="text-xs text-[#5C6E6E]">
                        Add your bank account or UPI ID to receive automatic royalty payouts for your book sales.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setIsEditingPayment(true)}
                      className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Configure Bank Details</span>
                    </Button>
                  </div>
                )}

                {/* Encryption reassurance badge */}
                <div className="flex items-center gap-2 text-[11px] text-[#5C6E6E] pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Your banking information is protected with 256-bit encryption and only used for verified royalty disbursements.
                  </span>
                </div>
              </div>
            ) : (
              /* ================= EDIT MODE ================= */
              <form onSubmit={handleSavePayment} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="accountHolderName"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Account Holder Name *
                    </Label>
                    <Input
                      id="accountHolderName"
                      placeholder="Name as per bank account"
                      value={paymentForm.accountHolderName}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          accountHolderName: e.target.value,
                        })
                      }
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="bankName"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Bank Name *
                    </Label>
                    <Input
                      id="bankName"
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      value={paymentForm.bankName}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, bankName: e.target.value })
                      }
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="accountNumber"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Account Number *
                    </Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      placeholder="Enter bank account number"
                      value={paymentForm.accountNumber}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          accountNumber: e.target.value,
                        })
                      }
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="ifscCode"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      IFSC Code *
                    </Label>
                    <Input
                      id="ifscCode"
                      placeholder="e.g. HDFC0001234"
                      value={paymentForm.ifscCode}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          ifscCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-mono font-bold uppercase"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="upiId"
                    className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                  >
                    UPI ID (Optional Direct Transfer)
                  </Label>
                  <Input
                    id="upiId"
                    placeholder="e.g. authorname@upi"
                    value={paymentForm.upiId}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, upiId: e.target.value })
                    }
                    className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                  />
                </div>

                {/* Save & Cancel Buttons (Only rendered in Edit Mode) */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-xs h-11 px-6 rounded-xl gap-2 shadow-xs"
                  >
                    <Save className="h-4 w-4 text-[#D4AF37]" />
                    <span>Save Payment Details</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelPayment}
                    className="border-[#E2E6DF] text-[#5C6E6E] hover:bg-gray-100 font-medium text-xs h-11 px-5 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
