import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships native bindings + WASM loaded via Node fs at runtime;
  // bundling it via Turbopack mangles those paths (URL vs string). Keeping it
  // external means Node `require`s it normally on the server.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
