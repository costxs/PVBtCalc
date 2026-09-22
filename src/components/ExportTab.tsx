import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import {
  groupSimulations,
  buildGroupExportPayload,
  isActiveRadialRun,
  type SimulationGroup,
} from "../tools/exportSimulations";
import { exportRadialWorkbookServer, exportRadialFiguresServer, type FigureSize } from "../tools/exportRadialServer";
import { exportCurveAsVerticalTable } from "../tools/export";
import { exportLinearWorkbookServer } from "../tools/exportLinearServer";
import { hasDirectoryPickerSupport, pickDirectory, getOrCreateSubdirectory } from "../tools/directoryExport";
import {
  listSnapshotSummaries, getSnapshot, deleteSnapshot, deleteAllSnapshots, renameSnapshot,
  SIMULATION_EVICTED_EVENT, type SimulationsEvictedDetail,
} from "../tools/simulationStoreIO";
import type { SimulationSnapshotSummary } from "../tools/simulationSnapshot";
import { openSnapshotIntoRedux } from "../tools/simulationRestore";
import { useT, translateIfKey } from "../i18n";

type FormatKey = "workbook" | "figures" | "tablesOnly";

interface ExportResultRow {
  simId: string;
  format: FormatKey;
  status: "ok" | "error" | "skipped";
  detail: string;
}

// curve.temperature is stored in Celsius for linear runs and Kelvin for radial ones (an
// existing, pre-Celsius-conversion difference in how the two regimes keep this field); the
// magnitude check disambiguates it. Only Celsius is shown.
function fmtTemperature(temp: number | null): string {
  if (temp == null || !Number.isFinite(temp)) return "—";
  const c = temp >= 100 ? temp - 273.15 : temp;
  return `${c.toFixed(1)} °C`;
}

interface ExportTabProps {
  onGoToRunner: () => void;
}

