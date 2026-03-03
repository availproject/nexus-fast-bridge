"use client";

import type { Opportunity } from "@/lib/types/opportunity";
import { ArrowRight } from "lucide-react";
import config from "../../../config";
import NexusDeposit from "../deposit/nexus-deposit";
import { SUPPORTED_CHAINS } from "@avail-project/nexus-core";
import { encodeFunctionData, maxUint256 } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { WithdrawModal } from "./WithdrawModal";
import { useModal } from "connectkit";
import { useState } from "react";

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
  const { isConnected, address } = useAccount();
  const { setOpen: setConnectModalOpen } = useModal();
  const [open, setOpen] = useState(false);

  const withdrawConfig = opportunity.withdraw;

  const withdrawContractAddress =
    withdrawConfig?.withdrawalAmount?.to?.startsWith("0x")
      ? (withdrawConfig.withdrawalAmount.to as `0x${string}`)
      : (`0x${withdrawConfig?.withdrawalAmount?.to}` as `0x${string}`);

  const { data: balanceData } = useReadContract({
    chainId: SUPPORTED_CHAINS.MEGAETH,
    address: withdrawContractAddress,
    abi: withdrawConfig?.withdrawalAmount?.abi as any,
    functionName: withdrawConfig?.withdrawalAmount?.functionName || "balanceOf",
    args: withdrawConfig?.withdrawalAmount?.params?.map((p) =>
      p === "$user" ? address : p,
    ) as any[],
    query: {
      enabled: !!address && !!withdrawConfig,
    },
  });

  const { data: decimalsData } = useReadContract({
    chainId: SUPPORTED_CHAINS.MEGAETH,
    address: withdrawContractAddress,
    abi: [
      {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "decimals",
    query: {
      enabled: !!address && !!withdrawConfig,
    },
  });

  const decimals =
    decimalsData !== undefined
      ? Number(decimalsData)
      : opportunity.token.decimals;
  const balance = balanceData !== undefined ? BigInt(balanceData as any) : 0n;

  console.log(`Withdrawal Amount for ${opportunity.title}`, {
    balance,
    decimals,
    rawBalance: balanceData,
  });

  // Generate gradient based on primary color
  const primaryColor = config.primaryColor;
  const t = opportunity.logic.logics[0].postBridge!.transaction!;
  const approval = opportunity.logic.logics[0].postBridge!.approval!;

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
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* APY Badge */}
          {apy && (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {apy} APY<sup>*</sup>
            </span>
          )}
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
          {token.icon && (
            <img
              src={token.icon}
              alt={token.symbol}
              className="w-6 h-6 rounded-full"
            />
          )}
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
          <div className="flex gap-2">
            {balance > 0n && (
              <WithdrawModal
                opportunity={opportunity}
                balance={balance}
                decimals={decimals}
                userAddress={address as string}
                primaryColor={primaryColor}
                chainId={SUPPORTED_CHAINS.MEGAETH}
              />
            )}
            {!isConnected ? (
              <button
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 group-hover:gap-2"
                style={{
                  backgroundColor: primaryColor,
                  color: config.secondaryColor,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setConnectModalOpen(true);
                }}
              >
                <span className="hidden sm:inline">{proceedText}</span>
                <span className="sm:hidden">Invest</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <NexusDeposit
                destination={{
                  chainId: SUPPORTED_CHAINS.MEGAETH,
                  tokenAddress: token.address as `0x${string}`,
                  tokenSymbol: token.symbol,
                  tokenDecimals: token.decimals,
                  tokenLogo: token.icon,
                  label: opportunity.label,
                  gasTokenSymbol: "ETH", // MegaETH uses ETH for gas? Or is it something else? getConfig implies MON for Monad. MegaETH is usually ETH.
                  explorerUrl: "https://explorer.megaeth.systems", // Check correct explorer
                  depositTargetLogo: opportunity.logo || opportunity.banner,
                }}
                heading={title}
                embed={false}
                open={open}
                onOpenChange={setOpen}
                executeDeposit={(
                  symbol,
                  address,
                  amount,
                  chainId,
                  userAddress,
                ) => {
                  console.log(symbol, address, amount, chainId, userAddress);
                  const args = t.params!.map((p) => {
                    switch (p) {
                      case "$user":
                        return userAddress;
                      case "$amount": {
                        return amount;
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
                      amount: approval.amount === "input" ? amount : maxUint256,
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
