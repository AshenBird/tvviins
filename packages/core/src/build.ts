import { argv, cwd } from "node:process";
import { Tvvins } from "./type"
import path, { join, normalize, relative, resolve, sep } from "node:path";
import { build as esbuild } from "esbuild";
import { emptyDirSync, ensureDirSync, ensureFileSync } from "fs-extra";
import { build as viteBuild } from "vite"
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Logger } from "@mcswift/base-utils";
export const build = async (options: Tvvins.ResolvedInitOptions) => {
  const [nodePath, entryPath] = argv
  const base = cwd();
  const { build: buildOption } = options
  const { output, plugins } = buildOption
  const outdir = resolve(base, output);
  // const sourcePath = resolve(base, source);
  ensureDirSync(outdir);
  emptyDirSync(outdir);
  // 视图层构建
  await viteBuild(options.vite)
  Logger.info("client build finish")
  // 服务端构建
  await esbuild({
    entryPoints: [entryPath],
    target: "node20",
    platform: "node",
    outdir: `${outdir}/server`,
    format: "esm",
    packages: "external",
    bundle: true,
    outExtension: {
      ".js": ".mjs",
    },
    plugins: [
      ...plugins
    ],
  });
  Logger.info("server build finish")
  const dependencies = JSON.parse(readFileSync(resolve(cwd(), "./package.json"), { encoding: "utf-8" })).dependencies
  const postInstallPath = "./scripts/post-install.mjs"
  const targetPackage = {
    dependencies: {
      ...dependencies,
      "cross-env": "7.0.3"
    },
    devDependencies: {
      "fs-extra": "^11.2.0",
    },
    scripts: {
      "start": `cross-env TVVINS_STAGE=production TVVINS_MODE=server  node server/${entryPath.split(sep).pop()?.replace(".ts", ".mjs")}`,
      "postinstall": `node ${postInstallPath}`
    },
    private: true
  }
  const packagePath = resolve(outdir, "./package.json")
  ensureFileSync(packagePath)
  writeFileSync(packagePath, JSON.stringify(targetPackage, undefined, 2), { encoding: "utf-8" })
  Logger.info("production package.json has init")
  // post install
  ensureFileSync(resolve(outdir,postInstallPath))
  const idStorePathSource = normalize(join(cwd(), "node_modules/@tvvins/rpc/idStore.json")).replaceAll('\\', '\\\\')
  const idStorePathTarget = normalize(join(outdir, "node_modules/@tvvins/rpc/idStore.json")).replaceAll('\\', '\\\\')

  writeFileSync(resolve(outdir,postInstallPath),
    `
      import { ensureFileSync } from "fs-extra";
      import { copyFileSync, existsSync } from "node:fs";
      if(existsSync('${idStorePathSource}')){
        ensureFileSync(\`${idStorePathTarget}\`);
        copyFileSync(\`${idStorePathSource}\`,\`${idStorePathTarget}\`);
      }
    `,
    { encoding: "utf-8" }
  )
}