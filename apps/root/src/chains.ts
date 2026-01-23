export interface ChainConfig {
  slug: string;
  name: string;
  description?: string;
  primaryColor?: string;
  basePath: string;
  appDir: string;
}

import chainList from "../../chains.config.json" assert { type: "json" };

export const chains = chainList as ChainConfig[];
