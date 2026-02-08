"use client";

import React, {
  type FC,
  memo,
  type RefObject,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AllowanceHookSource,
  CHAIN_METADATA,
  type OnAllowanceHookData,
} from "@fastbridge/nexus-adapter";
import { getChainRuntimeConfig, type ChainSlug } from "@fastbridge/chain-runtime-config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNexus } from "@/components/nexus/NexusProvider";

interface AllowanceModalProps {
  allowance: RefObject<OnAllowanceHookData | null>;
  callback?: () => void;
  onCloseCallback?: () => void;
  chainSlug: ChainSlug;
}

type AllowanceChoice = "min" | "max" | "custom";

interface AllowanceOptionProps {
  index: number;
  name: string;
  choice: AllowanceChoice;
  selectedChoice?: AllowanceChoice;
  onSelect: (index: number, choice: AllowanceChoice) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  allowanceValue?: string;
}

const ALLOWANCE_CHOICES: Array<{
  choice: AllowanceChoice;
  title: string;
  description: string;
}> = [
  {
    choice: "min",
    title: "Minimum",
    description: "Grant the lowest allowance required for this action.",
  },
  {
    choice: "max",
    title: "Maximum",
    description: "Approve once and skip future approvals for this token.",
  },
  {
    choice: "custom",
    title: "Custom amount",
    description: "Specify an allowance that fits your threshold.",
  },
];

