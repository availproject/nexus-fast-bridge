import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";

const config = {
  projectId: "5ccff0b96382c3591b17a986fc9b4b11",
  chainId: 10143,
  chainName: "Monad Testnet",
  chainNativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  chainRpcUrl: "https://testnet-rpc.monad.xyz",
  chainBlockExplorerUrl: "https://testnet.monadexplorer.com/",
  chainTestnet: false,
  useChainLogo: true,
  chainIconUrl: "/Monad_Logomark.svg",
  chainLogoUrl: "/Monad_Logo.svg",
  chainGifUrl: "/salmonad.gif",
  chainGifAlt: "Fast Salmonad",
  heroText: "Move your assets to Monad faster than ever!",

  appTitle: "Monad Fast Bridge",
  appDescription: "Monad Fast Bridge",

  primaryColor: "#836ef9",
  secondaryColor: "#ffffff",
  nexusNetwork: "testnet",
  nexusSupportedChain: SUPPORTED_CHAINS.MONAD_TESTNET,
  nexusPrimaryToken: "USDC",
};

export default config;
