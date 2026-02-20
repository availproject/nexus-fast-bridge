import type { Opportunity } from "./types/opportunity";

// Sample opportunities data - this would typically come from an API
// Note: APY values are indicative and may change. These are third-party platforms.
export const sampleOpportunities: Opportunity[] = [
    {
        id: "aave-usdm-pool",
        logo: "https://files.availproject.org/fastbridge/megaeth/aave-favicon.svg",
        tags: ["Aave", "USDM"],
        title: "Deposit USDM on MegaETH to Aave",
        description:
            "Deposit USDM on MegaETH and earn upto 0.01% APY on the deposited USDM. Access Aave directly, deposit once, earn continuously.",
        proceedText: "Deposit",
        apy: "0.01%",
        requiresCA: true,
        features: [],
        display: [],
        label: "on Aave (MegaETH)",
        banner: "https://files.availproject.org/fastbridge/megaeth/aave-logo.svg",
        token: {
            icon: "https://mega.etherscan.io/token/images/usdm_32.png",
            symbol: "USDM",
            decimals: 18,
            address: "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
        },
        logic: {
            logics: [
                {
                    postBridge: {
                        universe: "evm",
                        approval: {
                            tokenAddress: "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
                            spender: "0x7e324AbC5De01d112AfC03a584966ff199741C28",
                            amount: "input",
                        },
                        transaction: {
                            to: "0x7e324AbC5De01d112AfC03a584966ff199741C28",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: "address", name: "asset", type: "address" },
                                        {
                                            internalType: "uint256",
                                            name: "amount",
                                            type: "uint256",
                                        },
                                        {
                                            internalType: "address",
                                            name: "onBehalfOf",
                                            type: "address",
                                        },
                                        {
                                            internalType: "uint16",
                                            name: "referralCode",
                                            type: "uint16",
                                        },
                                    ],
                                    name: "supply",
                                    outputs: [],
                                    stateMutability: "nonpayable",
                                    type: "function",
                                },
                            ],
                            functionName: "supply",
                            params: [
                                "0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7",
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
                to: "0x5dF82810CB4B8f3e0Da3c031cCc9208ee9cF9500",
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
                            to: "0x7e324AbC5De01d112AfC03a584966ff199741C28",
                            abi: [
                                {
                                    inputs: [
                                        { internalType: "address", name: "asset", type: "address" },
                                        {
                                            internalType: "uint256",
                                            name: "amount",
                                            type: "uint256",
                                        },
                                        { internalType: "address", name: "to", type: "address" },
                                    ],
                                    name: "withdraw",
                                    outputs: [
                                        { internalType: "uint256", name: "", type: "uint256" },
                                    ],
                                    stateMutability: "nonpayable",
                                    type: "function",
                                },
                            ],
                            functionName: "withdraw",
                            params: [
                                "0x5dF82810CB4B8f3e0Da3c031cCc9208ee9cF9500",
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
