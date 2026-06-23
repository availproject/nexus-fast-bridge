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
    <div className="relative flex items-start gap-2 text-4xl font-medium transition-all duration-150 ease-out w-full">
      <div
        className="absolute invisible pointer-events-none text-4xl font-medium whitespace-pre"
        ref={mirrorRef}
        style={{
          fontVariantNumeric: "proportional-nums",
        }}
      >
        {amount || "0"}
      </div>

      <input
        autoFocus
        className="bg-transparent w-full text-foreground text-4xl font-medium outline-none transition-all duration-150 placeholder-muted-foreground proportional-nums disabled:opacity-50"
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
      <div className="absolute -inset-1 -z-10 blur-sm pointer-events-none opacity-0" />
    </div>
  );
};

export default AmountInput;
