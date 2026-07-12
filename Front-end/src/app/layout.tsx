import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SupabaseAuthProvider } from "@/providers/supabase-auth-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CareerPath AI — Your AI Career Partner",
  description: "Upload your resume and let CareerPath AI instantly match you with jobs, identify skill gaps, personalize your study roadmaps, and accelerate your path from student to professional.",
  keywords: ["AI career", "job matching", "resume parser", "skill gap analysis", "career roadmap"],
  openGraph: {
    title: "CareerPath AI — Your AI Career Partner",
    description: "AI-powered job matching, skill gap analysis, and career roadmaps for students and fresh graduates.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseAuthProvider>
          <Toaster />
          {children}
        </SupabaseAuthProvider>
      </body>
    </html>
  );
}
