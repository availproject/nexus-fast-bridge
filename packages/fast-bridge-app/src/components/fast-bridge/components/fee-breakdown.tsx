import type {
  ReadableIntent,
  SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { chainFeatures } from "@fastbridge/runtime";
import { MessageCircleQuestion } from "lucide-react";
import type { FC } from "react";
import { useNexus } from "../../nexus/NexusProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { Skeleton } from "../../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";

interface FeeBreakdownProps {
  intent: ReadableIntent;
  isLoading?: boolean;
  tokenSymbol: SUPPORTED_TOKENS;
}

const FeeBreakdown: FC<FeeBreakdownProps> = ({
  intent,
  tokenSymbol,
  isLoading = false,
}) => {
  const { nexusSDK } = useNexus();
  const displaySymbol =
    chainFeatures.mapUsdmDisplaySymbolToUsdc &&
    intent.token?.symbol?.toUpperCase() === "USDM"
      ? "USDC"
      : tokenSymbol;
  const shouldForceZeroFees =
    chainFeatures.feeBreakdownZeroForNonCaGasOnDestinationId !== undefined &&
    intent.destination.chainID ===
      chainFeatures.feeBreakdownZeroForNonCaGasOnDestinationId;

  const feeRows = [
    {
      key: "caGas",
      label: "Fast Bridge Gas Fees",
      value: intent?.fees?.caGas,
      description:
        "The gas fee required for executing the fast bridge transaction on the destination chain.",
    },
    {
      key: "gasSupplied",
      label: "Gas Supplied",
      value: intent?.fees?.gasSupplied,
      description:
        "The amount of gas tokens supplied to cover transaction costs on the destination chain.",
    },
    {
      key: "solver",
      label: "Solver Fees",
      value: intent?.fees?.solver,
      description:
        "Fees paid to the solver that executes the bridge transaction and ensures fast completion.",
    },
    {
      key: "protocol",
      label: "Protocol Fees",
      value: intent?.fees?.protocol,
      description:
        "Fees collected by the protocol for maintaining and operating the bridge infrastructure.",
    },
  ].filter((row) =>
    chainFeatures.feeBreakdownHideGasSupplied ? row.key !== "gasSupplied" : true
  );

  return (
    <Accordion className="w-full" collapsible type="single">
      <AccordionItem value="breakdown">
        <div className="flex w-full items-start justify-between">
          <p className="font-light text-base">Total fees</p>

          <div className="justify-end-safe flex flex-col items-end gap-y-1">
            {isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <p className="min-w-max font-light text-base">
                {nexusSDK?.utils?.formatTokenBalance(intent.fees?.total, {
                  symbol: displaySymbol,
                  decimals: intent?.token?.decimals,
                })}
              </p>
            )}
            <AccordionTrigger
              className="items-center gap-x-1 p-0"
              containerClassName="w-fit"
              hideChevron={false}
            >
              <p className="font-light text-sm">View Breakup</p>
            </AccordionTrigger>
          </div>
        </div>
        <AccordionContent>
          <div className="mt-2 flex w-full flex-col items-center justify-between gap-y-3 rounded-lg bg-muted px-4 py-2">
            {feeRows.map(({ key, label, value, description }) => {
              if (
                !chainFeatures.feeBreakdownKeepZeroRows &&
                Number.parseFloat(value ?? "0") <= 0
              ) {
                return null;
              }
              return (
                <Tooltip key={key}>
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-x-2">
                      <p className="font-light text-sm">{label}</p>
                      <TooltipTrigger asChild>
                        <MessageCircleQuestion className="size-4" />
                      </TooltipTrigger>
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <>
                        {shouldForceZeroFees && key !== "caGas" ? (
                          <p className="font-semibold text-primary text-sm">
                            0 Fees
                          </p>
                        ) : (
                          <p className="font-light text-sm">
                            {nexusSDK?.utils?.formatTokenBalance(value, {
                              symbol: displaySymbol,
                              decimals: intent?.token?.decimals,
                            })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <TooltipContent className="max-w-sm text-balance">
                    <p className="font-light text-sm">{description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FeeBreakdown;
