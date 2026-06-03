import { type FC, useRef } from "react";

interface AmountInputProps {
  amount?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onFocus?: () => void;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  onFocus,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex w-full items-start gap-2 font-medium text-4xl transition-all duration-150 ease-out">
      <div
        className="pointer-events-none invisible absolute whitespace-pre font-medium text-4xl"
        ref={mirrorRef}
        style={{
          fontVariantNumeric: "proportional-nums",
        }}
      >
        {amount || "0"}
      </div>

      <input
        autoFocus
        className="w-full bg-transparent font-medium text-4xl text-foreground proportional-nums placeholder-muted-foreground outline-none transition-all duration-150 disabled:opacity-50"
        disabled={disabled}
        inputMode="decimal"
        maxLength={18}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        onFocus={onFocus}
        placeholder="0"
        ref={inputRef}
        type="text"
        value={amount}
      />
      <div className="pointer-events-none absolute -inset-1 -z-10 opacity-0 blur-sm" />
    </div>
  );
};

export default AmountInput;
