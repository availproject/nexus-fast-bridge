import type { Opportunity } from "./types/opportunity";

// Sample opportunities data - this would typically come from an API
// Note: APY values are indicative and may change. These are third-party platforms.
export const sampleOpportunities: Opportunity[] = [
    {
        id: "curvance-usdc-wmon-market",
        tags: ["Curvance", "USDC", "WMON"],
        title: "Trade USDC to WMON on Curvance",
        description:
            "Trade USDC to WMON on Curvance and earn upto 7.82% APY on the deposited USDC. Access Curvance directly, deposit once, earn continuously.",
        proceedText: "Trade",
        apy: "7.82%",
        requiresCA: true,
        features: [],
        display: [],
        label: "on Curvance (Monad)",
        banner: "https://files.availproject.org/fastbridge/monad/curvance.svg",
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
                            spender: "0x8EE9FC28B8Da872c38A496e9dDB9700bb7261774",
                            amount: "input",
                        },
                        transaction: {
                            to: "0x8EE9FC28B8Da872c38A496e9dDB9700bb7261774",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: 'uint256', name: 'assets', type: 'uint256' },
                                        { internalType: 'address', name: 'receiver', type: 'address' }
                                    ],
                                    name: 'depositAsCollateral',
                                    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
                                    stateMutability: 'nonpayable',
                                    type: 'function'
                                },
                            ],
                            functionName: "depositAsCollateral",
                            params: [
                                "$amount",
                                "$user",
                            ],
                            paramsTypes: ["bigint", "string"],
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
                to: "0x8EE9FC28B8Da872c38A496e9dDB9700bb7261774",
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
                            to: "0x8EE9FC28B8Da872c38A496e9dDB9700bb7261774",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: 'uint256', name: 'shares', type: 'uint256' },
                                        { internalType: 'address', name: 'receiver', type: 'address' },
                                        { internalType: 'address', name: 'owner', type: 'address' }
                                    ],
                                    name: 'redeem',
                                    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
                                    stateMutability: 'nonpayable',
                                    type: 'function'
                                },
                            ],
                            functionName: "redeem",
                            params: [
                                "$amount",
                                "$user",
                                "$user"
                            ],
                            paramsTypes: ["bigint", "string", "string"],
                        },
                    },
                },
            ],
        }
    },
    {
        id: "neverland-usdc-supply",
        tags: ["Neverland", "USDC"],
        title: "Earn yield on USDC on Neverland",
        description:
            "Lend USDC on Neverland and earn upto 13.28% APY on the deposited USDC. Access Neverland directly, deposit once, earn continuously.",
        proceedText: "Stake",
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
            "Lend USDT0 on Neverland and earn upto 12.69% APY on the deposited USDT0. Access Neverland directly, deposit once, earn continuously.",
        proceedText: "Lend",
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
    {
        id: "gearbox-usdc-edge-ultrayeild",
        tags: ["Gearbox", "USDC", "Ultrayeild"],
        title: "Earn ultrayeild on USDC on Gearbox",
        description:
            "Deposit USDC on Gearbox and earn upto 6.48% APUY on the deposited USDC. Access Gearbox directly, deposit once, earn continuously.",
        proceedText: "Earn",
        apy: "6.48%",
        requiresCA: true,
        features: [],
        display: [],
        label: "on Gearbox (Monad)",
        banner: "https://files.availproject.org/fastbridge/monad/gearbox.svg",
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
                            spender: "0x6B343F7B797f1488AA48C49d540690F2b2c89751",
                            amount: "input",
                        },
                        transaction: {
                            to: "0x6B343F7B797f1488AA48C49d540690F2b2c89751",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: 'uint256', name: 'assets', type: 'uint256' },
                                        { internalType: 'address', name: 'receiver', type: 'address' },
                                        { internalType: 'uint256', name: 'referralCode', type: 'uint256' }
                                    ],
                                    name: 'depositWithReferral',
                                    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
                                    stateMutability: 'nonpayable',
                                    type: 'function'
                                },
                            ],
                            functionName: "depositWithReferral",
                            params: [
                                "$amount",
                                "$user",
                                "0",
                            ],
                            paramsTypes: ["bigint", "string", "number"],
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
                to: "0x6B343F7B797f1488AA48C49d540690F2b2c89751",
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
                            to: "0x6B343F7B797f1488AA48C49d540690F2b2c89751",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: 'uint256', name: 'shares', type: 'uint256' },
                                        { internalType: 'address', name: 'receiver', type: 'address' },
                                        { internalType: 'address', name: 'owner', type: 'address' }
                                    ],
                                    name: 'redeem',
                                    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
                                    stateMutability: 'nonpayable',
                                    type: 'function'
                                },
                            ],
                            functionName: "redeem",
                            params: [
                                "$amount",
                                "$user",
                                "$user"
                            ],
                            paramsTypes: ["bigint", "string", "string"],
                        },
                    },
                },
            ],
        }
    },
];
