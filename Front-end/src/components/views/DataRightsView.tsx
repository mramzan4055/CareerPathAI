"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  Lock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── API helpers ───────────────────────────────────────────────────────────

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

interface DataRightsStatus {
  deletion_requested: boolean;
  deletion_requested_at: string | null;
  recent_exports: string[];
}

async function fetchStatus(): Promise<DataRightsStatus> {
  const res = await authFetch("/api/v1/data-rights/status");
  if (!res.ok) throw new Error("Failed to fetch status");
  const data = await res.json();
  return data;
}

async function downloadMyData(): Promise<object> {
  const res = await authFetch("/api/v1/data-rights/my-data");
  if (!res.ok) throw new Error("Failed to export data");
  const data = await res.json();
  return data.data;
}

async function requestDeletion(reason: string): Promise<void> {
  const res = await authFetch("/api/v1/data-rights/delete", {
    method: "POST",
    body: JSON.stringify({ confirm: true, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to request deletion");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function triggerJSONDownload(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Main View ─────────────────────────────────────────────────────────────

export default function DataRightsView() {
  const [status, setStatus] = useState<DataRightsStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    fetchStatus()
      .then(setStatus)
      .catch(() => toast.error("Failed to load data rights status"))
      .finally(() => setLoadingStatus(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await downloadMyData();
      const filename = `careerpath-data-export-${new Date().toISOString().split("T")[0]}.json`;
      triggerJSONDownload(data, filename);
      toast.success("Your data export has been downloaded!");
      // Refresh status to show new export
      const newStatus = await fetchStatus();
      setStatus(newStatus);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await requestDeletion(deletionReason);
      setDeleted(true);
      toast.success("Account deletion request submitted. Your data has been removed.");
      // Sign out after a short delay
      setTimeout(async () => {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        await sb.auth.signOut();
        window.location.href = "/";
      }, 3000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Deletion request failed");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-400" /> Privacy &amp; Data Rights
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Your data belongs to you. Download a copy or permanently delete your account
          in compliance with GDPR and international privacy regulations.
        </p>
      </div>

      {/* Privacy principles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Lock, label: "End-to-end", desc: "Stored in your own Supabase project" },
          { icon: Eye, label: "No tracking", desc: "Zero third-party analytics or ads" },
          { icon: Shield, label: "GDPR ready", desc: "Export or delete at any time" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="p-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl flex gap-3">
            <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-slate-200">{label}</div>
              <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Deletion status banner */}
      {status?.deletion_requested && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Account deletion requested</p>
            <p className="text-xs text-red-400 mt-1">
              Requested {status.deletion_requested_at ? timeAgo(status.deletion_requested_at) : ""}.
              Your authentication account will be fully deleted within 30 days.
            </p>
          </div>
        </div>
      )}

      {/* Data Export Section */}
      <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-100">Export My Data</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Download a complete copy of all your data including your profile, CVs, saved jobs,
          applications, cover letters, learning plans, and activity log. Exported as a JSON file.
        </p>

        {status && status.recent_exports.length > 0 && (
          <div className="text-xs text-slate-500">
            Last exported: {timeAgo(status.recent_exports[0])}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "Preparing export…" : "Download My Data (JSON)"}
        </button>

        <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl flex gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            The export includes: profile, CVs, saved jobs, applications, cover letters,
            learning plans, notifications, and audit log. Passwords are never stored or exported.
          </p>
        </div>
      </div>

      {/* Account Deletion Section */}
      {!deleted ? (
        <div className="p-6 bg-slate-900/30 border border-red-900/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-slate-100">Delete My Account</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Permanently delete your account and all associated data. This action
            removes your profile, CVs, saved jobs, applications, and cover letters immediately.
            Your sign-in account will be fully deleted within 30 days (GDPR Article 17).
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={status?.deletion_requested}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm font-bold transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {status?.deletion_requested ? "Deletion already requested" : "Request Account Deletion"}
            </button>
          ) : (
            <div className="space-y-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 font-medium leading-relaxed">
                  This action is irreversible. All your data will be permanently deleted.
                  You will be signed out automatically after confirmation.
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1.5">
                  Reason (optional — helps us improve):
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="e.g. Found a job, privacy concerns, switching platforms…"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-lg text-xs text-slate-100 placeholder-slate-600 resize-none outline-none focus:border-red-500/40 transition-colors"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {deleting ? "Processing…" : "Yes, Delete My Account"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700/50 text-slate-400 hover:text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-300">Account deletion confirmed</p>
            <p className="text-xs text-green-400/80 mt-1">
              Your data has been removed. Redirecting you to the homepage…
            </p>
          </div>
        </div>
      )}

      {/* Regulatory note */}
      <div className="p-4 bg-slate-900/20 border border-slate-800/50 rounded-xl flex gap-2">
        <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          CareerPath AI complies with GDPR (EU) 2016/679 and relevant data protection laws.
          Right to access (Art. 15), Right to erasure (Art. 17), Right to portability (Art. 20).
          For support: <span className="text-slate-400">privacy@careerpathai.example.com</span>
        </p>
      </div>
    </div>
  );
}
