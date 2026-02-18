"use client";

import type { Opportunity } from "@/lib/types/opportunity";
import { ArrowRight, Zap } from "lucide-react";
import config from "../../../config";
// import { PreviewPanel } from "../walletConnect";
import NexusDeposit from "../deposit/nexus-deposit";
import {
  SUPPORTED_CHAINS,
  // type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { encodeFunctionData, maxUint256 } from "viem";
import Decimal from "decimal.js";
// import { useAccount } from "wagmi";
import {
  // useEffect,
  useState,
} from "react";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick?: (opportunity: Opportunity) => void;
}

export function OpportunityCard({
  opportunity,
  onClick,
}: OpportunityCardProps) {
  const { title, description, tags, apy, proceedText, token } = opportunity;
  const protocol = tags?.[0] || "DeFi";
  const chain = config.chainName;
  // const { address: selectedAddress } = useAccount();
  // const [gasPrice, setGasPrice] = useState<bigint>(0n);
  const [open, setOpen] = useState(false);

  // Generate gradient based on primary color
  const primaryColor = config.primaryColor;
  const t = opportunity.logic.logics[0].postBridge!.transaction!;
  const approval = opportunity.logic.logics[0].postBridge!.approval!;

  // useEffect(() => {
  //   let gasPriceIndex = 1000;
  //   const fetchGasPrice = async () => {
  //     const gasPrice = BigInt(
  //       (
  //         await (
  //           await fetch(config.chainRpcUrl, {
  //             method: "POST",
  //             headers: {
  //               "Content-Type": "application/json",
  //             },
  //             body: JSON.stringify({
  //               jsonrpc: "2.0",
  //               method: "eth_gasPrice",
  //               params: [],
  //               id: ++gasPriceIndex,
  //             }),
  //           })
  //         ).json()
  //       ).result,
  //     );
  //     setGasPrice(gasPrice);
  //   };
  //   fetchGasPrice();
  //   setInterval(() => {
  //     fetchGasPrice();
  //   }, 3000);
  // }, []);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onClick?.(opportunity)}
    >
      {/* Gradient Header */}
      <div
        className="relative h-20 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}40 0%, ${primaryColor}20 15%, #ffffff 50%, ${primaryColor}20 85%, ${primaryColor}40 100%)`,
        }}
      >
        {opportunity.banner && (
          <div className="absolute top-4 bottom-4 left-10 right-10 object-contain flex items-center justify-center">
            <img
              src={opportunity.banner}
              alt={opportunity.title}
              className="w-auto h-full"
            />
          </div>
        )}
        {/* Protocol Icon */}
        <div className="absolute top-3 right-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}80 20%, ${primaryColor} 100%)`,
            }}
          >
            {token.icon ? (
              <img
                src={token.icon}
                alt={token.symbol}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <Zap className="w-8 h-8 text-white" />
            )}
          </div>
        </div>

        {/* APY Badge */}
        {apy && (
          <div className="absolute top-1 left-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {apy} APY
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Protocol & Chain */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 capitalize">
                {protocol} • {chain}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          {/* <PreviewPanel> */}
          <NexusDeposit
            destination={{
              chainId: SUPPORTED_CHAINS.MONAD,
              tokenAddress: token.address as `0x${string}`,
              tokenSymbol: token.symbol,
              tokenDecimals: token.decimals,
              tokenLogo: token.icon,
              label: opportunity.label,
              gasTokenSymbol: "MON",
              explorerUrl: "https://monadvision.com",
              depositTargetLogo: opportunity.logo || opportunity.banner,
            }}
            heading={title}
            embed={false}
            open={open}
            onOpenChange={setOpen}
            executeDeposit={(symbol, address, amount, chainId, userAddress) => {
              console.log(symbol, address, amount, chainId, userAddress);
              const a = new Decimal(amount).mul(
                Decimal.pow(10, token.decimals),
              );
              const amountInBigInt = BigInt(a.toFixed());
              const args = t.params!.map((p) => {
                switch (p) {
                  case "$user":
                    return userAddress;
                  case "$amount": {
                    return amountInBigInt;
                  }
                  default:
                    return p;
                }
              });

              const data = encodeFunctionData({
                abi: t.abi!,
                functionName: t.functionName!,
                args,
              });
              return {
                to: t.to as `0x${string}`,
                data,
                gas: 1_500_000n, // 1.5 million units
                // set static gas limit to avoid issues and high gas fees
                gasPrice: "medium",
                tokenApproval: {
                  token: token.address,
                  amount:
                    approval.amount === "input" ? amountInBigInt : maxUint256,
                  spender: approval.spender as `0x${string}`,
                },
              };
            }}
          >
            <button
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 group-hover:gap-2"
              style={{
                backgroundColor: primaryColor,
                color: config.secondaryColor,
              }}
              onClick={() => setOpen(true)}
            >
              <span className="hidden sm:inline">{proceedText}</span>
              <span className="sm:hidden">Invest</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </NexusDeposit>
          {/* </PreviewPanel> */}
        </div>
      </div>
    </div>
  );
}
