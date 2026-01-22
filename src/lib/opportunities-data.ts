import type { Opportunity } from "./types/opportunity";

// Sample opportunities data - this would typically come from an API
// Note: APY values are indicative and may change. These are third-party platforms.
export const sampleOpportunities: Opportunity[] = [
    {
        id: "neverland-usdc-supply",
        tags: ["Neverland", "USDC"],
        title: "Earn yield on USDC on Neverland",
        description:
            "Earn 13.28% APY on USDC on Neverland. Access Neverland directly, deposit once, earn continuously.",
        proceedText: "Participate Now",
        apy: "13.28%",
        requiresCA: true,
        features: [],
        display: [],
        label: "on Neverland (Monad)",
        banner: "https://files.availproject.org/fastbridge/monad/neverland2.png",
        token: {
            icon: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/usdc.png/public",
            name: "USDC",
            decimals: 6,
        },
        logic: {
            logics: [
                {
                    postBridge: {
                        universe: "evm",
                        approval: {
                            tokenAddress: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
                            spender: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585",
                            amount: "input",
                        },
                        transaction: {
                            to: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: "address", name: "asset", type: "address" },
                                        { internalType: "uint256", name: "amount", type: "uint256" },
                                        { internalType: "address", name: "onBehalfOf", type: "address" },
                                        { internalType: "uint16", name: "referralCode", type: "uint16" },
                                    ],
                                    name: "supply",
                                    outputs: [],
                                    stateMutability: "nonpayable",
                                    type: "function",
                                },
                            ],
                            functionName: "supply",
                            params: [
                                "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
                                "$amount",
                                "$user",
                                "0",
                            ],
                            paramsTypes: ["string", "bigint", "string", "number"],
                        },
                    },
                }
            ],
        },
        withdraw: {
            withdrawalAmount: {
                abi: [
                    {
                        inputs: [
                            { internalType: "address", name: "user", type: "address" },
                        ],
                        name: "balanceOf",
                        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                        stateMutability: "view",
                        type: "function",
                    },
                ],
                to: "0x38648958836eA88b368b4ac23b86Ad44B0fe7508",
                functionName: "balanceOf",
                params: ["$user"],
                paramsTypes: ["string"],
                returnTypes: ["bigint"],
            },
            logics: [
                {
                    preBridge: {
                        universe: "evm",
                        transaction: {
                            to: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: "address", name: "asset", type: "address" },
                                        { internalType: "uint256", name: "amount", type: "uint256" },
                                        { internalType: "address", name: "to", type: "address" },
                                    ],
                                    name: "withdraw",
                                    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                                    stateMutability: "nonpayable",
                                    type: "function",
                                },
                            ],
                            functionName: "withdraw",
                            params: [
                                "0x38648958836eA88b368b4ac23b86Ad44B0fe7508",
                                "$amount",
                                "$user",
                            ],
                            paramsTypes: ["string", "bigint", "string"],
                        },
                    },
                },
            ],
        }
    },
    {
        id: "neverland-usdt-supply",
        tags: ["Neverland", "USDT0"],
        title: "Earn yield on USDT0 on Neverland",
        description:
            "Earn 12.69% APY on USDT0 on Neverland. Access Neverland directly, deposit once, earn continuously.",
        proceedText: "Participate Now",
        apy: "12.69%",
        requiresCA: true,
        features: [],
        display: [],
        label: "on Neverland (Monad)",
        banner: "https://files.availproject.org/fastbridge/monad/neverland2.png",
        token: {
            icon: "https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/usdt.png/public",
            name: "USDT",
            decimals: 6,
        },
        logic: {
            logics: [
                {
                    postBridge: {
                        universe: "evm",
                        approval: {
                            tokenAddress: "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
                            spender: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585",
                            amount: "input",
                        },
                        transaction: {
                            to: "0x80F00661b13CC5F6ccd3885bE7b4C9c67545D585",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: "address", name: "asset", type: "address" },
                                        { internalType: "uint256", name: "amount", type: "uint256" },
                                        { internalType: "address", name: "onBehalfOf", type: "address" },
                                        { internalType: "uint16", name: "referralCode", type: "uint16" },
                                    ],
                                    name: "supply",
                                    outputs: [],
                                    stateMutability: "nonpayable",
                                    type: "function",
                                },
                            ],
                            functionName: "supply",
                            params: [
                                "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
                                "$amount",
                                "$user",
                                "0",
                            ],
                            paramsTypes: ["string", "bigint", "string", "number"],
                        },
                    },
                }
            ],
        },
        withdraw: {
            withdrawalAmount: {
                abi: [
                    {
                        inputs: [
                            { internalType: "address", name: "user", type: "address" },
                        ],
                        name: "balanceOf",
                        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                        stateMutability: "view",
                        type: "function",
                    },
                ],
                to: "0x38648958836eA88b368b4ac23b86Ad44B0fe7508",
                functionName: "balanceOf",
                params: ["$user"],
                paramsTypes: ["string"],
                returnTypes: ["bigint"],
            },
            logics: [
                {
                    preBridge: {
                        universe: "evm",
                        transaction: {
                            to: "0x39F901c32b2E0d25AE8DEaa1ee115C748f8f6bDf",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: "address", name: "asset", type: "address" },
                                        { internalType: "uint256", name: "amount", type: "uint256" },
                                        { internalType: "address", name: "to", type: "address" },
                                    ],
                                    name: "withdraw",
                                    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                                    stateMutability: "nonpayable",
                                    type: "function",
                                },
                            ],
                            functionName: "withdraw",
                            params: [
                                "0x39F901c32b2E0d25AE8DEaa1ee115C748f8f6bDf",
                                "$amount",
                                "$user",
                            ],
                            paramsTypes: ["string", "bigint", "string"],
                        },
                    },
                },
            ],
        }
    },
];
