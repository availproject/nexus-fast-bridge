// Types for DeFi opportunities

type OppImage = {
    type: "image";
    url: string;
    dimensions?: {
        width?: number;
        height?: number;
    };
    alt?: string;
};

type OppVideo = {
    type: "video";
    url: string;
    dimensions?: {
        width?: number;
        height?: number;
        aspectRatio?: number;
    };
    format: "video/mp4" | "video/webm";
    autoplay?: boolean;
    thumbnailUrl?: string;
};

type OppChart = {
    type: "chart";
    data: {
        labels: string[];
        data: number[];
    };
};

type OppDisplay = OppImage | OppVideo | OppChart;

type OpportunityTextInput = {
    type: "text";
    id: string;
    label: string;
    validation?: {
        pattern?: string;
        minLength?: string;
        maxLength?: string;
    }[];
};

type OpportunityNumberInput = {
    type: "number";
    label: string;
    range?: boolean;
    max?: "unifiedBalance" | number;
    suffix?: {
        icon: string;
        text: string;
    };
};

type OpportunityInput = OpportunityTextInput | OpportunityNumberInput;

type CommonOps = {
    universe: "evm";
    approval?: {
        tokenAddress?: string;
        spender: string;
        amount: "max" | "input";
        maxConfirmations?: number;
    };
    transaction?: {
        contract?: string;
        to: string;
        abi?: any[];
        functionName?: string;
        params?: string[];
        paramsTypes: (
            | "string"
            | "bigint"
            | "float"
            | "integer"
            | "number"
            | "boolean"
            | "tuple"
        )[];
        maxConfirmations?: number;
    };
    signature?: {
        data: any;
        domain?: any;
        types?: any;
        api?: {
            method: "GET" | "POST" | "PUT" | "WS";
            url: string;
            dataStructure: any;
        };
        request:
        | "sign"
        | "signMessage"
        | "signTransaction"
        | "personal_sign"
        | "eth_signTypedDataV4";
    };
    api?: {
        method: "GET" | "POST" | "PUT" | "WS";
        url: string;
        dataStructure: any;
    };
};

type OppLogic = {
    preBridge?: CommonOps;
    postBridge?: CommonOps;
};

interface OpportunityLogic {
    // token: {
    //     symbol: string;
    //     icon: string;
    //     decimals: number;
    //     address: string;
    //     chain: {
    //         universe: "evm";
    //         id: number | string;
    //         network: string;
    //     };
    // };
    logics: OppLogic[];
}

interface Opportunity {
    id: string;
    tags?: string[];
    title: string;
    description: string;
    apy?: string; // e.g., "7.82%"
    features: {
        key: string;
        value: string;
    }[];
    display: OppDisplay[];
    requiresCA: boolean;
    proceedText: string;
    token: {
        icon: string;
        name: string;
        decimals: number;
    };
    logic: OpportunityLogic;
    withdraw?: {
        withdrawalAmount: {
            abi?: any[];
            functionName?: string;
            params?: string[];
            paramsTypes?: (
                | "string"
                | "bigint"
                | "float"
                | "integer"
                | "number"
                | "boolean"
                | "tuple"
            )[];
            returnTypes?: (
                | "string"
                | "bigint"
                | "float"
                | "integer"
                | "number"
                | "boolean"
                | "tuple"
            )[];
            isNative?: boolean;
            to: string;
        };
        logics: OppLogic[];
    };
}

export type {
    Opportunity,
    OpportunityLogic,
    CommonOps,
    OppDisplay,
    OppImage,
    OppVideo,
    OppChart,
    OppLogic,
    OpportunityInput,
};
