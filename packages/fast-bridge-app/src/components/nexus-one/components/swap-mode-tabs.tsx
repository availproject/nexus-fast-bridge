import type { SwapType } from "../types";

interface SwapModeTabsProps {
  disabled?: boolean;
  onChange: (mode: SwapType) => void;
  value: SwapType;
}

const TAB_COPY: Record<SwapType, { label: string; description: string }> = {
  exactIn: { label: "Exact In", description: "Set send amount" },
  exactOut: { label: "Exact Out", description: "Set receive amount" },
};

export function SwapModeTabs({
  disabled = false,
  onChange,
  value,
}: SwapModeTabsProps) {
  return (
    <div
      aria-label="Swap amount mode"
      role="tablist"
      style={{
        alignItems: "center",
        backgroundColor: "#F5F6F8",
        borderRadius: "999px",
        boxShadow: "#2A388B0F 0 1px 2px inset",
        boxSizing: "border-box",
        display: "flex",
        padding: "4px",
        position: "relative",
        width: "100%",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "999px",
          bottom: "4px",
          boxShadow:
            "#FFFFFFE6 0 1px 0 inset, #3C286414 0 1px 2px, #3C28640F 0 2px 6px",
          left: "4px",
          position: "absolute",
          top: "4px",
          transform:
            value === "exactOut" ? "translateX(100%)" : "translateX(0)",
          transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
          width: "calc((100% - 8px) / 2)",
          willChange: "transform",
        }}
      />
      {(Object.keys(TAB_COPY) as SwapType[]).map((mode) => {
        const active = value === mode;
        const copy = TAB_COPY[mode];

        return (
          <button
            aria-selected={active}
            disabled={disabled}
            key={mode}
            onClick={() => onChange(mode)}
            role="tab"
            style={{
              alignItems: "center",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "999px",
              boxSizing: "border-box",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              flex: 1,
              flexDirection: "column",
              height: "46px",
              justifyContent: "center",
              opacity: disabled ? 0.65 : 1,
              padding: "6px 12px",
              position: "relative",
              zIndex: 1,
            }}
            type="button"
          >
            <span
              style={{
                color: active ? "#1F1F1F" : "#8E8E89",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "13.2px",
                fontWeight: 500,
                lineHeight: "17px",
                transition: "color 180ms ease-out",
              }}
            >
              {copy.label}
            </span>
            <span
              style={{
                color: active ? "#8E8E89" : "#C9C9C5",
                fontFamily: '"Geist", system-ui, sans-serif',
                fontSize: "10.4px",
                lineHeight: "13px",
                transition: "color 180ms ease-out",
              }}
            >
              {copy.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
