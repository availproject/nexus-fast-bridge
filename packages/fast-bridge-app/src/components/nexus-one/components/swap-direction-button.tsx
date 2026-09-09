interface SwapDirectionButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export function SwapDirectionButton({
  disabled = false,
  onClick,
}: SwapDirectionButtonProps) {
  return (
    <button
      aria-label="Swap source and destination tokens"
      className="group focus-visible:outline-2 focus-visible:outline-[#3D7BFF] focus-visible:outline-offset-2"
      disabled={disabled}
      onClick={onClick}
      style={{
        alignItems: "center",
        aspectRatio: "1",
        background: "#FFFFFE",
        border: 0,
        borderRadius: "50%",
        bottom: "-0.375rem",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        justifyContent: "center",
        left: "50%",
        padding: 0,
        position: "absolute",
        transform: "translate(-50%, 50%)",
        width: "clamp(2.25rem, 10vw, 2.75rem)",
        zIndex: 2,
      }}
      title="Swap source and destination tokens"
      type="button"
    >
      <span
        style={{
          alignItems: "center",
          aspectRatio: "1",
          background: "#FFFFFE",
          borderRadius: "50%",
          boxShadow:
            "0 0 0.295rem rgba(60, 40, 100, 0.08), 0 0 1.033rem rgba(60, 40, 100, 0.06), inset 0 0.049rem 0 rgba(255, 255, 255, 0.9)",
          display: "flex",
          justifyContent: "center",
          width: "71.5%",
        }}
      >
        <svg
          aria-hidden="true"
          className="transition-transform duration-150 group-hover:rotate-180 group-disabled:transform-none motion-reduce:transition-none"
          fill="none"
          focusable="false"
          style={{ height: "45%", width: "45%" }}
          viewBox="0 0 15 15"
        >
          <path
            d="M7.08207 2.95117V11.2136M10.6231 7.67257L7.08207 11.2136L3.54102 7.67257"
            stroke="#1F1F1F"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </span>
    </button>
  );
}
