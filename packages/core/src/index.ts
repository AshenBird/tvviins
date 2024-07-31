import { env } from "node:process";
import { App } from "./App";
import { resolveOptions } from "./options";
import { Tvvins } from "./type";
export * from "./type";
export type { Context } from "./Context";
export * from "./Middleware";
export const useTvvins = (options: Tvvins.InitOptions) => {
  const mode = env["TVVINS_MODE"] as Tvvins.Mode
  const stage = env["TVVINS_STAGE"] as Tvvins.Stage
  if(mode === "server"){
    const app = new App();
    resolveOptions(options,mode).then((resolved)=>{
      app.start(resolved)
    })
    return app;
  }
  const buildCtrl = async ()=>{
    const resolved =await resolveOptions(options,mode)
    const { build } = await import("./build")
    build(resolved)
  }
  buildCtrl()
};
