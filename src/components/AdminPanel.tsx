import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiActivity, FiCalendar, FiRefreshCw, FiSearch, FiUsers } from "react-icons/fi";
import { RiFileExcel2Line, RiFilePdfLine } from "react-icons/ri";
import { API_BASE } from "../services/api";
import { translateIfKey, useT } from "../i18n";
import type { RootState } from "../redux/store";
import {
  exportUsersToExcel,
  exportUsersToPdf,
  type RawVisitItem,
  type ReportMeta,
  type UserReportItem,
} from "../tools/adminReport";
import "./AdminPanel.css";

interface Visit {
  id: number;
  user_id: string;
  name: string;
  email: string;
  visited_at: string;
}

interface AccountItem {
  user_id: string;
  name: string;
  email: string;
  created_at: string | null;
  last_sign_in_at: string | null;
}

type Preset = "all" | "today" | "7d" | "30d" | "month";

const toYMD = (d: Date) => d.toISOString().split("T")[0];

export default function AdminPanel() {
  const { t, lang } = useT();
  const locale = lang === "pt" ? "pt-BR" : "en-US";
  const { token, profile } = useSelector((state: RootState) => state.user);

  const [rows, setRows] = useState<Visit[]>([]);
  const [accounts, setAccounts] = useState<Record<string, AccountItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preset, setPreset] = useState<Preset>("all");
  const [activeTab, setActiveTab] = useState<"users" | "visits">("users");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/overview`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.detail === "string" ? body.detail : "admin.err_load");
      }
      const data = (await res.json()) as { visits: Visit[]; users: AccountItem[] };
      setRows(data.visits ?? []);
      setAccounts(Object.fromEntries((data.users ?? []).map((u) => [u.user_id, u])));
    } catch (err) {
      setError(err instanceof Error && err.message.includes(".") ? err.message : "admin.err_load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const now = new Date();
    setEndDate(toYMD(now));
    if (p === "today") setStartDate(toYMD(now));
    else if (p === "7d") setStartDate(toYMD(new Date(now.getTime() - 7 * 86400000)));
    else if (p === "30d") setStartDate(toYMD(new Date(now.getTime() - 30 * 86400000)));
    else setStartDate(toYMD(new Date(now.getFullYear(), now.getMonth(), 1)));
  };

  const filteredVisits = useMemo(() => {
    let list = rows;
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      list = list.filter((r) => new Date(r.visited_at) >= start);
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);
      list = list.filter((r) => new Date(r.visited_at) <= end);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.user_id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, startDate, endDate, query]);

  const usersSummary = useMemo(() => {
    const map = new Map<string, UserReportItem>();
    const historicalFirstSeen = new Map<string, string>();
    rows.forEach((r) => {
      const key = r.user_id || r.email;
      const existing = historicalFirstSeen.get(key);
      if (!existing || new Date(r.visited_at) < new Date(existing)) historicalFirstSeen.set(key, r.visited_at);
    });

    filteredVisits.forEach((r) => {
      const key = r.user_id || r.email;
      const account = accounts[r.user_id];
      if (!map.has(key)) {
        map.set(key, {
          userId: r.user_id,
          name: r.name || account?.name || t("admin.unnamed"),
          email: r.email,
          visitsCount: 1,
          firstSeen: account?.created_at || historicalFirstSeen.get(key) || r.visited_at,
          lastSeen: r.visited_at,
        });
      } else {
        const item = map.get(key)!;
        item.visitsCount += 1;
        if (new Date(r.visited_at) > new Date(item.lastSeen)) item.lastSeen = r.visited_at;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.visitsCount - a.visitsCount);
  }, [filteredVisits, rows, accounts, t]);

  const periodLabel = useMemo(() => {
    const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale);
    if (!startDate && !endDate) return t("admin.period_all");
    if (startDate && !endDate) return t("admin.period_from", { a: fmt(startDate) });
    if (!startDate && endDate) return t("admin.period_to", { b: fmt(endDate) });
    return t("admin.period_range", { a: fmt(startDate), b: fmt(endDate) });
  }, [startDate, endDate, locale, t]);

  const reportMeta: ReportMeta = {
    periodLabel,
    startDate,
    endDate,
    totalUsers: usersSummary.length,
    totalVisits: filteredVisits.length,
    adminEmail: profile?.email,
  };

  const rawVisitsForExport: RawVisitItem[] = filteredVisits.map((v) => ({
    id: v.id,
    userId: v.user_id,
    name: v.name,
    email: v.email,
    visitedAt: v.visited_at,
  }));

  const avgVisits = usersSummary.length > 0 ? (filteredVisits.length / usersSummary.length).toFixed(1) : "0";
  const presets: [Preset, string][] = [
    ["all", t("admin.preset_all")],
    ["today", t("admin.preset_today")],
    ["7d", t("admin.preset_7d")],
    ["30d", t("admin.preset_30d")],
    ["month", t("admin.preset_month")],
  ];

  return (
    <div className="adm">
      <div className="page">
        <div className="top">
          <div className="header-brand">
            <div>
              <h1>{t("admin.title")}</h1>
              <div className="stats">{profile?.email ? t("admin.connected_as", { email: profile.email }) : ""}</div>
            </div>
          </div>
          <button className="ghost" onClick={load} disabled={loading} title={t("admin.refresh_title")}>
            <FiRefreshCw size={15} className={loading ? "spin" : ""} />
            <span>{t("admin.refresh")}</span>
          </button>
        </div>

        {error && <div className="error">{translateIfKey(t, error)}</div>}

        <div className="kpi-row">
          <div className="card kpi-card">
            <div className="kpi-label">{t("admin.kpi_users")}</div>
            <div className="kpi-value">{usersSummary.length}</div>
            <div className="kpi-desc">{t("admin.kpi_users_desc")}</div>
          </div>
          <div className="card kpi-card" style={{ borderLeftColor: "#059669" }}>
            <div className="kpi-label">{t("admin.kpi_visits")}</div>
            <div className="kpi-value" style={{ color: "#059669" }}>{filteredVisits.length}</div>
            <div className="kpi-desc">{t("admin.kpi_visits_desc")}</div>
          </div>
          <div className="card kpi-card" style={{ borderLeftColor: "#8b5cf6" }}>
            <div className="kpi-label">{t("admin.kpi_avg")}</div>
            <div className="kpi-value" style={{ color: "#8b5cf6" }}>{avgVisits}</div>
            <div className="kpi-desc">{t("admin.kpi_avg_desc")}</div>
          </div>
        </div>

        <div className="card filters-bar">
          <div className="filter-row">
            <div className="filter-group">
              <FiCalendar size={16} color="#64748b" />
              <span className="filter-label">{t("admin.period")}</span>
            </div>
            <div className="filter-group">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset("all"); }}
                title={t("admin.start_date")}
              />
              <span style={{ color: "#94a3b8" }}>{t("admin.until")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset("all"); }}
                title={t("admin.end_date")}
              />
            </div>
            <div className="preset-pills">
              {presets.map(([key, label]) => (
                <button key={key} type="button" className={`pill-btn ${preset === key ? "active" : ""}`} onClick={() => applyPreset(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-row">
            <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
              <FiSearch
                size={15}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}
              />
              <input
                className="search-input"
                style={{ paddingLeft: "36px", width: "100%" }}
                placeholder={t("admin.search_ph")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {(startDate || endDate || query) && (
              <button type="button" className="ghost" style={{ height: "40px" }} onClick={() => { applyPreset("all"); setQuery(""); }}>
                {t("admin.clear_filters")}
              </button>
            )}
          </div>
        </div>

        <div className="toolbar-row">
          <div className="view-tabs">
            <button type="button" className={`tab-btn ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
              <FiUsers size={14} style={{ marginRight: "6px" }} />
              {t("admin.tab_users", { n: usersSummary.length })}
            </button>
            <button type="button" className={`tab-btn ${activeTab === "visits" ? "active" : ""}`} onClick={() => setActiveTab("visits")}>
              <FiActivity size={14} style={{ marginRight: "6px" }} />
              {t("admin.tab_visits", { n: filteredVisits.length })}
            </button>
          </div>
          <div className="export-actions">
            <button
              type="button"
              className="btn-excel"
              onClick={() => exportUsersToExcel(usersSummary, rawVisitsForExport, reportMeta)}
              disabled={!usersSummary.length}
              title={t("admin.export_excel_title")}
            >
              <RiFileExcel2Line size={16} />
              <span>{t("admin.export_excel")}</span>
            </button>
            <button
              type="button"
              className="btn-pdf"
              onClick={() => exportUsersToPdf(usersSummary, reportMeta)}
              disabled={!usersSummary.length}
              title={t("admin.export_pdf_title")}
            >
              <RiFilePdfLine size={16} />
              <span>{t("admin.export_pdf")}</span>
            </button>
          </div>
        </div>

        <div className="card table-wrap">
          {activeTab === "users" ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>{t("admin.col_name")}</th>
                  <th>{t("admin.col_email")}</th>
                  <th style={{ textAlign: "center" }}>{t("admin.col_visits")}</th>
                  <th>{t("admin.col_first")}</th>
                  <th>{t("admin.col_last")}</th>
                </tr>
              </thead>
              <tbody>
                {usersSummary.map((u, i) => (
                  <tr key={u.userId || u.email}>
                    <td style={{ color: "var(--muted)", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge">{t(u.visitsCount === 1 ? "admin.visit_one" : "admin.visit_many", { n: u.visitsCount })}</span>
                    </td>
                    <td className="muted">{u.firstSeen ? new Date(u.firstSeen).toLocaleDateString(locale) : "-"}</td>
                    <td className="muted">{u.lastSeen ? new Date(u.lastSeen).toLocaleString(locale) : "-"}</td>
                  </tr>
                ))}
                {!usersSummary.length && !loading && (
                  <tr>
                    <td colSpan={6} className="empty-state">{t("admin.empty_users")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>{t("admin.col_id")}</th>
                  <th>{t("admin.col_name")}</th>
                  <th>{t("admin.col_email")}</th>
                  <th>{t("admin.col_datetime")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((r) => (
                  <tr key={r.id}>
                    <td className="muted">#{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{r.email}</td>
                    <td className="muted">{new Date(r.visited_at).toLocaleString(locale)}</td>
                  </tr>
                ))}
                {!filteredVisits.length && !loading && (
                  <tr>
                    <td colSpan={4} className="empty-state">{t("admin.empty_visits")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
