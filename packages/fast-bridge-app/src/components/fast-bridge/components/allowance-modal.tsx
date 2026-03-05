"use client";
import {
  type AllowanceHookSource,
  CHAIN_METADATA,
  type OnAllowanceHookData,
} from "@avail-project/nexus-core";
import { chainFeatures } from "@fastbridge/runtime";
import React, {
  type FC,
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { withBasePath } from "@/lib/utils";
import { useNexus } from "../../nexus/nexus-provider";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

interface AllowanceModalProps {
  allowance: RefObject<OnAllowanceHookData | null>;
  callback?: () => void;
  onCloseCallback?: () => void;
}

type AllowanceChoice = "min" | "max" | "custom";

interface AllowanceOptionProps {
  allowanceValue?: string;
  children?: React.ReactNode;
  choice: AllowanceChoice;
  description?: string;
  index: number;
  name: string;
  onSelect: (index: number, choice: AllowanceChoice) => void;
  selectedChoice?: AllowanceChoice;
  title: string;
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
        checked={isActive}
        className="peer sr-only"
        name={name}
        onChange={() => onSelect(index, choice)}
        type="radio"
        value={choice}
      />
      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/40 px-4 py-3 transition peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-between">
          <div>
            <p className="font-medium text-sm leading-tight">{title}</p>
            {description ? (
              <p className="text-muted-foreground text-xs">{description}</p>
            ) : null}
          </div>
          {allowanceValue && (
            <p className="font-medium text-sm leading-tight">
              {allowanceValue}
            </p>
          )}
        </div>

        {children}
      </div>
    </Label>
  );
};

const AllowanceModal: FC<AllowanceModalProps> = ({
  allowance,
  callback,
  onCloseCallback,
}) => {
  const { nexusSDK } = useNexus();
  const [selectedOption, setSelectedOption] = useState<AllowanceChoice[]>([]);
  const [customValues, setCustomValues] = useState<string[]>([]);

  const { sources, allow, deny } = allowance.current ?? {
    sources: [],
    allow: () => undefined,
    deny: () => undefined,
  };

  const defaultChoices = useMemo<AllowanceChoice[]>(
    () => Array.from({ length: sources.length }, () => "min"),
    [sources.length]
  );

  const isCustomValueValid = useCallback(
    (value: string, minimumRaw: bigint, decimals: number): boolean => {
      if (!value || value.trim() === "") {
        return false;
      }
      try {
        const parsedValue = nexusSDK?.utils?.parseUnits(value, decimals);
        if (parsedValue === undefined) {
          return false;
        }
        return parsedValue >= minimumRaw;
      } catch {
        return false;
      }
    },
    [nexusSDK?.utils]
  );

  const hasValidationErrors = useMemo(() => {
    return sources.some((source, index) => {
      if (selectedOption[index] !== "custom") {
        return false;
      }
      const value = customValues[index];
      if (!value || value.trim() === "") {
        return false;
      }
      return !isCustomValueValid(
        value,
        source.allowance.minimumRaw,
        source.token.decimals
      );
    });
  }, [customValues, isCustomValueValid, selectedOption, sources]);

  const onClose = () => {
    deny();
    allowance.current = null;
    onCloseCallback?.();
  };

  const onApprove = () => {
    const processed = sources.map((_, i) => {
      const opt = selectedOption[i];
      if (opt === "min" || opt === "max") {
        return opt;
      }
      const rawValue = customValues[i]?.trim();
      if (!rawValue) {
        return "min";
      }
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return "min";
      }
      return rawValue;
    });
    try {
      allow(processed);
      allowance.current = null;
      callback?.();
    } catch (error) {
      console.error("AllowanceModal onApprove error", error);
      allowance.current = null;
      onCloseCallback?.();
    }
  };

  const handleChoiceChange = (index: number, value: AllowanceChoice) => {
    setSelectedOption((prev) => {
      const next = [...(prev.length ? prev : defaultChoices)];
      next[index] = value;
      return next;
    });
  };

  const formatAmount = (value: string | bigint, source: AllowanceHookSource) =>
    nexusSDK?.utils?.formatTokenBalance(value, {
      symbol: source.token.symbol,
      decimals: source.token.decimals,
    }) ?? "—";

  useEffect(() => {
    setSelectedOption(defaultChoices);
  }, [defaultChoices]);

  useEffect(() => {
    setCustomValues(Array.from({ length: sources.length }, () => ""));
  }, [sources.length]);

  return (
    <>
      <div className="space-y-1">
        <p className="font-semibold text-lg tracking-tight">
          Set Token Allowances
        </p>
        <p className="text-muted-foreground text-sm">
          Review every required token and choose the minimum, an unlimited max,
          or define a custom amount before approving.
        </p>
      </div>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-1">
        {sources?.map((source: AllowanceHookSource, index: number) => (
          <div
            className="rounded-2xl border border-border/40 bg-muted/10 p-4 shadow-sm transition hover:border-border"
            key={`${source.token.symbol}-${index}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-inner">
                  <img
                    alt={source.chain.name}
                    className="rounded-full"
                    height={24}
                    src={
                      withBasePath(
                        chainFeatures.allowanceLogoOverrideByChainId?.[
                          source.chain.id
                        ] ?? CHAIN_METADATA[source.chain.id]?.logo
                      ) || CHAIN_METADATA[source.chain.id]?.logo
                    }
                    width={24}
                  />
                </div>
                <div>
                  <p className="font-semibold text-base">
                    {source.token.symbol}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {source.chain.name}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Current allowance
                </p>
                <p className="font-semibold text-sm">
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
                    !isCustomValueValid(
                      customValue,
                      source.allowance.minimumRaw,
                      source.token.decimals
                    );
                  return (
                    <AllowanceOption
                      choice={choice.choice}
                      description={choice.description}
                      index={index}
                      key={choice.choice}
                      name={`allowance-${index}`}
                      onSelect={handleChoiceChange}
                      selectedChoice={selectedOption[index]}
                      title={choice.title}
                    >
                      <div className="flex flex-col gap-1">
                        <Input
                          className={`h-9 w-40 rounded-lg border bg-background/80 text-sm disabled:opacity-60 ${
                            showError ? "border-destructive" : ""
                          }`}
                          disabled={!isCustomSelected}
                          inputMode="decimal"
                          maxLength={source.token.decimals}
                          min="0"
                          onChange={(e) => {
                            const next = [...customValues];
                            next[index] = e.target.value;
                            setCustomValues(next);
                          }}
                          placeholder="0.00"
                          step="any"
                          type="number"
                          value={isCustomSelected ? customValue : ""}
                        />
                        {showError && (
                          <p className="text-destructive text-xs">
                            Min: {source.allowance.minimum}
                          </p>
                        )}
                      </div>
                    </AllowanceOption>
                  );
                }
                return (
                  <AllowanceOption
                    allowanceValue={
                      choice.choice === "min"
                        ? formatAmount(source.allowance.minimumRaw, source)
                        : "Unlimited"
                    }
                    choice={choice.choice}
                    description={choice.description}
                    index={index}
                    key={choice.choice}
                    name={`allowance-${index}`}
                    onSelect={handleChoiceChange}
                    selectedChoice={selectedOption[index]}
                    title={choice.title}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button className="font-semibold" onClick={onClose} variant="ghost">
          Deny
        </Button>
        <Button
          className="w-full font-semibold sm:w-auto"
          disabled={hasValidationErrors}
          onClick={onApprove}
        >
          Approve Selected
        </Button>
      </div>
    </>
  );
};

AllowanceModal.displayName = "AllowanceModal";

export default memo(AllowanceModal);
