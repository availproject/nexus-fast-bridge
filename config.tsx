import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";

const config = {
  projectId: "5ccff0b96382c3591b17a986fc9b4b11",
  chainId: 143,
  chainName: "Monad",
  chainNativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  chainRpcUrl: "https://rpcs.avail.so/monad",
  chainBlockExplorerUrl: "https://monadvision.com/",
  chainTestnet: false,
  useChainLogo: false,
  chainIconUrl: "/Monad_Logomark.svg",
  chainLogoUrl: "/Monad_Logo.svg",
  chainGifUrl: "/salmonad.gif",
  chainGifAlt: "Fast Salmonad",
  heroText: "Move your assets to Monad faster than ever!",

  appTitle: "Monad Fast Bridge",
  appDescription: "Monad Fast Bridge",

  primaryColor: "#836ef9",
  secondaryColor: "#ffffff",
  nexusNetwork: "mainnet",
  nexusSupportedChain: SUPPORTED_CHAINS.MONAD,
  nexusPrimaryToken: "USDC",
};

export default config;
