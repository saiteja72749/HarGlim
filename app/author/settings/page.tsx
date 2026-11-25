"use client";

import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError, record } from "@/lib/api-error";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import { notifyLiveChange } from "@/lib/live-sync";
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
  BookOpen,
  Building2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { authorSnapshot, payoutNotSaved } from "@/lib/author-settings-data";
import { useHashSection } from "@/hooks/use-hash-section";

export default function AuthorSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [profileReadError, setProfileReadError] = useState(false);
  const [payoutReadError, setPayoutReadError] = useState(false);
  const [authorReadError, setAuthorReadError] = useState(false);
  const userId = user?._id || user?.id;
  useHashSection(!loading);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imgError, setImgError] = useState(false);

  // View / Edit toggles
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  // The backend only ever returns a masked account number ("**********7263").
  const [maskedAccount, setMaskedAccount] = useState("");
  const [replacingAccount, setReplacingAccount] = useState(false);
  const [publicAuthorId, setPublicAuthorId] = useState<string | null>(null);
  const saving = useRef(false);

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

  // Accepts the masked payout object returned by GET/PUT payment-details.
  const applyPayoutDetails = useCallback((input: unknown) => {
    const details = record(input);
    if (!details || typeof details !== "object") return;
    const payment = {
      accountHolderName: typeof details.accountHolderName === "string" ? details.accountHolderName : "",
      bankName: typeof details.bankName === "string" ? details.bankName : "",
      accountNumber: "", // never pre-filled: only a masked value exists
      ifscCode: typeof details.ifscCode === "string" ? details.ifscCode : "",
      upiId: typeof details.upiId === "string" ? details.upiId : "",
    };
    setPaymentForm(payment);
    setSavedPayment(payment);
    const mask = typeof details.accountNumberMasked === "string" ? details.accountNumberMasked.trim() : "";
    setMaskedAccount(/^[*xX\u2022-]+\d{1,4}$/.test(mask) ? mask : "");
    setReplacingAccount(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    setSettingsLoading(true);
    const [meResult, payoutResult, authorResult] = await Promise.allSettled([
      api.get('/users/me', { cache: 'no-store' }),
      api.get('/authors/me/payment-details', { cache: 'no-store' }),
      api.get(`/authors/${userId}`, { cache: 'no-store' }),
    ]);
    setProfileReadError(meResult.status === 'rejected');
    setPayoutReadError(payoutResult.status === 'rejected');
    const author = authorResult.status === "fulfilled" ? record(authorResult.value.data?.data ?? authorResult.value.data) : {};
    const authorMatches = (author._id ?? author.id) === userId;
    setAuthorReadError(!authorMatches);
    setPublicAuthorId(authorMatches ? userId : null);
    if (meResult.status === 'fulfilled') {
      const body = record(meResult.value.data?.data ?? meResult.value.data);
      const me = record(body.user ?? body);
      if ((me._id || me.id) !== userId) { setProfileReadError(true); }
      else {
        const snapshot = authorSnapshot(me, authorMatches ? author : {});
        setProfileForm(snapshot); setSavedProfile(snapshot);
        setImagePreview(snapshot.profileImage); setImgError(false);
      }
    }
    if (payoutResult.status === 'fulfilled') {
      const details: unknown = payoutResult.value.data?.data;
      if (!details || typeof details !== 'object' || Array.isArray(details)) setPayoutReadError(true);
      else applyPayoutDetails(details);
    }
    setSettingsLoading(false);
  }, [userId, applyPayoutDetails]);

  useEffect(() => scheduleRequest(fetchSettings), [fetchSettings]);

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

          const uploadRes = await api.post("/authors/me/uploads/image", uploadFormData);
          const uploadedUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url;
          if (!uploadedUrl) throw new Error("no url");
          finalImage = uploadedUrl;
        } catch (caughtError) {
          const imgErr = describeApiError(caughtError);
          // Don't save a base64 preview as the profile photo; tell the author instead.
          toast.error(imgErr?.response?.data?.message || "Photo upload failed. Other changes were not saved.");
          return;
        }
      }

      // PUT /authors/{id}: name, bio, profilePicture.
      const payload: Record<string, string> = {
        name: profileForm.name.trim(),
        bio: profileForm.bio,
      };
      if (finalImage && /^https?:\/\//.test(finalImage)) {
        payload.profilePicture = finalImage;
      }

      await api.put(`/authors/${authorId}`, payload);
      const [meResult, authorResult] = await Promise.all([
        api.get('/users/me', { cache: 'no-store' }),
        api.get(`/authors/${authorId}`, { cache: 'no-store' }),
      ]);
      const body = record(meResult.data?.data ?? meResult.data);
      const me = record(body.user ?? body);
      if ((me._id || me.id) !== authorId) throw new Error('Profile identity changed. Please sign in again.');
      const snapshot = authorSnapshot(me, record(authorResult.data?.data ?? authorResult.data));
      for (const field of ['name', 'bio', 'profilePicture']) {
        const value = field === 'profilePicture' ? snapshot.profileImage : field === 'bio' ? snapshot.bio : snapshot.name;
        if (payload[field] !== undefined && payload[field] !== value) throw new Error('The server did not retain the profile changes. Your edits remain here; please retry.');
      }
      if (user) setUser({ ...user, name: typeof me.name === 'string' ? me.name : user.name, profileImage: typeof me.profilePicture === 'string' ? me.profilePicture : undefined, profilePicture: typeof me.profilePicture === 'string' ? me.profilePicture : undefined });
      setProfileForm(snapshot); setSavedProfile(snapshot); setImagePreview(snapshot.profileImage);
      setImageFile(null);
      setIsEditingProfile(false);

      notifyLiveChange("author-data");
      toast.success("Author profile updated successfully.");
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setPaymentForm(savedPayment);
    setReplacingAccount(false);
    setIsEditingPayment(false);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving.current || payoutReadError || !userId) return;
    const trimmed = Object.fromEntries(Object.entries(paymentForm).map(([key, value]) => [key, value.trim()])) as typeof paymentForm;
    const paymentDetails = Object.fromEntries(Object.entries(trimmed).filter(([key, value]) =>
      key === "accountNumber" ? replacingAccount && Boolean(value)
        : value !== savedPayment[key as keyof typeof savedPayment].trim()
    ));
    if (!Object.keys(paymentDetails).length) {
      toast.error("Change a payout field before saving.");
      return;
    }
    if (replacingAccount && !/^\d{5,}$/.test(trimmed.accountNumber)) {
      toast.error("Enter the new account number using digits.");
      return;
    }
    saving.current = true;
    setLoading(true);
    try {
      const authorId = userId;
      await api.put(`/authors/${authorId}/payment-details`, { paymentDetails });
      const { data } = await api.get('/authors/me/payment-details', { cache: 'no-store' });

      // The response carries the masked record; the typed account number is dropped here.
      if (!data?.data || typeof data.data !== 'object') throw new Error('Saved payout details could not be verified. Reload before retrying.');
      if (payoutNotSaved(paymentDetails, record(data.data)).length) throw new Error('The saved payout details could not be verified. Your edits remain here; please retry.');
      applyPayoutDetails(data.data);
      setIsEditingPayment(false);

      toast.success("Payout details saved.");
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(err.response?.data?.message || err.message || "Failed to save payment details.");
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  const hasPaymentDetails = Boolean(
    savedPayment.accountHolderName ||
      savedPayment.bankName ||
      maskedAccount ||
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

      {settingsLoading && <p role="status" className="text-sm text-muted-foreground">Loading saved settings...</p>}
      {(profileReadError || authorReadError) && <ErrorState title="Some profile details could not load" message="Please retry to retrieve your saved profile details." onRetry={fetchSettings} />}
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
                disabled={settingsLoading || profileReadError || authorReadError}
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
                        width={96}
                        height={96}
                        loading="lazy"
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

                    </div>

                    <p className="text-xs text-[#5C6E6E] flex items-center justify-center sm:justify-start gap-1.5 [overflow-wrap:anywhere]">
                      <Mail className="h-3.5 w-3.5 text-[#5C6E6E]" />
                      <span>{profileForm.email || user?.email || "No email available"}</span>
                    </p>
                  </div>
                </div>

                {publicAuthorId && <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild><Link href={`/authors/${encodeURIComponent(publicAuthorId)}`}>Preview public profile and books</Link></Button>
                  <Button variant="ghost" asChild><Link href="/author/books">My Books</Link></Button>
                </div>}
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
                          width={96}
                          height={96}
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
                    : "Review the payout details saved for your royalty settlements."}
                </p>
              </div>
            </div>

            {/* Payout actions use the actual loaded resource state. */}
            {!isEditingPayment ? (
              <Button
                type="button"
                disabled={settingsLoading || payoutReadError}
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
            {settingsLoading ? <p role="status">Loading payout details...</p> : payoutReadError ? <ErrorState title="Payout details could not load" message="Retry before editing your saved payout details." onRetry={fetchSettings} /> : !isEditingPayment ? (
              /* ================= READ-ONLY VIEW MODE ================= */
              <div className="space-y-6">
                {hasPaymentDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account holder name/}
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-[#D4AF37]" />
                        Account Holder Name
                      </span>
                      <p className="text-sm font-serif font-bold text-[#0F3D3E]">
                        {paymentForm.accountHolderName || "—"}
                      </p>
                    </div>

                    {/* Bank name */}
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
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-[#D4AF37]" />
                        Account Number
                      </span>
                      <p className="text-sm font-mono font-bold text-[#0F3D3E]">
                        {maskedAccount || "Not specified"}
                      </p>
                    </div>

                    {/* IFSC code/}
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
                      disabled={settingsLoading || payoutReadError}
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
                      Account holder name
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
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="bankName"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Bank name
                    </Label>
                    <Input
                      id="bankName"
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      value={paymentForm.bankName}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, bankName: e.target.value })
                      }
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="accountNumber"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      Account number
                    </Label>
                    {replacingAccount ? (
                      <Input id="accountNumber" type="password" inputMode="numeric" autoComplete="off"
                        placeholder="Enter the new account number" value={paymentForm.accountNumber}
                        onChange={(event) => setPaymentForm({ ...paymentForm, accountNumber: event.target.value })}
                        className="min-h-11" />
                    ) : (
                      <div className="space-y-2">
                        {maskedAccount && <p className="text-sm font-mono">{maskedAccount}</p>}
                        <Button id="accountNumber" type="button" variant="outline" onClick={() => setReplacingAccount(true)}>
                          {maskedAccount ? "Replace account number" : "Add account number"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="ifscCode"
                      className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]"
                    >
                      IFSC code
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
