import type { NextConfig } from "next";

const staticExport = process.env.RIFFIZER_STATIC_EXPORT === "1";
const configuredBasePath = process.env.RIFFIZER_BASE_PATH ?? "/Riffizer";
const basePath = configuredBasePath === "/" ? "" : configuredBasePath.replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Sites keeps using the Cloudflare/Vinext build. GitHub Pages sets this flag
  // to produce a purely static mirror under the repository's Pages base path.
  ...(staticExport ? { output: "export", trailingSlash: true, assetPrefix: basePath } : {}),
};

export default nextConfig;
