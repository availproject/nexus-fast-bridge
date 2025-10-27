import {
  type UserAsset,
} from "@avail-project/nexus-core";
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
    <Accordion type="single" collapsible style={{ marginTop: '-0.5rem' }}>
      <AccordionItem value="sources">
        <div className="flex items-start justify-end gap-x-4 w-full">
          {assetBalances && (
            <>

              <div className="flex flex-col items-end gap-y-1 min-w-fit">
                <AccordionTrigger
                  containerClassName="w-fit"
                  className="py-0 items-center gap-x-1"
                  hideChevron={false}
                >
                  <p className="text-sm font-light">View Balance Breakdown</p>
                </AccordionTrigger>
              </div>
            </>
          )}
        </div>
        {assetBalances && (
          <AccordionContent className="my-4 bg-muted pb-0 px-4 py-2 rounded-lg w-full">
            <div className="flex flex-col items-center gap-y-3">
              {assetBalances?.breakdown?.map((individualBalance) => (
                <div
                  key={individualBalance.chain.id}
                  className="flex items-center justify-between w-full gap-x-2"
                >
                  <div className="flex items-center gap-x-2">
                    <img
                      src={individualBalance.chain.logo}
                      alt={individualBalance.chain.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    <p className="text-sm font-light">{individualBalance.chain.name}</p>
                  </div>

                  <p className="text-sm font-light">
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