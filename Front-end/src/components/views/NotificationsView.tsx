"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  X,
  Briefcase,
  AlertCircle,
  Calendar,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "match_alert" | "reminder" | "system" | "digest" | string;
  title: string;
  body?: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

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

async function fetchNotifications(unreadOnly: boolean): Promise<Notification[]> {
  const res = await authFetch(`/api/v1/notifications/?unread_only=${unreadOnly}&limit=100`);
  if (!res.ok) throw new Error("Failed to load notifications");
  const data = await res.json();
  return data.notifications ?? [];
}

async function markRead(id: string): Promise<void> {
  const res = await authFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to mark as read");
}

async function markAllRead(): Promise<void> {
  const res = await authFetch("/api/v1/notifications/read-all", { method: "POST" });
  if (!res.ok) throw new Error("Failed to mark all as read");
}

async function deleteNotification(id: string): Promise<void> {
  const res = await authFetch(`/api/v1/notifications/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete notification");
}

// ── Sub-components ────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "match_alert":
      return <Briefcase className="w-4 h-4 text-blue-400" />;
    case "reminder":
      return <Calendar className="w-4 h-4 text-amber-400" />;
    case "digest":
      return <Newspaper className="w-4 h-4 text-violet-400" />;
    default:
      return <AlertCircle className="w-4 h-4 text-slate-400" />;
  }
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    match_alert: "Job Match",
    reminder: "Reminder",
    system: "System",
    digest: "Digest",
  };
  return labels[type] ?? type;
}

function typeColor(type: string): string {
  const colors: Record<string, string> = {
    match_alert: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    reminder: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    system: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    digest: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  };
  return colors[type] ?? "text-slate-400 bg-slate-500/10 border-slate-500/20";
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

function NotificationCard({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`p-4 border rounded-2xl transition-all flex gap-3 ${
        notification.read
          ? "bg-slate-900/20 border-slate-800/40 opacity-70"
          : "bg-slate-900/40 border-slate-700/60"
      }`}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">
        <TypeIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100 leading-snug">
              {notification.title}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor(notification.type)}`}
            >
              {typeLabel(notification.type)}
            </span>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
            {timeAgo(notification.created_at)}
          </span>
        </div>

        {notification.body && (
          <p className="text-xs text-slate-400 leading-relaxed">{notification.body}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {!notification.read && (
            <button
              onClick={() => onRead(notification.id)}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Mark read
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="text-[11px] text-slate-500 hover:text-red-400 font-medium transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications(unreadOnly);
      setNotifications(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (id: string) => {
    try {
      await markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss notification");
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-black">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Job match alerts, application reminders, and platform updates.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-bold transition-all disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            !unreadOnly
              ? "bg-slate-700 text-slate-100"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            unreadOnly
              ? "bg-slate-700 text-slate-100"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Unread only
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <BellOff className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400 font-medium">
            {unreadOnly ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-slate-500 text-sm max-w-xs">
            When new job matches are found or your applications need follow-up,
            you&apos;ll see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onRead={handleRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="p-4 bg-slate-900/20 border border-slate-800/50 rounded-xl">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Notification types:</strong>{" "}
          <span className="text-blue-400">Job Match</span> — new listings matching your profile ·{" "}
          <span className="text-amber-400">Reminder</span> — application follow-up prompts ·{" "}
          <span className="text-violet-400">Digest</span> — weekly activity summary ·{" "}
          <span className="text-slate-400">System</span> — platform announcements.
          Read notifications are automatically pruned after 30 days.
        </p>
      </div>
    </div>
  );
}
