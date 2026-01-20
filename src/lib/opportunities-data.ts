import type { Opportunity } from "./types/opportunity";

// Sample opportunities data - this would typically come from an API
// Note: APY values are indicative and may change. These are third-party platforms.
export const sampleOpportunities: Opportunity[] = [
    {
        id: "aave-eth-usdt-supply",
        tags: ["Aave", "Ethereum", "USDT"],
        title: "Ethereum's Deepest Lending Pool",
        description:
            "Earn 4.64% APY by supplying USDT on Aave. Access Aave directly, deposit once, earn continuously.",
        proceedText: "Participate Now",
        apy: "4.64%",
        requiresCA: true,
        features: [],
        display: [],
        logic: {
            inputs: [
                {
                    type: "number",
                    label: "Amount",
                    range: true,
                    max: "unifiedBalance",
                    suffix: {
                        icon: "https://etherscan.io/token/images/tethernew_32.svg",
                        text: "USDT",
                    },
                },
            ],
            tokens: {
                source: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://etherscan.io/token/images/tethernew_32.svg",
                    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                    chain: {
                        universe: "tron",
                        id: 728126428,
                        network: "mainnet",
                    },
                },
                destination: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://etherscan.io/token/images/tethernew_32.svg",
                    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    chain: {
                        universe: "evm",
                        id: 1,
                        network: "ethereum",
                    },
                },
            },
            logics: [],
        },
    },
    {
        id: "aave-op-usdt-supply",
        tags: ["Aave", "Optimism", "USDT"],
        title: "Frictionless Lending on Optimism",
        description:
            "Supply USDT on Aave (Optimism) and earn yield. Tap in, deposit, and let your assets work.",
        proceedText: "Participate Now",
        apy: "5.21%",
        requiresCA: true,
        features: [],
        display: [],
        logic: {
            inputs: [
                {
                    type: "number",
                    label: "Amount",
                    range: true,
                    max: "unifiedBalance",
                    suffix: {
                        icon: "https://optimistic.etherscan.io/token/images/bridgedusdt2_ofc_64.png",
                        text: "USDT",
                    },
                },
            ],
            tokens: {
                source: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://optimistic.etherscan.io/token/images/bridgedusdt2_ofc_64.png",
                    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                    chain: {
                        universe: "tron",
                        id: 728126428,
                        network: "mainnet",
                    },
                },
                destination: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://optimistic.etherscan.io/token/images/bridgedusdt2_ofc_64.png",
                    address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
                    chain: {
                        universe: "evm",
                        id: 10,
                        network: "optimism",
                    },
                },
            },
            logics: [],
        },
    },
    {
        id: "fluid-eth-usdt-deposit",
        tags: ["Fluid", "Ethereum", "USDT"],
        title: "Earn Yield Plus FLUID, Automatically",
        description: "Earn 6.64% APR on USDT through Fluid on Ethereum.",
        proceedText: "Participate Now",
        apy: "6.64%",
        requiresCA: true,
        features: [],
        display: [],
        logic: {
            inputs: [
                {
                    type: "number",
                    label: "Amount",
                    range: true,
                    max: "unifiedBalance",
                    suffix: {
                        icon: "https://etherscan.io/token/images/tethernew_32.svg",
                        text: "USDT",
                    },
                },
            ],
            tokens: {
                source: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://etherscan.io/token/images/tethernew_32.svg",
                    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                    chain: {
                        universe: "tron",
                        id: 728126428,
                        network: "mainnet",
                    },
                },
                destination: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://etherscan.io/token/images/tethernew_32.svg",
                    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    chain: {
                        universe: "evm",
                        id: 1,
                        network: "ethereum",
                    },
                },
            },
            logics: [],
        },
    },
    {
        id: "fluid-arb-usdt-deposit",
        tags: ["Fluid", "Arbitrum", "USDT"],
        title: "Multiple Rewards, One Tap",
        description: "Earn 7.33% APR on USDT with Fluid on Arbitrum. Yield + FLUID + ARB incentives.",
        proceedText: "Participate Now",
        apy: "7.33%",
        requiresCA: true,
        features: [],
        display: [],
        logic: {
            inputs: [
                {
                    type: "number",
                    label: "Amount",
                    range: true,
                    max: "unifiedBalance",
                    suffix: {
                        icon: "https://arbiscan.io/token/images/usdt0_64.png",
                        text: "USDT",
                    },
                },
            ],
            tokens: {
                source: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://arbiscan.io/token/images/usdt0_64.png",
                    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                    chain: {
                        universe: "tron",
                        id: 728126428,
                        network: "mainnet",
                    },
                },
                destination: {
                    symbol: "USDT",
                    decimals: 6,
                    icon: "https://arbiscan.io/token/images/usdt0_64.png",
                    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    chain: {
                        universe: "evm",
                        id: 42161,
                        network: "arbitrum",
                    },
                },
            },
            logics: [],
        },
    },
];
