// Lists user-facing literals outside src/i18n. Usage: node scripts/stray-literals.mjs [--json]
import fs from "node:fs";
import path from "node:path";
import { scanAll } from "../src/i18n/strayLiterals.ts";

const root = path.resolve("src");
const files = {};
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files["/" + path.relative(root, p).split(path.sep).join("/")] = fs.readFileSync(p, "utf8");
  }
})(root);

const v = scanAll(files);
if (process.argv.includes("--json")) console.log(JSON.stringify(v, null, 1));
else {
  const by = {};
  for (const x of v) (by[x.file] ??= []).push(x);
  for (const [f, xs] of Object.entries(by)) {
    console.log(`${f}  (${xs.length})`);
    for (const x of xs) console.log(`  ${x.line}\t[${x.kind}] ${x.text.slice(0, 110)}`);
  }
  console.log(`\nTOTAL ${v.length} violations in ${Object.keys(by).length} files`);
}