const AllowanceOption: FC<AllowanceOptionProps> = ({
  index,
  name,
  choice,
  selectedChoice,
  onSelect,
  title,
  description,
  children,
  allowanceValue,
}) => {
  const isActive = selectedChoice === choice;

  return (
    <Label className="block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={choice}
        checked={isActive}
        onChange={() => onSelect(index, choice)}
        className="sr-only"
      />
      <div
        className={[
          "w-full rounded-xl border p-3 transition",
          isActive
            ? "border-primary bg-primary/10 shadow-sm"
            : "border-border/60 bg-muted/20 hover:border-border",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {description ? (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            ) : null}
          </div>
          {allowanceValue ? (
            <p className="text-xs font-medium text-muted-foreground max-w-[9rem] truncate text-right">
              {allowanceValue}
            </p>
          ) : null}
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </Label>
  );
};

function normalizeNumberInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;
  if (trimmed === ".") return "0.";
  return trimmed;
}

const AllowanceModal: FC<AllowanceModalProps> = ({
  allowance,
  callback,
  onCloseCallback,
  chainSlug,
}) => {
  const { nexusSDK } = useNexus();
  const runtimeConfig = getChainRuntimeConfig(chainSlug);
  const allowanceData = allowance.current;
  const sources = allowanceData?.sources;

  const [selectedOption, setSelectedOption] = useState<AllowanceChoice[]>([]);
  const [customValues, setCustomValues] = useState<string[]>([]);

  const isCustomValueValid = (
    value: string,
    source: AllowanceHookSource,
    index: number,
  ) => {
    if (!value.trim()) return false;
    if (!nexusSDK) return false;
    try {
      const parsed = nexusSDK.convertTokenReadableAmountToBigInt(
        value,
        source.token.symbol,
        source.chain.id,
      );
      return parsed > 0n && parsed >= source.amount.requiredRaw;
    } catch {
      console.log("index", index);
      return false;
    }
  };

  useEffect(() => {
    if (!sources || sources.length === 0) return;
    const defaults = sources.map(() => "min" as AllowanceChoice);
    setSelectedOption(defaults);
    setCustomValues(sources.map(() => ""));
  }, [sources]);

  const isSelectionComplete = useMemo(() => {
    if (!sources || sources.length === 0) return false;
    return sources.every((source, idx) => {
      const choice = selectedOption[idx];
      if (!choice) return false;
      if (choice !== "custom") return true;
      return isCustomValueValid(customValues[idx] ?? "", source, idx);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customValues, selectedOption, sources]);

  const formatAmount = (amount: bigint, source: AllowanceHookSource) => {
    if (!nexusSDK) return "--";
    return `${nexusSDK.convertTokenBigIntAmountToReadable(
      amount,
      source.token.symbol,
      source.chain.id,
    )} ${source.token.symbol}`;
  };

  const handleSelect = (index: number, choice: AllowanceChoice) => {
    setSelectedOption((prev) => {
      const next = [...prev];
      next[index] = choice;
      return next;
    });
  };

  const handleCustomValueChange = (index: number, value: string) => {
    const normalized = normalizeNumberInput(value);
    if (normalized === null) return;
    setCustomValues((prev) => {
      const next = [...prev];
      next[index] = normalized;
      return next;
    });
  };

  const handleApprove = async () => {
    if (!allowanceData || !sources || !nexusSDK) return;

    const payload = sources.map((source, idx) => {
      const choice = selectedOption[idx] ?? "min";
      if (choice === "min") return "min" as const;
      if (choice === "max") return "max" as const;

      const custom = customValues[idx]?.trim() ?? "";
      if (!custom || !isCustomValueValid(custom, source, idx)) {
        return "min" as const;
      }

      return custom;
    });

    await allowanceData.allow(payload);
    callback?.();
  };

  const onClose = () => {
    setSelectedOption([]);
    setCustomValues([]);
    onCloseCallback?.();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">Approve allowances</h3>
        <p className="text-sm text-muted-foreground">
          Review every required token and choose the minimum, an unlimited max,
          or define a custom amount before approving.
        </p>
      </div>

      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
        {sources?.map((source: AllowanceHookSource, index: number) => (
          <div
            key={`${source.token.symbol}-${index}`}
            className="rounded-2xl border border-border/40 bg-muted/10 p-4 shadow-sm transition hover:border-border"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-inner">
                  <img
                    src={
                      runtimeConfig.fastBridge.logoOverridesByChainId[source.chain.id] ??
                      CHAIN_METADATA[source.chain.id]?.logo
                    }
                    alt={source.chain.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                </div>
                <div>
                  <p className="text-base font-semibold">{source.token.symbol}</p>
                  <p className="text-xs text-muted-foreground">{source.chain.name}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current allowance
                </p>
                <p className="text-sm font-semibold">
                  {formatAmount(source.allowance.currentRaw, source)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {ALLOWANCE_CHOICES.map((choice) => {
                if (choice.choice === "custom") {
                  const customValue = customValues[index] ?? "";
                  const isCustomSelected = selectedOption[index] === "custom";
                  const showError =
                    isCustomSelected &&
                    customValue.trim() !== "" &&
                    !isCustomValueValid(customValue, source, index);

                  return (
                    <AllowanceOption
                      key={choice.choice}
                      index={index}
                      name={`allowance-${index}`}
                      choice={choice.choice}
                      selectedChoice={selectedOption[index]}
                      onSelect={handleSelect}
                      title={choice.title}
                      description={choice.description}
                    >
                      <div className="space-y-2">
                        <Input
                          inputMode="decimal"
                          placeholder={`>= ${formatAmount(
                            source.amount.requiredRaw,
                            source,
                          )}`}
                          value={customValue}
                          onChange={(event) =>
                            handleCustomValueChange(index, event.target.value)
                          }
                        />
                        {showError ? (
                          <p className="text-xs text-destructive">
                            Custom value must be at least the required amount.
                          </p>
                        ) : null}
                      </div>
                    </AllowanceOption>
                  );
                }

                const amountForChoice =
                  choice.choice === "min"
                    ? source.amount.requiredRaw
                    : source.amount.maximumRaw;

                return (
                  <AllowanceOption
                    key={choice.choice}
                    index={index}
                    name={`allowance-${index}`}
                    choice={choice.choice}
                    selectedChoice={selectedOption[index]}
                    onSelect={handleSelect}
                    title={choice.title}
                    description={choice.description}
                    allowanceValue={formatAmount(amountForChoice, source)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleApprove} disabled={!isSelectionComplete}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default memo(AllowanceModal);