export default function ExportTab({ onGoToRunner }: ExportTabProps) {
  const dispatch = useDispatch();
  const { curves } = useSelector((state: RootState) => state.resultCurves);
  const radialState = useSelector((state: RootState) => state.radial);
  const analysisResult = useSelector((state: RootState) => state.analysisResult);
  const userToken = useSelector((state: RootState) => state.user.token);
  const { t, lang } = useT();
  const formatLabel = (f: FormatKey) => t(`export.format_${f}`);

  const [savedSims, setSavedSims] = useState<SimulationSnapshotSummary[]>([]);
  const [savedSimsLoading, setSavedSimsLoading] = useState(true);
  const [evictionNotice, setEvictionNotice] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const reloadSavedSims = async () => {
    setSavedSimsLoading(true);
    try {
      setSavedSims(await listSnapshotSummaries());
    } finally {
      setSavedSimsLoading(false);
    }
  };

  useEffect(() => {
    reloadSavedSims();
    const onEvicted = (e: Event) => {
      const detail = (e as CustomEvent<SimulationsEvictedDetail>).detail;
      const plural = detail.evictedLabels.length > 1;
      setEvictionNotice(
        t(plural ? "export.eviction_many" : "export.eviction_one", { labels: detail.evictedLabels.join(", ") })
      );
      reloadSavedSims();
    };
    window.addEventListener(SIMULATION_EVICTED_EVENT, onEvicted);
    return () => window.removeEventListener(SIMULATION_EVICTED_EVENT, onEvicted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const handleOpenSaved = async (id: string) => {
    setOpeningId(id);
    try {
      const full = await getSnapshot(id);
      if (full) openSnapshotIntoRedux(dispatch, full);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteSaved = async (id: string, label: string) => {
    const msg = t("export.confirm_delete_one", { label });
    if (!window.confirm(msg)) return;
    await deleteSnapshot(id);
    await reloadSavedSims();
  };

  const handleDeleteAllSaved = async () => {
    if (savedSims.length === 0) return;
    const msg = t("export.confirm_delete_all", { count: savedSims.length });
    if (!window.confirm(msg)) return;
    await deleteAllSnapshots();
    await reloadSavedSims();
  };

  const startRename = (sim: SimulationSnapshotSummary) => {
    setRenamingId(sim.id);
    setRenameValue(sim.label);
  };

  const confirmRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) await renameSnapshot(id, trimmed);
    setRenamingId(null);
    await reloadSavedSims();
  };

  const groups = useMemo(() => groupSimulations(curves as any), [curves]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fmtWorkbook, setFmtWorkbook] = useState(true);
  const [fmtFigures, setFmtFigures] = useState(false);
  const [fmtTablesOnly, setFmtTablesOnly] = useState(false);
  const [figureSize, setFigureSize] = useState<FigureSize>("single");

  const dirSupported = hasDirectoryPickerSupport();
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [dirName, setDirName] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ExportResultRow[]>([]);

  const allSelected = groups.length > 0 && groups.every((g) => selected.has(g.simId));

  const toggleOne = (simId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(simId)) next.delete(simId);
      else next.add(simId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(groups.map((g) => g.simId)));
  };

  const handlePickDirectory = async () => {
    const handle = await pickDirectory();
    if (handle) {
      setDirHandle(handle);
      setDirName((handle as any).name ?? (t("export.selected_folder")));
    }
  };

  const handleExport = async () => {
    const selGroups = groups.filter((g) => selected.has(g.simId));
    const formats: FormatKey[] = [
      ...(fmtWorkbook ? (["workbook"] as const) : []),
      ...(fmtFigures ? (["figures"] as const) : []),
      ...(fmtTablesOnly ? (["tablesOnly"] as const) : []),
    ];
    if (selGroups.length === 0 || formats.length === 0) return;

    setExporting(true);
    setResults([]);
    const linearGroups = selGroups.filter((g) => g.flowRegime === "linear");
    const radialGroups = selGroups.filter((g) => g.flowRegime !== "linear");
    const linearWithData = linearGroups.filter((g) => g.hasData);
    const linearNoData = linearGroups.filter((g) => !g.hasData);
    const linearUnits =
      (formats.includes("workbook") && linearWithData.length > 0 ? 1 : 0) +
      linearWithData.length * formats.filter((f) => f !== "workbook").length +
      linearNoData.length * formats.length;
    const total = radialGroups.length * formats.length + linearUnits;
    let done = 0;
    setProgress({ done: 0, total });

    let targetDir = dirHandle;
    if (dirHandle && selGroups.length > 1) {
      const dateStr = new Date().toISOString().split("T")[0];
      try {
        targetDir = await getOrCreateSubdirectory(dirHandle, `PVBtCalc_Export_${dateStr}`);
      } catch {
        targetDir = dirHandle;
      }
    }

    const downloadedDetail = (savedAs: string) => t("export.downloaded", { name: savedAs });
    const savedToFolderDetail = (savedAs: string) => t("export.saved_to_folder", { name: savedAs });

    const rows: ExportResultRow[] = [];
    for (const g of radialGroups) {
      if (!g.hasData) {
        const detail = t("export.simulation_with_no_calculated_results");
        for (const f of formats) rows.push({ simId: g.simId, format: f, status: "error", detail });
        done += formats.length;
        setProgress({ done, total });
        continue;
      }

      for (const f of formats) {
        try {
          const payload = buildGroupExportPayload(g, radialState, analysisResult);
          if (f === "workbook") {
            const r = await exportRadialWorkbookServer(payload, userToken || "", { includeImages: true, directoryHandle: targetDir });
            rows.push({ simId: g.simId, format: f, status: "ok", detail: r.usedFallback ? downloadedDetail(r.savedAs) : savedToFolderDetail(r.savedAs) });
          } else if (f === "tablesOnly") {
            const r = await exportRadialWorkbookServer(payload, userToken || "", { includeImages: false, directoryHandle: targetDir });
            rows.push({ simId: g.simId, format: f, status: "ok", detail: r.usedFallback ? downloadedDetail(r.savedAs) : savedToFolderDetail(r.savedAs) });
          } else {
            const r = await exportRadialFiguresServer(payload, figureSize, userToken || "", { directoryHandle: targetDir });
            rows.push({ simId: g.simId, format: f, status: "ok", detail: r.usedFallback ? downloadedDetail(r.savedAs) : savedToFolderDetail(r.savedAs) });
          }
        } catch (err) {
          rows.push({ simId: g.simId, format: f, status: "error", detail: translateIfKey(t, err instanceof Error ? err.message : String(err)) });
        }
        done++;
        setProgress({ done, total });
      }
    }

    for (const g of linearNoData) {
      const detail = t("export.simulation_with_no_calculated_results");
      for (const f of formats) { rows.push({ simId: g.simId, format: f, status: "error", detail }); done++; }
      setProgress({ done, total });
    }

    if (formats.includes("workbook") && linearWithData.length > 0) {
      const label = linearWithData.map((g) => g.simId).join(", ");
      try {
        const r = await exportLinearWorkbookServer(linearWithData.flatMap((g) => g.curves), userToken || "", { includeImages: true, directoryHandle: targetDir });
        rows.push({ simId: label, format: "workbook", status: "ok", detail: r.usedFallback ? downloadedDetail(r.savedAs) : savedToFolderDetail(r.savedAs) });
      } catch (err) {
        rows.push({ simId: label, format: "workbook", status: "error", detail: translateIfKey(t, err instanceof Error ? err.message : String(err)) });
      }
      done++;
      setProgress({ done, total });
    }

    for (const g of linearWithData) {
      for (const f of formats) {
        if (f === "workbook") continue;
        if (f === "tablesOnly") {
          try {
            g.curves.forEach((c) => exportCurveAsVerticalTable(c));
            const n = g.curves.length;
            rows.push({ simId: g.simId, format: f, status: "ok", detail: t(n > 1 ? "export.downloaded_files_many" : "export.downloaded_files_one", { count: n }) });
          } catch (err) {
            rows.push({ simId: g.simId, format: f, status: "error", detail: translateIfKey(t, err instanceof Error ? err.message : String(err)) });
          }
        } else {
          rows.push({ simId: g.simId, format: f, status: "skipped", detail: t("export.figure_package_not_available_for") });
        }
        done++;
        setProgress({ done, total });
      }
    }

    setResults(rows);
    setExporting(false);
  };

  const noFormatSelected = !fmtWorkbook && !fmtFigures && !fmtTablesOnly;
  const canExport = selected.size > 0 && !noFormatSelected && !exporting;

  return (
    <section style={{ padding: "30px 40px", overflowY: "auto", maxHeight: "100%", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "0.05em", color: "var(--color-accent-900)" }}>{t('common.export')}</h2>
        <span style={{ flex: 1, height: "1px", background: "var(--color-divider)" }}></span>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-accent-900)" }}>
            {t("export.saved_simulations")}
          </h3>
          <span style={{ fontSize: "12px", color: "var(--color-neutral-600)" }}>{t("export.local_cache_survives_page_reload")}</span>
          <span style={{ flex: 1 }} />
          {savedSims.length > 0 && (
            <button className="btn btn-red" style={{ fontSize: "11.5px", padding: "4px 10px" }} onClick={handleDeleteAllSaved}>
              {t("export.delete_all")}
            </button>
          )}
        </div>

        {evictionNotice && (
          <div role="alert" style={{
            margin: "0 0 8px", padding: "8px 12px", fontSize: "12px", lineHeight: 1.4,
            border: "1px solid #b87a33", borderLeft: "4px solid #b87a33",
            borderRadius: "6px", background: "#fdf5ea", color: "#7a4a12",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
          }}>
            <span>{evictionNotice}</span>
            <button className="btn" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => setEvictionNotice(null)}>Ok</button>
          </div>
        )}

        {savedSimsLoading ? (
          <div style={{ padding: "12px", fontSize: "13px", color: "var(--color-neutral-600)" }}>{t("export.loading")}</div>
        ) : savedSims.length === 0 ? (
          <div style={{ padding: "12px", fontSize: "13px", color: "var(--color-neutral-600)" }}>{t("export.no_saved_simulations_yet")}</div>
        ) : (
          <div style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--color-accent-700, #2F75B5)", color: "#fff", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>{t("export.name")}</th>
                  <th style={{ padding: "8px 10px" }}>Regime</th>
                  <th style={{ padding: "8px 10px" }}>{t("export.rock")}</th>
                  <th style={{ padding: "8px 10px" }}>{t("export.acid")}</th>
                  <th style={{ padding: "8px 10px" }}>{t("export.temperature")}</th>
                  <th style={{ padding: "8px 10px" }}>{t("export.targets")}</th>
                  <th style={{ padding: "8px 10px" }}>{t("export.saved_on")}</th>
                  <th style={{ padding: "8px 10px" }}></th>
                </tr>
              </thead>
              <tbody>
                {savedSims.map((sim, i) => (
                  <tr key={sim.id} style={{ background: i % 2 === 0 ? "#fff" : "var(--color-bg, #f7f9fb)" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                      {renamingId === sim.id ? (
                        <span style={{ display: "flex", gap: "4px" }}>
                          <input
                            className="input" style={{ fontSize: "12px", padding: "2px 6px", minHeight: "24px" }}
                            value={renameValue} autoFocus
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmRename(sim.id); if (e.key === "Escape") setRenamingId(null); }}
                          />
                          <button className="btn btn-green" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => confirmRename(sim.id)}>OK</button>
                        </span>
                      ) : sim.label}
                    </td>
                    <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{sim.flowRegime}</td>
                    <td style={{ padding: "6px 10px" }}>{sim.rock || "—"}</td>
                    <td style={{ padding: "6px 10px" }}>{sim.acid || "—"}</td>
                    <td style={{ padding: "6px 10px" }}>{fmtTemperature(sim.temperature)}</td>
                    <td style={{ padding: "6px 10px" }}>{sim.targets.length ? sim.targets.join(", ") : "—"}</td>
                    <td style={{ padding: "6px 10px", fontSize: "12px", color: "var(--color-neutral-600)" }}>
                      {new Date(sim.savedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "6px 10px", display: "flex", gap: "6px", whiteSpace: "nowrap" }}>
                      <button className="btn" style={{ fontSize: "11px", padding: "3px 8px" }} disabled={openingId === sim.id} onClick={() => handleOpenSaved(sim.id)}>
                        {openingId === sim.id ? (t("export.opening")) : (t("export.open"))}
                      </button>
                      <button className="btn" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => startRename(sim)}>{t("export.rename")}</button>
                      <button className="btn btn-red" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => handleDeleteSaved(sim.id, sim.label)}>{t("export.delete")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--color-neutral-600)", fontSize: "14px" }}>
          {t("export.no_simulations_calculated_yet_go")}{" "}
          <button className="btn-ghost" style={{ fontSize: "14px", padding: 0 }} onClick={onGoToRunner}>RUNNER</button>.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "22px" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "15px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-accent-900)" }}>
              {t("export.export_this_session")}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                {t(groups.length === 1 ? "export.select_all_one" : "export.select_all_many", { count: groups.length })}
              </label>
            </div>

            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--color-accent-900)", color: "#fff", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", width: "34px" }}></th>
                    <th style={{ padding: "8px 10px" }}>ID</th>
                    <th style={{ padding: "8px 10px" }}>Regime</th>
                    <th style={{ padding: "8px 10px" }}>{t("export.rock")}</th>
                    <th style={{ padding: "8px 10px" }}>{t("export.acid")}</th>
                    <th style={{ padding: "8px 10px" }}>{t("export.temperature")}</th>
                    <th style={{ padding: "8px 10px" }}>{t("export.targets")}</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g: SimulationGroup, i) => {
                    const isCurrent = isActiveRadialRun(g, radialState);
                    return (
                      <tr key={g.simId} style={{ background: i % 2 === 0 ? "#fff" : "var(--color-bg, #f7f9fb)", opacity: g.hasData ? 1 : 0.55 }}>
                        <td style={{ padding: "6px 10px" }}>
                          <input
                            type="checkbox"
                            checked={selected.has(g.simId)}
                            disabled={!g.hasData}
                            onChange={() => toggleOne(g.simId)}
                            title={!g.hasData ? (t("export.simulation_with_no_calculated_results")) : undefined}
                          />
                        </td>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                          {g.simId}
                          {isCurrent && (
                            <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--color-accent-700)" }} title={t("export.active_radial_run_the_only")}>{t("export.active")}</span>
                          )}
                        </td>
                        <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{g.flowRegime}</td>
                        <td style={{ padding: "6px 10px" }}>{g.rock || "—"}</td>
                        <td style={{ padding: "6px 10px" }}>{g.acid || "—"}</td>
                        <td style={{ padding: "6px 10px" }}>{fmtTemperature(g.temperature)}</td>
                        <td style={{ padding: "6px 10px" }}>{g.targets.length ? g.targets.join(", ") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px", padding: "16px", border: "1px solid var(--color-divider)", borderRadius: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-accent-900)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("export.formats")}</div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
              <input type="checkbox" checked={fmtWorkbook} onChange={(e) => setFmtWorkbook(e.target.checked)} />
              {formatLabel("workbook")} — {t("export.radial_inputs_design_sim_skin")}
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
                <input type="checkbox" checked={fmtFigures} onChange={(e) => setFmtFigures(e.target.checked)} />
                {formatLabel("figures")} — PNG 300 dpi
              </label>
              {fmtFigures && (
                <select
                  className="input" style={{ fontSize: "12px", minHeight: "26px", padding: "0 6px" }}
                  value={figureSize} onChange={(e) => setFigureSize(e.target.value as FigureSize)}
                  title={t("export.figure_size_elsevier_jpse")}
                >
                  <option value="single">{t("export.1_column_90_mm")}</option>
                  <option value="double">{t("export.2_columns_190_mm")}</option>
                </select>
              )}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
              <input type="checkbox" checked={fmtTablesOnly} onChange={(e) => setFmtTablesOnly(e.target.checked)} />
              {formatLabel("tablesOnly")} — {t("export.lighter_file")}
            </label>

            <div style={{ fontSize: "11.5px", color: "var(--color-neutral-600)", marginTop: "2px" }}>
              {t("export.linear_note", { workbook: formatLabel("workbook"), tablesOnly: formatLabel("tablesOnly") })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px", flexWrap: "wrap" }}>
            {dirSupported ? (
              <>
                <button className="btn" style={{ fontSize: "12.5px", padding: "6px 12px" }} onClick={handlePickDirectory}>
                  {dirName ? (t("export.change_folder")) : (t("export.choose_destination_folder"))}
                </button>
                <span style={{ fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
                  {dirName ? `${t("export.folder")}: ${dirName}` : (t("export.no_folder_chosen_uses_the"))}
                </span>
              </>
            ) : (
              <span style={{ fontSize: "12.5px", color: "var(--color-neutral-600)" }}>
                {t("export.your_browser_downloads_to_the")}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
            <button className="btn btn-green" style={{ fontSize: "13px", padding: "9px 20px", borderRadius: "9px" }} disabled={!canExport} onClick={handleExport}>
              {exporting ? (t("export.exporting")) : (t("export.export"))}
            </button>
            {exporting && progress.total > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "320px" }}>
                <div style={{ flex: 1, height: "8px", borderRadius: "4px", background: "var(--color-divider)", overflow: "hidden" }}>
                  <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: "100%", background: "var(--color-accent-700)", transition: "width 0.2s" }} />
                </div>
                <span style={{ fontSize: "12px", color: "var(--color-neutral-700)" }}>{progress.done}/{progress.total}</span>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "var(--color-accent-100, #eef3f8)", textAlign: "left" }}>
                    <th style={{ padding: "6px 10px" }}>{t("export.simulation")}</th>
                    <th style={{ padding: "6px 10px" }}>{t("export.format")}</th>
                    <th style={{ padding: "6px 10px" }}>{t("export.result")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={`${r.simId}-${r.format}-${i}`} style={{ borderTop: "1px solid var(--color-divider)" }}>
                      <td style={{ padding: "6px 10px" }}>{r.simId}</td>
                      <td style={{ padding: "6px 10px" }}>{formatLabel(r.format)}</td>
                      <td style={{
                        padding: "6px 10px",
                        color: r.status === "ok" ? "#2b563a" : r.status === "skipped" ? "#7a4a12" : "#8e3c33",
                        fontWeight: 600,
                      }}>
                        {r.status === "ok" ? "✓" : r.status === "skipped" ? "—" : "✗"} {r.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
