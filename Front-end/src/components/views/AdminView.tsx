"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getJobSources,
  triggerJobSync,
  importJobsFile,
  type JobSource,
} from "@/lib/api";
import {
  Settings,
  RefreshCw,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Globe2,
  Key,
  Database,
  FileUp,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminView() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPages, setSyncPages] = useState(3);
  const [importResult, setImportResult] = useState<{
    parsed: number; valid: number; saved: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSources = async () => {
    setLoading(true);
    try {
      const res = await getJobSources();
      setSources(res.sources);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load job sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSources(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await triggerJobSync(syncPages);
      toast.success(res.message || "Sync started in background!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importJobsFile(file);
      setImportResult({ parsed: res.parsed, valid: res.valid, saved: res.saved });
      toast.success(`Imported ${res.saved} jobs from ${file.name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const healthIcon = (status: string) => {
    if (status === "ok") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "not_configured") return <AlertCircle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  const healthLabel = (status: string) => {
    if (status === "ok") return "Healthy";
    if (status === "not_configured") return "Not configured";
    return "Error";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-400" /> Job Source Admin
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage data connectors, trigger syncs, and import job listings.
        </p>
      </div>

      {/* Source Status Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Enabled Sources</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map(src => (
              <div
                key={src.id}
                className="p-5 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {src.type === "public_api"
                      ? <Globe2 className="w-4 h-4 text-emerald-400" />
                      : <Key className="w-4 h-4 text-amber-400" />}
                    <span className="font-bold text-slate-100 text-sm">{src.name}</span>
                  </div>
                  {healthIcon(src.health.status)}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{src.description}</p>

                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${src.health.status === "ok" ? "text-green-400" : src.health.status === "not_configured" ? "text-amber-400" : "text-red-400"}`}>
                    {healthIcon(src.health.status)}
                    {" "}{healthLabel(src.health.status)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                    src.requires_key
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    {src.requires_key ? "Key required" : "No key needed"}
                  </span>
                </div>

                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-mono truncate block"
                >
                  {src.url}
                </a>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={loadSources}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh health status
        </button>
      </div>

      {/* Sync Control */}
      <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100">Full Source Sync</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Fetches fresh listings from all enabled zero-cost sources (Arbeitnow, Jobicy, Greenhouse, Lever)
          and upserts them into the database. Runs in the background — you can navigate away.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">Pages per source:</label>
            <select
              value={syncPages}
              onChange={e => setSyncPages(Number(e.target.value))}
              className="bg-slate-900/60 border border-slate-700/50 text-slate-100 text-xs rounded-lg px-2 py-1.5 outline-none"
            >
              {[1, 2, 3, 5, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? "Starting…" : "Trigger Sync"}
          </button>
        </div>

        <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
          <p className="text-[10px] text-slate-500 font-mono">
            Arbeitnow: up to {syncPages} pages × 100 jobs = {syncPages * 100} max listings<br />
            Jobicy: 50 remote jobs (API cap)<br />
            Greenhouse: {syncPages * 10} jobs/board × {14} curated boards (no key)<br />
            Lever: {syncPages * 10} jobs/company × {15} curated companies (no key)<br />
            Adzuna: included only if ADZUNA_APP_ID and ADZUNA_APP_KEY are configured
          </p>
        </div>
      </div>

      {/* CSV/JSON Import */}
      <div className="p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <FileUp className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Manual Import</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Upload a <strong className="text-slate-300">.csv</strong> or{" "}
          <strong className="text-slate-300">.json</strong> file containing job listings.
          Required columns: <code className="text-cyan-400 font-mono">job_title</code>,{" "}
          <code className="text-cyan-400 font-mono">company</code>,{" "}
          <code className="text-cyan-400 font-mono">clean_description</code>.
          Optional: <code className="text-cyan-400 font-mono">location, url, remote, tags, contract_type, salary_min, salary_max</code>.
        </p>

        <div className="flex items-center gap-4">
          <label
            htmlFor="import-file"
            className="cursor-pointer px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center gap-2 transition-all"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? "Importing…" : "Choose File"}
          </label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.json"
            className="hidden"
            ref={fileRef}
            onChange={handleImport}
          />
        </div>

        {importResult && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4" /> Import complete
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { label: "Parsed", value: importResult.parsed },
                { label: "Valid", value: importResult.valid },
                { label: "Saved", value: importResult.saved },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2 bg-slate-900/40 rounded-lg">
                  <div className="text-lg font-black text-slate-100">{value}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="p-4 bg-slate-900/20 border border-slate-800/50 rounded-xl">
        <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-blue-400" /> Architecture Notes
        </h3>
        <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed list-disc pl-4">
          <li>Jobs are deduplicated by <code className="text-slate-400">external_id</code> (SHA-256 fingerprint of slug + company).</li>
          <li>DB cache TTL is 6 hours — after that, <code className="text-slate-400">/jobs/find</code> re-fetches from live sources.</li>
          <li>Arbeitnow, Jobicy, Greenhouse, and Lever require no API key. Adzuna is optional.</li>
          <li>No automated LinkedIn scraping — only approved APIs and manual imports per spec.</li>
          <li>Semantic matching uses pgvector cosine similarity via the Supabase <code className="text-slate-400">match_jobs</code> RPC.</li>
        </ul>
      </div>
    </div>
  );
}
