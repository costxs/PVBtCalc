import type { Curve } from "../redux/storageresults/slice";
import { requestFailed } from "./exportText";
import { saveBlob } from "./directoryExport";
import { API_BASE } from "../services/api";
import { buildLinearExportPayload } from "./linearExport";
import type { ServerExportResult } from "./exportRadialServer";

export async function exportLinearWorkbookServer(
  curves: Curve[],
  token: string,
  opts: { includeImages?: boolean; directoryHandle?: FileSystemDirectoryHandle | null } = {}
): Promise<ServerExportResult> {
  const includeImages = opts.includeImages !== false;
  const res = await fetch(`${API_BASE}/export/linear?include_images=${includeImages}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildLinearExportPayload(curves)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(requestFailed("/export/linear", res.status, detail));
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(cd);
  const fallbackName = `PVBtCalc_Linear${includeImages ? "" : "_TablesOnly"}.xlsx`;
  return saveBlob(opts.directoryHandle ?? null, match ? match[1] : fallbackName, blob);
}
