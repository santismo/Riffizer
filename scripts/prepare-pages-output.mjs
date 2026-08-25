import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist", "client");
const rawBasePath = process.env.RIFFIZER_BASE_PATH ?? "/Riffizer";
const basePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

for (const file of fs.readdirSync(output).filter((name) => name.endsWith(".html"))) {
  const target = path.join(output, file);
  const html = fs.readFileSync(target, "utf8");
  // Vinext's static exporter currently emits root-relative client assets even
  // when an asset prefix is supplied. Pages is normally served under /Riffizer,
  // so scope those static URLs after export while leaving the hosted Site path
  // untouched.
  fs.writeFileSync(target, html.replaceAll("/assets/", `${basePath}/assets/`));
}
