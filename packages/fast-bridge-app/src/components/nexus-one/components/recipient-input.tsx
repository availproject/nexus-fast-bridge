// biome-ignore-all lint: NexusOne registry component from shadcn registry.
import { X } from "lucide-react";

export interface RecipientInputProps {
  hasError?: boolean;
  label?: string | null;
  onChange: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
  value: string;
}

export function RecipientInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  label = "To",
  hasError = false,
}: RecipientInputProps) {
  return (
    <div
      className="#848483)] #161615)] flex w-full items-center overflow-hidden px-4 text-[var(--foreground-primary, outline-none transition-all placeholder:text-[var(--foreground-muted,"
      style={{
        background: "#FFFFFE",
        height: "46px",
        borderRadius: "8px",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: hasError ? "#E35454" : "#006BF4",
        gap: "10px",
        paddingTop: "10px",
        paddingBottom: "10px",
      }}
    >
      {label && (
        <div
          className="flex shrink-0 select-none items-center font-geist"
          style={{
            color:
              "var(--foreground-primary, var(--foreground-primary, #161615))",
            fontSize: "14px",
            fontWeight: 400,
            lineHeight: "18px",
          }}
        >
          {label}
        </div>
      )}

      <style>
        {`
          .nexus-one-recipient-input::placeholder {
            color: #9E9E9C;
            -webkit-text-fill-color: #9E9E9C;
            opacity: 1;
          }
        `}
      </style>
      <input
        className="nexus-one-recipient-input #848483)] flex-1 border-none bg-transparent font-geist outline-none placeholder:text-[var(--foreground-muted, focus:ring-0"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          color: "#161615",
          caretColor: "#006BF4",
          fontSize: "14px",
          fontWeight: 500,
          WebkitTextFillColor: "#161615",
          lineHeight: "18px",
        }}
        value={value}
      />
      {value && onClear && (
        <button
          aria-label="Clear recipient"
          onClick={onClear}
          style={{
            alignItems: "center",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexShrink: 0,
            justifyContent: "center",
            padding: 0,
          }}
          type="button"
        >
          <X style={{ color: "#9E9E9C", height: "16px", width: "16px" }} />
        </button>
      )}
    </div>
  );
}
