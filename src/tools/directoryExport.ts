/**
 * directoryExport.ts
 * ------------------------------------------------------------------
 * File System Access API (window.showDirectoryPicker) -- disponivel no
 * Chrome/Edge, ausente no Firefox/Safari. Guarda o FileSystemDirectoryHandle
 * em memoria (nao persiste entre reloads -- a API nao expõe isso sem IndexedDB,
 * fora de escopo aqui) e grava arquivos nele; se a permissao expirar ou o
 * navegador nao suportar, cai para o download normal (file-saver / saveAs).
 */
import { saveAs } from "file-saver";

export function hasDirectoryPickerSupport(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Abre o seletor de pastas do sistema. Retorna null se o usuario cancelar. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasDirectoryPickerSupport()) return null;
  try {
    // @ts-expect-error -- showDirectoryPicker ainda nao esta no lib.dom.d.ts padrao do TS
    return await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (err: any) {
    if (err?.name === "AbortError") return null; // usuario cancelou o seletor
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

/** Garante nome unico dentro do diretorio: "foo.xlsx" -> "foo (2).xlsx" se ja existir. */
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
      return candidate; // getFileHandle rejeitou -> nome livre (NotFoundError)
    }
  }
}

export async function getOrCreateSubdirectory(dir: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  const sanitized = name.replace(/[\\/:*?"<>|]/g, "_").trim() || "export";
  return dir.getDirectoryHandle(sanitized, { create: true });
}

/**
 * Grava `blob` como `filename` dentro de `dir` (deduplicando o nome se ja
 * existir). Se `dir` for null, sem permissao ou sem suporte, cai pro
 * download padrao do navegador (saveAs). Devolve o nome final usado e se
 * caiu no fallback (pra UI poder avisar).
 */
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
      // handle invalido/permissao negada em runtime -- cai pro download normal
      console.warn("[directoryExport] gravação na pasta escolhida falhou, usando download normal", err);
    }
  }
  saveAs(blob, filename);
  return { savedAs: filename, usedFallback: true };
}
