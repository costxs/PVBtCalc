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
import { hasDirectoryPickerSupport, pickDirectory, getOrCreateSubdirectory } from "../tools/directoryExport";
import {
  listSnapshotSummaries, getSnapshot, deleteSnapshot, deleteAllSnapshots, renameSnapshot,
  SIMULATION_EVICTED_EVENT, type SimulationsEvictedDetail,
} from "../tools/simulationStoreIO";
import type { SimulationSnapshotSummary } from "../tools/simulationSnapshot";
import { openSnapshotIntoRedux } from "../tools/simulationRestore";

/**
 * ExportTab.tsx
 * ------------------------------------------------------------------
 * Aba dedicada de export (sidebar "Export"). Antes, Chart.tsx tinha 4
 * controles de export competindo com os de visualizacao do grafico
 * (Exportar tudo / figuras PNG / seletor 1-2 colunas, alem do "Export Chart
 * Data" que ficou). Esta aba absorve os 3 que saíram + adiciona escolha de
 * MULTIPLAS simulacoes e pasta de destino (File System Access API).
 *
 * Design/Skin (design_series/skin_series) so existem em memoria para a
 * rodada radial ATIVA (radialState nao guarda um mapa por simulacao) --
 * isActiveRadialRun decide isso; simulacoes antigas ainda exportam a aba
 * Simulation completa (reconstruida de resultCurves, ver exportSimulations.ts),
 * so ficam sem Design/Skin. Regime linear nao tem geracao de figuras no
 * backend -- so o formato "Somente tabelas" se aplica (reusa
 * exportCurveAsVerticalTable, ja existente).
 */

type FormatKey = "workbook" | "figures" | "tablesOnly";

interface ExportResultRow {
  simId: string;
  format: FormatKey;
  status: "ok" | "error" | "skipped";
  detail: string;
}

const FORMAT_LABELS: Record<"pt" | "en", Record<FormatKey, string>> = {
  pt: {
    workbook: "Planilha completa (.xlsx)",
    figures: "Pacote de figuras (.zip)",
    tablesOnly: "Somente tabelas (.xlsx, sem imagens)",
  },
  en: {
    workbook: "Full workbook (.xlsx)",
    figures: "Figure package (.zip)",
    tablesOnly: "Tables only (.xlsx, no images)",
  },
};

function fmtTemperature(temp: number | null): string {
  if (temp == null || !Number.isFinite(temp)) return "—";
  const k = temp >= 100 ? temp : temp + 273.15;
  const c = temp >= 100 ? temp - 273.15 : temp;
  return `${c.toFixed(1)} °C (${k.toFixed(1)} K)`;
}

interface ExportTabProps {
  onGoToRunner: () => void;
}

