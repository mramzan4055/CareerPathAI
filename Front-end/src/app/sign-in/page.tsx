"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, TriangleAlert, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

const SignIn = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid Credentials");
        setPending(false);
      } else {
        toast.success("Login successful");
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
      setPending(false);
    }
  };

  const handleProvider = async (
    event: React.MouseEvent<HTMLButtonElement>,
    provider: "github" | "google"
  ) => {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (oAuthError) {
        setError(oAuthError.message);
        setPending(false);
      }
    } catch {
      setError("OAuth initialization failed");
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] relative overflow-hidden px-4">
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-indigo-600/6 rounded-full blur-2xl pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight">
          CareerPath AI
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#070b14]/90 backdrop-blur-sm shadow-2xl shadow-black/50 p-8">
        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your CareerPath AI workspace</p>
        </div>

        {/* Error */}
        {!!error && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* OAuth buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Button
            disabled={pending}
            onClick={(e) => handleProvider(e, "google")}
            variant="outline"
            className="bg-slate-900/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl h-10 text-sm font-medium transition-all"
          >
            <FcGoogle className="size-4 mr-2" /> Google
          </Button>
          <Button
            disabled={pending}
            onClick={(e) => handleProvider(e, "github")}
            variant="outline"
            className="bg-slate-900/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl h-10 text-sm font-medium transition-all"
          >
            <FaGithub className="size-4 mr-2" /> GitHub
          </Button>
        </div>

        <div className="relative mb-5">
          <Separator className="bg-slate-800" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#070b14] px-3 text-[11px] text-slate-500 font-medium">
            or continue with email
          </span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            disabled={pending}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-900/60 border-slate-700/70 text-slate-100 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 placeholder:text-slate-500 rounded-xl h-11"
          />
          <div className="space-y-1.5">
            <Input
              type="password"
              disabled={pending}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-900/60 border-slate-700/70 text-slate-100 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 placeholder:text-slate-500 rounded-xl h-11"
            />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 border-none group"
            disabled={pending}
          >
            {pending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…</>
            ) : (
              <>Sign In <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-sm mt-6 text-slate-400">
          Don&apos;t have an account?{" "}
          <Link className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors" href="/sign-up">
            Sign Up
          </Link>
        </p>
      </div>

      {/* Footer note */}
      <p className="mt-6 text-[11px] text-slate-600 text-center max-w-sm">
        By signing in you agree to our terms. Your data is stored securely and protected under GDPR Art. 15/17/20.
      </p>
    </div>
  );
};

export default SignIn;
