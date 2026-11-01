"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

const MIN_PASSWORD_LENGTH = 6;

/**
 * Sets a password from an emailed link: a Forgot Password reset or an admin's author invitation
 * (both single-use tokens for PUT /auth/reset-password/{token}).
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put(`/auth/reset-password/${encodeURIComponent(token)}`, { password });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "We couldn't set your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md py-4">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex justify-center items-center mb-4">
            <Image src="/logo.png" alt="Harglim Publishers" width={56} height={56} className="h-12 sm:h-14 w-auto object-contain" />
          </Link>
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Set Your Password</h1>
          <p className="text-muted-foreground text-sm">Choose a password to sign in to your Harglim account.</p>
        </div>

        {done ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4 shadow-sm" role="status">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="font-bold text-lg text-foreground">Password saved</h2>
            <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
            <Link href="/login" className="block">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </div>
        ) : !token ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4 shadow-sm" role="alert">
            <p className="text-sm text-muted-foreground">
              This link is incomplete. Please open the full link from your email, or request a new one.
            </p>
            <Link href="/forgot-password" className="block">
              <Button className="w-full">Request a New Link</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide passwords" : "Show passwords"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && (
              <div role="alert" className="space-y-1 text-sm text-destructive">
                <p>{error}</p>
                <p className="text-xs">
                  Link expired or already used?{" "}
                  <Link href="/forgot-password" className="underline underline-offset-2">
                    Request a new one
                  </Link>
                  .
                </p>
              </div>
            )}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
