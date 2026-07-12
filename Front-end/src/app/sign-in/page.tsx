"use client";

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
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
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
    <div className="h-full min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      <Card className="md:h-auto w-[90%] sm:w-[420px] p-4 sm:p-8 bg-[#090d16]/90 border-blue-500/20 backdrop-blur-sm shadow-2xl shadow-blue-950/45">
        <CardHeader>
          <CardTitle className="text-center text-slate-100 text-2xl font-bold font-sans">Sign In</CardTitle>
          <CardDescription className="text-sm text-center text-slate-400">
            Use email or service to sign in
          </CardDescription>
        </CardHeader>
        {!!error && (
          <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <CardContent className="px-2 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              disabled={pending}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
            />
            <div className="space-y-2">
              <Input
                type="password"
                disabled={pending}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
              />
              <div className="flex justify-end text-xs">
                <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 border-none" 
              size="lg" 
              disabled={pending}
            >
              Continue
            </Button>
          </form>

          <Separator className="my-6 bg-slate-800" />
          
          <div className="flex my-2 justify-evenly mx-auto items-center gap-4">
            <Button
              disabled={pending}
              onClick={(e) => handleProvider(e, "google")}
              variant="outline"
              size="lg"
              className="w-full bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <FcGoogle className="size-6 mr-2" /> Google
            </Button>
            <Button
              disabled={pending}
              onClick={(e) => handleProvider(e, "github")}
              variant="outline"
              size="lg"
              className="w-full bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <FaGithub className="size-6 mr-2" /> GitHub
            </Button>
          </div>
          
          <p className="text-center text-sm mt-6 text-slate-400">
            Create new account?
            <Link
              className="text-blue-400 ml-2 hover:underline cursor-pointer font-medium"
              href="/sign-up"
            >
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
