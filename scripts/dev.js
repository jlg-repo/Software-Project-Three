import { spawn } from "child_process";
import { resolve } from "path";

const preloadPath = resolve("scripts/rollup-wasm.cjs");
const nodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
process.env.NODE_OPTIONS = `${nodeOptions}--require=${preloadPath}`;
const npmCliPath = process.env.npm_execpath;

function start(command, args) {
  return spawn(command, args, {
    stdio: "inherit"
  });
}

function startNpm(scriptName) {
  if (npmCliPath) {
    return start(process.execPath, [npmCliPath, "run", scriptName]);
  }

  return start("npm", ["run", scriptName]);
}

const server = startNpm("dev:server");
const client = startNpm("dev:client");

const children = [server, client];

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (signal || (typeof code === "number" && code !== 0)) {
      shutdown(typeof code === "number" ? code : 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
