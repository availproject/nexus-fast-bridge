"use client";

import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Opportunity } from "@/lib/types/opportunity";

interface WithdrawModalProps {
  opportunity: Opportunity;
  balance: bigint;
  decimals: number;
  userAddress: string;
  primaryColor: string;
}

export function WithdrawModal({
  opportunity,
  balance,
  decimals,
  userAddress,
  primaryColor,
}: WithdrawModalProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const withdrawLogic =
    opportunity.withdraw?.logics?.[0]?.preBridge?.transaction;

  const { writeContract, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleWithdraw = () => {
    if (!withdrawLogic) return;
    if (!amount || isNaN(Number(amount))) return;

    const parsedAmount = parseUnits(amount, decimals);
    if (parsedAmount === 0n) return;

    const args = withdrawLogic.params?.map((p) => {
      switch (p) {
        case "$user":
          return userAddress;
        case "$amount":
          return parsedAmount;
        default:
          return p;
      }
    });

    writeContract({
      address: withdrawLogic.to as `0x${string}`,
      abi: withdrawLogic.abi as any,
      functionName: withdrawLogic.functionName as string,
      args,
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 hover:opacity-80 border"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            Withdraw
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw {opportunity.token.symbol}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="text-gray-500">
                  Balance: {formatUnits(balance, decimals)}{" "}
                  {opportunity.token.symbol}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  onClick={() => setAmount(formatUnits(balance, decimals))}
                >
                  MAX
                </button>
              </div>
            </div>
            <button
              className="w-full py-3 rounded-xl font-semibold text-white flex justify-center items-center gap-2"
              style={{ backgroundColor: primaryColor }}
              onClick={handleWithdraw}
              disabled={
                isPending || isConfirming || !amount || Number(amount) <= 0
              }
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Withdrawing...
                </>
              ) : isSuccess ? (
                "Success"
              ) : (
                "Withdraw"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
