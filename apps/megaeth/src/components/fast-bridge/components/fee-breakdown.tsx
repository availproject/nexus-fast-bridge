import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { Info } from "lucide-react";
import { type ReadableIntent } from "@avail-project/nexus-core";

// Helper function to format numbers and remove trailing zeros after decimal point
const formatAmount = (amount: string | number | undefined): string => {
  if (!amount) return "0";
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(num)) return String(amount);
  // Convert to string and remove trailing zeros only after decimal point
  const str = num.toString();
  // Only remove trailing zeros if there's a decimal point
  if (str.includes(".")) {
    return str.replace(/\.?0+$/, "");
  }
  return str;
};

interface FeeBreakdownProps {
  intent: ReadableIntent;
}

interface FeeItemProps {
  label: string;
  amount: string;
  tokenSymbol?: string;
  tooltipContent: string;
}

const FeeItem: React.FC<FeeItemProps> = ({
  label,
  amount,
  tokenSymbol,
  tooltipContent,
}) => {
  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex items-center gap-x-1.5">
        <p className="text-sm font-light">{label}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center focus:outline-none"
              aria-label={`Information about ${label}`}
            >
              <Info className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-sm font-light">
        {formatAmount(amount)} {tokenSymbol}
      </p>
    </div>
  );
};

const FeeBreakdown: React.FC<FeeBreakdownProps> = ({ intent }) => {
  return (
    <TooltipProvider>
      <Accordion type="single" collapsible>
        <AccordionItem value="breakdown">
          <div className="w-full flex items-start justify-between">
            <p className="font-medium text-base">Total fees</p>

            <div className="flex flex-col items-end justify-end-safe gap-y-1">
              <p className="font-medium text-base min-w-max">
                {formatAmount(intent.fees?.total)} {intent.token?.symbol}
              </p>
              <AccordionTrigger
                containerClassName="w-fit"
                className="p-0 items-center gap-x-1"
                hideChevron={false}
              >
                <p className="text-sm font-light">View Breakup</p>
              </AccordionTrigger>
            </div>
          </div>
          <AccordionContent>
            <div className="w-full flex flex-col items-center justify-between gap-y-3 bg-muted px-4 py-2 rounded-lg mt-2">
              <FeeItem
                label="Fast Bridge Gas Fee"
                amount={intent?.fees?.caGas}
                tokenSymbol={intent?.token?.symbol}
                tooltipContent="The gas fee required for executing the fast bridge transaction on the destination chain."
              />
              <FeeItem
                label="Gas Supplied"
                amount={intent?.fees?.gasSupplied}
                tokenSymbol={intent?.token?.symbol}
                tooltipContent="The amount of gas tokens supplied to cover transaction costs on the destination chain."
              />
              <FeeItem
                label="Solver Fees"
                amount={intent?.fees?.solver}
                tokenSymbol={intent?.token?.symbol}
                tooltipContent="Fees paid to the solver that executes the bridge transaction and ensures fast completion."
              />
              <FeeItem
                label="Protocol Fees"
                amount={intent?.fees?.protocol}
                tokenSymbol={intent?.token?.symbol}
                tooltipContent="Fees collected by the protocol for maintaining and operating the bridge infrastructure."
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </TooltipProvider>
  );
};

export default FeeBreakdown;
