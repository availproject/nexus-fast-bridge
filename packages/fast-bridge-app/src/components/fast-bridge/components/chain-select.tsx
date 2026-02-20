import type { SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";
import { type FC, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useNexus } from "../../nexus/nexus-provider";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface ChainSelectProps {
  className?: string;
  disabled?: boolean;
  handleSelect: (chainId: SUPPORTED_CHAINS_IDS) => void;
  hidden?: boolean;
  label?: string;
  selectedChain: number;
}

const ChainSelect: FC<ChainSelectProps> = ({
  selectedChain,
  disabled,
  hidden = false,
  className,
  label,
  handleSelect,
}) => {
  const { supportedChainsAndTokens } = useNexus();

  const selectedChainData = useMemo(() => {
    if (!supportedChainsAndTokens) {
      return null;
    }
    return supportedChainsAndTokens.find((c) => c.id === selectedChain);
  }, [selectedChain, supportedChainsAndTokens]);

  if (hidden) {
    return null;
  }
  return (
    <Select
      onValueChange={(value) => {
        if (!disabled) {
          handleSelect(Number.parseInt(value, 10) as SUPPORTED_CHAINS_IDS);
        }
      }}
      value={selectedChain?.toString() ?? ""}
    >
      <div className="flex w-full flex-col items-start gap-y-3">
        {label && <Label className="font-semibold text-sm">{label}</Label>}
        <SelectTrigger
          className="h-12! w-full font-light text-base"
          disabled={disabled}
        >
          <SelectValue>
            {selectedChainData && (
              <div
                className={cn("flex w-full items-center gap-x-2", className)}
              >
                <img
                  alt={selectedChainData?.name}
                  className="rounded-full"
                  height={24}
                  src={selectedChainData?.logo}
                  width={24}
                />
                <p className="test-sm text-primary">
                  {selectedChainData?.name}
                </p>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
      </div>

      <SelectContent>
        <SelectGroup className="no-scrollbar grid max-h-[400px] grid-cols-2 gap-2 overflow-y-scroll">
          {supportedChainsAndTokens?.map((chain) => {
            return (
              <SelectItem key={chain.id} value={String(chain.id)}>
                <div className="my-1 flex items-center gap-x-2">
                  <img
                    alt={chain?.name}
                    className="rounded-full"
                    height={24}
                    src={chain.logo}
                    width={24}
                  />
                  <p className="test-sm text-primary">{chain.name}</p>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default ChainSelect;