export default function ExportTab({ onGoToRunner }: ExportTabProps) {
  const dispatch = useDispatch();
  const { curves } = useSelector((state: RootState) => state.resultCurves);
  const radialState = useSelector((state: RootState) => state.radial);
  const userToken = useSelector((state: RootState) => state.user.token);
  const language = useSelector((state: RootState) => state.ui.language);
  const isPt = language === "pt";
  const FORMAT_LABELS_LANG = FORMAT_LABELS[language];

  // --- Simulações salvas (cache persistente, IndexedDB) -------------------
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
        isPt
          ? `Limite de espaço do cache atingido — removida${plural ? "s" : ""} `
            + `a${plural ? "s" : ""} simulação${plural ? "ões" : ""} `
            + `mais antiga${plural ? "s" : ""}: ${detail.evictedLabels.join(", ")}.`
          : `Cache storage limit reached — removed the oldest ${plural ? "simulations" : "simulation"}: ${detail.evictedLabels.join(", ")}.`
      );
      reloadSavedSims();
    };
    window.addEventListener(SIMULATION_EVICTED_EVENT, onEvicted);
    return () => window.removeEventListener(SIMULATION_EVICTED_EVENT, onEvicted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPt]);

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
    const msg = isPt
      ? `Excluir a simulação salva "${label}"? Essa ação não pode ser desfeita.`
      : `Delete the saved simulation "${label}"? This action cannot be undone.`;
    if (!window.confirm(msg)) return;
    await deleteSnapshot(id);
    await reloadSavedSims();
  };

  const handleDeleteAllSaved = async () => {
    if (savedSims.length === 0) return;
    const msg = isPt
      ? `Excluir TODAS as ${savedSims.length} simulações salvas? Essa ação não pode ser desfeita.`
      : `Delete ALL ${savedSims.length} saved simulations? This action cannot be undone.`;
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
      setDirName((handle as any).name ?? (isPt ? "pasta selecionada" : "selected folder"));
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
    const total = selGroups.length * formats.length;
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

    const downloadedDetail = (savedAs: string) => isPt ? `Baixado (${savedAs})` : `Downloaded (${savedAs})`;
    const savedToFolderDetail = (savedAs: string) => isPt ? `Salvo na pasta (${savedAs})` : `Saved to folder (${savedAs})`;

    const rows: ExportResultRow[] = [];
    for (const g of selGroups) {
      if (!g.hasData) {
        const detail = isPt ? "Simulação sem resultados calculados" : "Simulation with no calculated results";
        for (const f of formats) rows.push({ simId: g.simId, format: f, status: "error", detail });
        done += formats.length;
        setProgress({ done, total });
        continue;
      }

      for (const f of formats) {
        try {
          if (g.flowRegime === "linear") {
            if (f !== "tablesOnly") {
              rows.push({ simId: g.simId, format: f, status: "skipped", detail: isPt ? "Não disponível para regime linear (sem figuras no servidor)" : "Not available for linear regime (no figures on the server)" });
            } else {
              g.curves.forEach((c) => exportCurveAsVerticalTable(c));
              const n = g.curves.length;
              rows.push({ simId: g.simId, format: f, status: "ok", detail: isPt ? `Baixado (${n} arquivo${n > 1 ? "s" : ""})` : `Downloaded (${n} file${n > 1 ? "s" : ""})` });
            }
          } else {
            const payload = buildGroupExportPayload(g, radialState);
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
          }
        } catch (err) {
          rows.push({ simId: g.simId, format: f, status: "error", detail: err instanceof Error ? err.message : String(err) });
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
        <h2 style={{ margin: 0, fontSize: "24px", letterSpacing: "0.05em", color: "var(--color-accent-900)" }}>Export</h2>
        <span style={{ flex: 1, height: "1px", background: "var(--color-divider)" }}></span>
      </div>

      {/* Simulações salvas (cache persistente) -- sobrevive a reload/fechar
          o navegador, até o usuário excluir. Distinta da lista "desta
          sessão" abaixo, que reflete só o que está na memória agora. */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "15px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-accent-900)" }}>
            {isPt ? "Simulações Salvas" : "Saved Simulations"}
          </h3>
          <span style={{ fontSize: "12px", color: "var(--color-neutral-600)" }}>{isPt ? "(cache local — sobrevive a recarregar a página)" : "(local cache — survives page reload)"}</span>
          <span style={{ flex: 1 }} />
          {savedSims.length > 0 && (
            <button className="btn btn-red" style={{ fontSize: "11.5px", padding: "4px 10px" }} onClick={handleDeleteAllSaved}>
              {isPt ? "Excluir todas" : "Delete all"}
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
          <div style={{ padding: "12px", fontSize: "13px", color: "var(--color-neutral-600)" }}>{isPt ? "Carregando…" : "Loading…"}</div>
        ) : savedSims.length === 0 ? (
          <div style={{ padding: "12px", fontSize: "13px", color: "var(--color-neutral-600)" }}>{isPt ? "Nenhuma simulação salva ainda." : "No saved simulations yet."}</div>
        ) : (
          <div style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--color-accent-700, #2F75B5)", color: "#fff", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>{isPt ? "Nome" : "Name"}</th>
                  <th style={{ padding: "8px 10px" }}>Regime</th>
                  <th style={{ padding: "8px 10px" }}>{isPt ? "Rocha" : "Rock"}</th>
                  <th style={{ padding: "8px 10px" }}>{isPt ? "Ácido" : "Acid"}</th>
                  <th style={{ padding: "8px 10px" }}>{isPt ? "Temperatura" : "Temperature"}</th>
                  <th style={{ padding: "8px 10px" }}>{isPt ? "Alvos" : "Targets"}</th>
                  <th style={{ padding: "8px 10px" }}>{isPt ? "Salvo em" : "Saved on"}</th>
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
                        {openingId === sim.id ? (isPt ? "Abrindo…" : "Opening…") : (isPt ? "Abrir" : "Open")}
                      </button>
                      <button className="btn" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => startRename(sim)}>{isPt ? "Renomear" : "Rename"}</button>
                      <button className="btn btn-red" style={{ fontSize: "11px", padding: "3px 8px" }} onClick={() => handleDeleteSaved(sim.id, sim.label)}>{isPt ? "Excluir" : "Delete"}</button>
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
          {isPt ? "Nenhuma simulação calculada ainda — vá para" : "No simulations calculated yet — go to"}{" "}
          <button className="btn-ghost" style={{ fontSize: "14px", padding: 0 }} onClick={onGoToRunner}>RUNNER</button>.
        </div>
      ) : (
        <>
          {/* Lista de simulações desta sessão (memória) -- exportar direto,
              sem precisar abrir de volta do cache persistente acima. */}
          <div style={{ marginBottom: "22px" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "15px", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-accent-900)" }}>
              {isPt ? "Exportar (desta sessão)" : "Export (this session)"}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                {isPt
                  ? `Selecionar tudo (${groups.length} simulaç${groups.length === 1 ? "ão" : "ões"})`
                  : `Select all (${groups.length} simulation${groups.length === 1 ? "" : "s"})`}
              </label>
            </div>

            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--color-accent-900)", color: "#fff", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", width: "34px" }}></th>
                    <th style={{ padding: "8px 10px" }}>ID</th>
                    <th style={{ padding: "8px 10px" }}>Regime</th>
                    <th style={{ padding: "8px 10px" }}>{isPt ? "Rocha" : "Rock"}</th>
                    <th style={{ padding: "8px 10px" }}>{isPt ? "Ácido" : "Acid"}</th>
                    <th style={{ padding: "8px 10px" }}>{isPt ? "Temperatura" : "Temperature"}</th>
                    <th style={{ padding: "8px 10px" }}>{isPt ? "Alvos" : "Targets"}</th>
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
                            title={!g.hasData ? (isPt ? "Simulação sem resultados calculados" : "Simulation with no calculated results") : undefined}
                          />
                        </td>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                          {g.simId}
                          {isCurrent && (
                            <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", color: "var(--color-accent-700)" }} title={isPt ? "Rodada radial ativa -- unica com Design/Skin disponíveis para export" : "Active radial run -- the only one with Design/Skin available for export"}>{isPt ? "ATIVA" : "ACTIVE"}</span>
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

          {/* Blocos de opções */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "22px", padding: "16px", border: "1px solid var(--color-divider)", borderRadius: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-accent-900)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{isPt ? "Formatos" : "Formats"}</div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
              <input type="checkbox" checked={fmtWorkbook} onChange={(e) => setFmtWorkbook(e.target.checked)} />
              {FORMAT_LABELS_LANG.workbook} — {isPt ? "abas Inputs, Design, Sim, Skin, Resumo gráficos, com figuras embutidas" : "Inputs, Design, Sim, Skin, Chart Summary sheets, with embedded figures"}
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
                <input type="checkbox" checked={fmtFigures} onChange={(e) => setFmtFigures(e.target.checked)} />
                {FORMAT_LABELS_LANG.figures} — PNG 300 dpi
              </label>
              {fmtFigures && (
                <select
                  className="input" style={{ fontSize: "12px", minHeight: "26px", padding: "0 6px" }}
                  value={figureSize} onChange={(e) => setFigureSize(e.target.value as FigureSize)}
                  title={isPt ? "Tamanho da figura (Elsevier/JPSE)" : "Figure size (Elsevier/JPSE)"}
                >
                  <option value="single">{isPt ? "1 coluna (90 mm)" : "1 column (90 mm)"}</option>
                  <option value="double">{isPt ? "2 colunas (190 mm)" : "2 columns (190 mm)"}</option>
                </select>
              )}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
              <input type="checkbox" checked={fmtTablesOnly} onChange={(e) => setFmtTablesOnly(e.target.checked)} />
              {FORMAT_LABELS_LANG.tablesOnly} — {isPt ? "arquivo mais leve" : "lighter file"}
            </label>

            <div style={{ fontSize: "11.5px", color: "var(--color-neutral-600)", marginTop: "2px" }}>
              {isPt
                ? <>Regime linear: apenas "{FORMAT_LABELS_LANG.tablesOnly}" está disponível (sem figuras no servidor).
                  Simulações radiais que não são a rodada ativa exportam sem as abas Design/Skin (dados só ficam em memória durante a rodada em curso).</>
                : <>Linear regime: only "{FORMAT_LABELS_LANG.tablesOnly}" is available (no figures on the server).
                  Radial simulations other than the active run export without the Design/Skin sheets (data only stays in memory during the current run).</>}
            </div>
          </div>

          {/* Pasta de destino */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px", flexWrap: "wrap" }}>
            {dirSupported ? (
              <>
                <button className="btn" style={{ fontSize: "12.5px", padding: "6px 12px" }} onClick={handlePickDirectory}>
                  {dirName ? (isPt ? "Alterar pasta" : "Change folder") : (isPt ? "Escolher pasta de destino" : "Choose destination folder")}
                </button>
                <span style={{ fontSize: "12.5px", color: "var(--color-neutral-700)" }}>
                  {dirName ? `${isPt ? "Pasta" : "Folder"}: ${dirName}` : (isPt ? "Nenhuma pasta escolhida — usa o download padrão do navegador" : "No folder chosen — uses the browser's default download")}
                </span>
              </>
            ) : (
              <span style={{ fontSize: "12.5px", color: "var(--color-neutral-600)" }}>
                {isPt ? "Seu navegador baixa para a pasta de downloads (escolha de pasta exige Chrome ou Edge)." : "Your browser downloads to the downloads folder (choosing a folder requires Chrome or Edge)."}
              </span>
            )}
          </div>

          {/* Exportar */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
            <button className="btn btn-green" style={{ fontSize: "13px", padding: "9px 20px", borderRadius: "9px" }} disabled={!canExport} onClick={handleExport}>
              {exporting ? (isPt ? "Exportando…" : "Exporting…") : (isPt ? "Exportar" : "Export")}
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

          {/* Resultado por item */}
          {results.length > 0 && (
            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                <thead>
                  <tr style={{ background: "var(--color-accent-100, #eef3f8)", textAlign: "left" }}>
                    <th style={{ padding: "6px 10px" }}>{isPt ? "Simulação" : "Simulation"}</th>
                    <th style={{ padding: "6px 10px" }}>{isPt ? "Formato" : "Format"}</th>
                    <th style={{ padding: "6px 10px" }}>{isPt ? "Resultado" : "Result"}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={`${r.simId}-${r.format}-${i}`} style={{ borderTop: "1px solid var(--color-divider)" }}>
                      <td style={{ padding: "6px 10px" }}>{r.simId}</td>
                      <td style={{ padding: "6px 10px" }}>{FORMAT_LABELS_LANG[r.format]}</td>
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
