import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
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

const FeeBreakdown: React.FC<FeeBreakdownProps> = ({ intent }) => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="breakdown">
        <div className="w-full flex items-start justify-between">
          <p className="font-light text-base">Total fees</p>

          <div className="flex flex-col items-end justify-end-safe gap-y-1">
            <p className="font-light text-base min-w-max">
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
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-light">Fast Bridge Gas Fee</p>
              <p className="text-sm font-light">
                {formatAmount(intent?.fees?.caGas)} {intent?.token?.symbol}
              </p>
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-light">Gas Supplied</p>
              <p className="text-sm font-light">
                {formatAmount(intent?.fees?.gasSupplied)} {intent?.token?.symbol}
              </p>
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-light">Solver Fees</p>
              <p className="text-sm font-light">
                {formatAmount(intent?.fees?.solver)} {intent?.token?.symbol}
              </p>
            </div>
            <div className="flex items-center w-full justify-between">
              <p className="text-sm font-light">Protocol Fees</p>
              <p className="text-sm font-light">
                {formatAmount(intent?.fees?.protocol)} {intent?.token?.symbol}
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default FeeBreakdown;
