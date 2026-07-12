"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { TriangleAlert, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

const ForgotPassword = () => {
  const [email, setEmail] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
        toast.success("Reset link sent successfully");
      }
    } catch {
      setError("Failed to send reset link");
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
          <CardTitle className="text-center text-slate-100 text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-sm text-center text-slate-400">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        
        {!!error && (
          <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success ? (
          <CardContent className="px-2 sm:px-6 text-center space-y-4">
            <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 text-green-400 text-sm">
              We have sent a password reset link to <strong className="text-slate-100">{email}</strong>. Please check your inbox.
            </div>
            <div className="pt-2">
              <Link href="/sign-in" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          </CardContent>
        ) : (
          <CardContent className="px-2 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                disabled={pending}
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
              />

              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 border-none"
                size="lg" 
                disabled={pending}
              >
                {pending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <Separator className="my-6 bg-slate-800" />
            
            <p className="text-center text-sm text-slate-400">
              Remember your password?
              <Link
                className="text-blue-400 ml-2 hover:underline cursor-pointer font-medium"
                href="/sign-in"
              >
                Sign In
              </Link>
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
