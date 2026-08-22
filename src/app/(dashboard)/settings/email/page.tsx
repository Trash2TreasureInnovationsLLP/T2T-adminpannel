"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Globe,
  ShieldCheck,
  FileText,
  XCircle,
  RotateCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { getEmailSettings, getEmailLogsAction, sendAdminTestEmailAction, retryFailedEmailAction } from "./actions";
import { EmailCategory } from "@/lib/email/types";
import { toast } from "sonner";

const CATEGORIES: Array<{ id: EmailCategory | "all"; label: string }> = [
  { id: "all", label: "All Categories" },
  { id: "auth", label: "Auth" },
  { id: "users", label: "Users" },
  { id: "waste", label: "Waste" },
  { id: "rewards", label: "Rewards" },
  { id: "pickups", label: "Pickups" },
  { id: "bins", label: "Bins" },
  { id: "payments", label: "Payments" },
  { id: "admin", label: "Admin" },
  { id: "system", label: "System" },
  { id: "marketing", label: "Marketing" },
];

export default function EmailSettingsPage() {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [config, setConfig] = useState({
    provider: "resend",
    isConfigured: true,
    resendConfigured: true,
    emailFrom: "noreply@trash2treasure.co.in",
    adminSender: "Trash2Treasure Admin <admin@trash2treasure.co.in>",
    supportSender: "Trash2Treasure Support <support@trash2treasure.co.in>",
    domain: "trash2treasure.co.in",
  });

  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | "all">("all");
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    lastSuccessful: null as string | null,
    lastFailed: null as string | null,
  });
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const fetchLogs = async (category: EmailCategory | "all" = selectedCategory) => {
    setLoadingLogs(true);
    try {
      const res = await getEmailLogsAction(category);
      if (res.success && res.logs) {
        setLogs(res.logs);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to fetch email logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    getEmailSettings()
      .then((res) => {
        setConfig(res);
      })
      .catch((err) => {
        console.error("Failed to load email settings", err);
      })
      .finally(() => {
        setLoadingConfig(false);
      });

    fetchLogs("all");
  }, []);

  const handleCategoryChange = (cat: EmailCategory | "all") => {
    setSelectedCategory(cat);
    fetchLogs(cat);
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const res = await sendAdminTestEmailAction();
      if (res.success) {
        toast.success(res.message || "Test email dispatched cleanly via Resend!");
        fetchLogs(selectedCategory);
      } else {
        toast.error(typeof res.error === "string" ? res.error : "Failed to send test email.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred sending test email.");
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleRetryEmail = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await retryFailedEmailAction(logId);
      if (res.success) {
        toast.success("Failed email re-dispatched successfully!");
        fetchLogs(selectedCategory);
      } else {
        toast.error(typeof res.error === "string" ? res.error : "Retry failed.");
      }
    } catch (err) {
      toast.error("Error retrying email dispatch.");
    } finally {
      setRetryingLogId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with back button */}
      <div className="flex flex-col gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-xs font-semibold text-[var(--t2t-text-secondary)] hover:text-[var(--t2t-primary)] transition-colors self-start"
        >
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        <PageHeader
          title="Central Email Center & Communications"
          description="Master email infrastructure serving Auth, Waste, EcoPoints, Rewards, Pickups, Bins, Payments, and Admin Alerts."
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Provider Status Card */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--t2t-border)] bg-[var(--t2t-surface)] p-6 shadow-[var(--t2t-shadow-sm)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-[var(--t2t-text)]">Central Provider: Resend Engine</h2>
                  {loadingConfig ? (
                    <RefreshCw size={14} className="animate-spin text-[var(--t2t-text-muted)]" />
                  ) : config.isConfigured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 size={12} /> Active (Production Ready)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
                      <AlertTriangle size={12} /> Missing API Key
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--t2t-text-secondary)]">
                  One central email service routing all T2T ecosystem dispatches through Resend with automatic retry and audit logging.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                className="h-10 px-5 rounded-xl bg-[var(--t2t-primary)] text-black hover:bg-[var(--t2t-primary)]/90 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shrink-0 shadow-[0_0_16px_rgba(20,239,16,0.3)]"
              >
                {sendingTestEmail ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Dispatching Test Email...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Test Email
                  </>
                )}
              </button>
            </div>

            <hr className="my-5 border-[var(--t2t-border)]" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--t2t-text-muted)] uppercase tracking-wider font-semibold">
                  Default Sender
                </span>
                <p className="text-sm font-semibold text-[var(--t2t-text)] truncate flex items-center gap-2">
                  <Mail size={15} className="text-[var(--t2t-primary)] shrink-0" />
                  <span>Trash2Treasure &lt;noreply@trash2treasure.co.in&gt;</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--t2t-text-muted)] uppercase tracking-wider font-semibold">
                  Admin Sender
                </span>
                <p className="text-sm font-semibold text-[var(--t2t-text)] truncate flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[var(--t2t-primary)] shrink-0" />
                  <span>Trash2Treasure Admin &lt;admin@trash2treasure.co.in&gt;</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--t2t-text-muted)] uppercase tracking-wider font-semibold">
                  Support Sender
                </span>
                <p className="text-sm font-semibold text-[var(--t2t-text)] truncate flex items-center gap-2">
                  <Globe size={15} className="text-[var(--t2t-primary)] shrink-0" />
                  <span>Trash2Treasure Support &lt;support@trash2treasure.co.in&gt;</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--t2t-border)] bg-[var(--t2t-surface)] space-y-1">
            <span className="text-xs font-semibold text-[var(--t2t-text-muted)] uppercase">Total Logged Emails</span>
            <div className="text-2xl font-extrabold text-[var(--t2t-text)]">{stats.total}</div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase">Successfully Sent</span>
            <div className="text-2xl font-extrabold text-emerald-400">{stats.sent}</div>
          </div>
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1">
            <span className="text-xs font-semibold text-red-400 uppercase">Failed Delivery</span>
            <div className="text-2xl font-extrabold text-red-400">{stats.failed}</div>
          </div>
          <div className="p-4 rounded-xl border border-[var(--t2t-border)] bg-[var(--t2t-surface)] space-y-1">
            <span className="text-xs font-semibold text-[var(--t2t-text-muted)] uppercase">Last Successful Dispatch</span>
            <div className="text-xs font-mono font-medium text-[var(--t2t-text-secondary)] mt-1">
              {stats.lastSuccessful ? new Date(stats.lastSuccessful).toLocaleString() : "None Recorded"}
            </div>
          </div>
        </div>

        {/* Admin Email Center Table */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-[var(--t2t-border)] bg-[var(--t2t-surface)] p-6 shadow-[var(--t2t-shadow-sm)] flex flex-col space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[var(--t2t-text)] flex items-center gap-2">
                  <FileText size={18} className="text-[var(--t2t-primary)]" /> Admin Email Center
                </h3>
                <p className="text-xs text-[var(--t2t-text-secondary)] mt-0.5">
                  Centralized audit log of all email events across the T2T ecosystem.
                </p>
              </div>

              <button
                onClick={() => fetchLogs(selectedCategory)}
                disabled={loadingLogs}
                className="p-2 rounded-lg border border-[var(--t2t-border)] text-[var(--t2t-text-secondary)] hover:text-white hover:bg-[var(--t2t-surface-hover)] transition-colors cursor-pointer self-start md:self-auto"
                title="Refresh Logs"
              >
                <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--t2t-border)]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-[var(--t2t-primary)] text-black font-bold"
                      : "text-[var(--t2t-text-secondary)] hover:text-white hover:bg-[var(--t2t-surface-hover)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-[var(--t2t-border)] bg-[var(--t2t-surface-hover)]/40">
              <table className="w-full text-left text-xs text-[var(--t2t-text)]">
                <thead className="bg-[#121216] border-b border-[var(--t2t-border)] text-[var(--t2t-text-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Template</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--t2t-border)]">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[var(--t2t-text-muted)]">
                        <RefreshCw size={16} className="animate-spin inline-block mr-2" /> Querying central email logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[var(--t2t-text-muted)]">
                        No email logs found for this category.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--t2t-surface-hover)]/80 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-[var(--t2t-text-muted)]">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="p-3 font-semibold uppercase text-[10px] tracking-wider text-[var(--t2t-primary)]">
                          {log.category || "general"}
                        </td>
                        <td className="p-3 font-medium text-[var(--t2t-text)] max-w-[160px] truncate">
                          {log.recipient}
                        </td>
                        <td className="p-3 text-[var(--t2t-text-secondary)] font-mono text-[11px]">
                          {log.template}
                        </td>
                        <td className="p-3 font-semibold uppercase text-[10px] tracking-wider text-[var(--t2t-text-muted)]">
                          {log.provider}
                        </td>
                        <td className="p-3 text-right flex items-center justify-end gap-2">
                          {log.status === "sent" || log.status === "delivered" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={10} /> Sent
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                                <XCircle size={10} /> Failed
                              </span>
                              <button
                                onClick={() => handleRetryEmail(log.id)}
                                disabled={retryingLogId === log.id}
                                className="p-1 rounded bg-[var(--t2t-primary)]/10 text-[var(--t2t-primary)] hover:bg-[var(--t2t-primary)] hover:text-black transition-colors cursor-pointer"
                                title="Retry sending email"
                              >
                                <RotateCw size={12} className={retryingLogId === log.id ? "animate-spin" : ""} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
