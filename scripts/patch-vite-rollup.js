import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const files = [
  join(process.cwd(), "node_modules/vite/dist/node/index.js"),
  join(process.cwd(), "node_modules/vite/dist/node/chunks/config.js"),
];

for (const file of files) {
  if (!existsSync(file)) {
    continue;
  }

  const original = readFileSync(file, "utf8");
  const updated = original
    .replaceAll("rollup/parseAst", "@rollup/wasm-node/parseAst")
    .replaceAll('import("rollup")', 'import("@rollup/wasm-node")');

  if (updated !== original) {
    writeFileSync(file, updated);
  }
}
