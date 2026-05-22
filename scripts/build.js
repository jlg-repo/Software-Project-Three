import { spawn } from "child_process";
import { resolve } from "path";

const preloadPath = resolve("scripts/rollup-wasm.cjs");
const nodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
process.env.NODE_OPTIONS = `${nodeOptions}--require=${preloadPath}`;
const npmCliPath = process.env.npm_execpath;

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        rejectPromise(new Error(`Build step exited with signal ${signal}`));
        return;
      }

      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`Build step exited with code ${code}`));
    });
  });
}

function runNpm(scriptName) {
  if (npmCliPath) {
    return run(process.execPath, [npmCliPath, "run", scriptName]);
  }

  return run("npm", ["run", scriptName]);
}

try {
  await runNpm("build:tsc");
  await runNpm("build:client");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
