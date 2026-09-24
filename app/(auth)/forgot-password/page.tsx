"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      
      setIsSubmitted(true);
      toast.success("Password reset instructions sent to your email!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send reset link. Please check your email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-y-auto relative">
        <Button 
          variant="ghost" 
          onClick={() => router.push("/login")} 
          className="absolute top-4 left-4 md:top-8 md:left-8 gap-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md my-auto py-4"
        >
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex justify-center items-center group mb-4">
              <Image
                src="/logo.png"
                alt="Harglim Publishers"
                width={56}
                height={56}
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">
              Reset Your Password
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center space-y-4 shadow-sm"
            >
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Check Your Inbox</h3>
              <p className="text-sm text-muted-foreground">
                We have sent password reset instructions to <strong className="text-foreground">{email}</strong>.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Button 
                  onClick={() => setIsSubmitted(false)} 
                  variant="outline" 
                  className="w-full"
                >
                  Try Another Email
                </Button>
                <Link href="/login">
                  <Button className="w-full">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                {isLoading ? "Sending instructions..." : "Send Reset Link"}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
