export interface ChainConfig {
  slug: string;
  name: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  basePath: string;
  appDir: string;
  logoUrl?: string;
  iconUrl?: string;
}

import chainList from "../../../chains.config.json" assert { type: "json" };

export const chains = chainList as ChainConfig[];
