"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const UserButton = () => {
  const router = useRouter();
  const { user, loading, signOut } = useSupabaseAuth();

  if (loading) {
    return <Loader className="size-6 mr-4 mt-4 float-right animate-spin text-blue-500" />;
  }

  // Fetch name from user metadata or fallback to email local part
  const name = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarFallback = name.charAt(0).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <nav>
      {user ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="outline-none relative float-right p-4 md:p-8">
            <div className="flex gap-4 items-center">
              <span className="text-slate-300 hover:text-white transition-colors">{name}</span>
              <Avatar className="size-10 hover:opacity-75 transition border border-blue-500/20">
                <AvatarImage
                  className="size-10 hover:opacity-75 transition"
                  src={avatarUrl || undefined}
                />
                <AvatarFallback className="bg-blue-900 text-white font-semibold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="bottom" className="w-50 bg-[#090d16] border-slate-800 text-slate-200">
            <DropdownMenuItem className="h-10 hover:bg-slate-800 cursor-pointer" onClick={() => handleSignOut()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex justify-end p-4 gap-4">
          <Button variant="ghost" asChild className="text-slate-300 hover:text-white hover:bg-slate-800/40">
            <Link href="/sign-in" prefetch={true}>Sign in</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-none shadow-lg shadow-blue-500/20">
            <Link href="/sign-up" prefetch={true}>Sign up</Link>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default UserButton;
