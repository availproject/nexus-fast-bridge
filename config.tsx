import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import MonadLogo from "/Monad_Logomark.svg";
import MonadLogoChain from "/Monad_Logo.svg";
import FishGIf from "/salmonad.gif";

const config = {
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
  chainIconUrl: MonadLogo,
  chainLogoUrl: MonadLogoChain,
  chainGifUrl: FishGIf,
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
