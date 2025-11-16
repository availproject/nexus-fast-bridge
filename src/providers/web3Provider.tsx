"use client";
import { createConfig, WagmiProvider } from "wagmi";
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  monadTestnet,
  type Chain,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import config from "../../config";

const monadTestnetChain = {
  ...monadTestnet,
  logo: <img src={config.chainIconUrl} alt={config.chainName} />,
} as unknown as Chain;

const validiumTestnet: Chain = {
  id: 567,
  name: "Validium Testnet",
  nativeCurrency: {
    name: "Validium",
    symbol: "VLDM",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://testnet.l2.rpc.validium.network"] },
  },
  blockExplorers: {
    default: {
      name: "Validium Explorer",
      url: "https://testnet.explorer.validium.network",
    },
  },
  testnet: config.chainTestnet,
  iconUrl: "/validium_logo.svg",
};

const wagmiConfig = getDefaultConfig({
  appName: "Nexus Elements",
  projectId: config.projectId,
  chains: [
    mainnet,
    base,
    sophon,
    kaia,
    arbitrum,
    avalanche,
    optimism,
    polygon,
    scroll,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    polygonAmoy,
    monadTestnet,
    validiumTestnet,
  ],
});

const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
