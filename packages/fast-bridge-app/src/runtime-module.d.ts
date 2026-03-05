declare module "@fastbridge/runtime" {
  import type { AppConfig, ChainFeatures } from "./types/runtime";

  export const appConfig: AppConfig;
  export const chainFeatures: ChainFeatures;
}
