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
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

const SignUp = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setPending(false);
      } else {
        setPending(false);
        // Supabase Auth sends an email verification by default, or logs in directly depending on configuration.
        // Let's toast a friendly message.
        if (data?.session) {
          toast.success("Account created and logged in!");
          router.push("/");
          router.refresh();
        } else {
          toast.success("Registration successful! Please check your email for verification.");
          router.push("/sign-in");
        }
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
    setError(null);

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
          <CardTitle className="text-center text-slate-100 text-2xl font-bold font-sans">Sign Up</CardTitle>
          <CardDescription className="text-sm text-center text-slate-400">
            Use email or service to create account
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
              type="text"
              disabled={pending}
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
            />
            <Input
              type="email"
              disabled={pending}
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
            />
            <Input
              type="password"
              disabled={pending}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
            />
            <Input
              type="password"
              disabled={pending}
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              required
              className="bg-slate-900/60 border-slate-700 text-slate-100 focus-visible:ring-blue-500 placeholder:text-slate-500"
            />
            
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
          
          <p className="text-center text-sm mt-6 text-slate-400 font-sans">
            Already have an account?
            <Link
              className="text-blue-400 ml-2 hover:underline cursor-pointer font-medium"
              href="/sign-in"
            >
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
