
import { execSync } from "node:child_process";
import { globby } from "globby";
import fs from "fs-extra";

const out = "dist";
await fs.emptyDir(out);

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const buildHTML = async () => {
  const files = await globby(["**/*.html","!dist/**","!node_modules/**"]);
  for (const f of files) {
    const target = `${out}/${f}`;
    await fs.ensureDir(target.replace(/\/[^/]+$/, ""));
    run(`npx html-minifier-terser --collapse-whitespace --remove-comments --remove-attribute-quotes ${f} -o ${target}`);
  }
};
const buildCSS = async () => {
  const files = await globby(["**/*.css","!dist/**","!node_modules/**"]);
  for (const f of files) {
    const target = `${out}/${f}`;
    await fs.ensureDir(target.replace(/\/[^/]+$/, ""));
    run(`npx cleancss -O2 ${f} -o ${target}`);
  }
};
const buildJS = async () => {
  const files = await globby(["**/*.js","!dist/**","!node_modules/**"]);
  for (const f of files) {
    const target = `${out}/${f}`;
    await fs.ensureDir(target.replace(/\/[^/]+$/, ""));
    run(`npx esbuild ${f} --bundle --minify --sourcemap --outfile=${target}`);
  }
};

const mode = process.argv[2] || "all";
if (mode === "html") await buildHTML();
if (mode === "css") await buildCSS();
if (mode === "js") await buildJS();
if (mode === "all") { await buildHTML(); await buildCSS(); await buildJS(); }
console.log("✅ Build done → dist/");
