// Types for user positions (invested opportunities)

export interface PositionInterestRate {
    rate: string;
    period: string; // e.g., "7 Days", "30 Days", "360 Days"
}

export interface Position {
    id: string;
    opportunityId: string;
    protocol: string;
    chain: string;
    token: {
        symbol: string;
        icon: string;
        decimals: number;
    };
    currentValue: string;
    totalDeposits: string;
    depositedUsd?: string;
    currentValueUsd?: string;
    returnRate: string; // e.g., "8.6%"
    returnType: string; // e.g., "XIRR", "APY", "APR"
    interestRates?: PositionInterestRate[];
    category: "lending" | "staking" | "borrowing" | "all";
    createdAt?: string;
}
