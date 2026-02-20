import type { UserAsset } from "@avail-project/nexus-core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";

interface BalanceBreakdownProps {
  assetBalances: UserAsset;
}

const BalanceBreakdown = ({ assetBalances }: BalanceBreakdownProps) => {
  return (
    <Accordion collapsible style={{ marginTop: "-0.5rem" }} type="single">
      <AccordionItem value="sources">
        <div className="flex w-full items-start justify-end gap-x-4">
          {assetBalances && (
            <div className="flex min-w-fit flex-col items-end gap-y-1">
              <AccordionTrigger
                className="items-center gap-x-1 py-0"
                containerClassName="w-fit"
                hideChevron={false}
              >
                <p className="font-light text-sm">View Balance Breakdown</p>
              </AccordionTrigger>
            </div>
          )}
        </div>
        {assetBalances && (
          <AccordionContent className="my-4 w-full rounded-lg bg-muted px-4 py-2 pb-0">
            <div className="flex flex-col items-center gap-y-3">
              {assetBalances?.breakdown?.map((individualBalance) => (
                <div
                  className="flex w-full items-center justify-between gap-x-2"
                  key={individualBalance.chain.id}
                >
                  <div className="flex items-center gap-x-2">
                    <img
                      alt={individualBalance.chain.name}
                      className="rounded-full"
                      height={20}
                      src={individualBalance.chain.logo}
                      width={20}
                    />
                    <p className="font-light text-sm">
                      {individualBalance.chain.name}
                    </p>
                  </div>

                  <p className="font-light text-sm">
                    {individualBalance.balance} {assetBalances.symbol}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        )}
      </AccordionItem>
    </Accordion>
  );
};

export default BalanceBreakdown;
