"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import { TriangleAlert, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const ResetPassword = () => {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setPending(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => router.push("/sign-in"), 2500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="h-full min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <Card className="md:h-auto w-[90%] sm:w-[420px] p-4 sm:p-8 bg-[#090d16]/90 border-blue-500/20 backdrop-blur-sm shadow-2xl shadow-blue-950/45">
        <CardHeader>
          <CardTitle className="text-center text-slate-100 text-2xl font-bold">
            Set New Password
          </CardTitle>
          <CardDescription className="text-sm text-center text-slate-400">
            Choose a strong new password for your account
          </CardDescription>
        </CardHeader>

        {!!error && (
          <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6 mx-6">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <CardContent className="px-2 sm:px-6 text-center space-y-4">
            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 text-green-400 text-sm flex items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Password updated! Redirecting you to Sign In…</span>
            </div>
          </CardContent>
        ) : (
          <CardContent className="px-2 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                disabled={pending}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
              />
              <Input
                type="password"
                disabled={pending}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
              />

              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 border-none"
                size="lg"
                disabled={pending}
              >
                {pending ? "Updating…" : "Update Password"}
              </Button>
            </form>

            <p className="text-center text-sm mt-6 text-slate-400">
              Remember it now?{" "}
              <Link className="text-blue-400 ml-1 hover:underline cursor-pointer font-medium" href="/sign-in">
                Sign In
              </Link>
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
