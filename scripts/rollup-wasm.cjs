const Module = require("module");

const originalLoad = Module._load;
const originalResolveFilename = Module._resolveFilename;

function shouldRedirect(request) {
  return request === "rollup" || request.startsWith("rollup/");
}

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (shouldRedirect(request)) {
    return originalResolveFilename.call(this, "@rollup/wasm-node", parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function patchedLoad(request, parent, isMain) {
  if (shouldRedirect(request)) {
    return originalLoad.call(this, "@rollup/wasm-node", parent, isMain);
  }

  return originalLoad.call(this, request, parent, isMain);
};
