import { saveAs } from "file-saver";

export function hasDirectoryPickerSupport(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasDirectoryPickerSupport()) return null;
  try {
    // @ts-expect-error -- showDirectoryPicker ainda nao esta no lib.dom.d.ts padrao do TS
    return await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (err: any) {
    if (err?.name === "AbortError") return null;
    throw err;
  }
}

async function verifyPermission(handle: FileSystemDirectoryHandle, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  const anyHandle = handle as any;
  const opts = { mode };
  if ((await anyHandle.queryPermission?.(opts)) === "granted") return true;
  if ((await anyHandle.requestPermission?.(opts)) === "granted") return true;
  return false;
}

async function uniqueNameInDirectory(dir: FileSystemDirectoryHandle, filename: string): Promise<string> {
  const dotIdx = filename.lastIndexOf(".");
  const stem = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  const ext = dotIdx > 0 ? filename.slice(dotIdx) : "";

  let candidate = filename;
  let n = 2;
  while (true) {
    try {
      await dir.getFileHandle(candidate, { create: false });
      candidate = `${stem} (${n})${ext}`;
      n++;
    } catch {
      return candidate;
    }
  }
}

export async function getOrCreateSubdirectory(dir: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  const sanitized = name.replace(/[\\/:*?"<>|]/g, "_").trim() || "export";
  return dir.getDirectoryHandle(sanitized, { create: true });
}

export async function saveBlob(
  dir: FileSystemDirectoryHandle | null,
  filename: string,
  blob: Blob
): Promise<{ savedAs: string; usedFallback: boolean }> {
  if (dir) {
    try {
      const ok = await verifyPermission(dir, "readwrite");
      if (ok) {
        const finalName = await uniqueNameInDirectory(dir, filename);
        const fileHandle = await dir.getFileHandle(finalName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { savedAs: finalName, usedFallback: false };
      }
    } catch (err) {
      console.warn("[directoryExport] gravação na pasta escolhida falhou, usando download normal", err);
    }
  }
  saveAs(blob, filename);
  return { savedAs: filename, usedFallback: true };
}
