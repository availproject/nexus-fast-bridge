import chainList from "../../../chains.config.json";

export interface ChainConfig {
  appDir: string;
  basePath: string;
  description?: string;
  iconUrl?: string;
  logoUrl?: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  slug: string;
}

export const chains = chainList as ChainConfig[];
