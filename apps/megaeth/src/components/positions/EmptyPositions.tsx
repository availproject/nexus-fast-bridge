"use client";

import { useNavigate } from "react-router-dom";
import config from "../../../config";

// Floating icon component for the empty state
function FloatingIcon({
  src,
  alt,
  className,
  size = 40,
}: {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`absolute rounded-full shadow-md flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        animation: "float 3s ease-in-out infinite",
      }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}

export function EmptyPositions() {
  const navigate = useNavigate();
  const primaryColor = config.primaryColor;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Floating Icons Illustration */}
      <div className="relative w-64 h-48 mb-8">
        {/* Center Icon */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full shadow-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, #ffffff 0%, ${primaryColor}15 100%)`,
            border: `2px solid ${primaryColor}30`,
          }}
        >
          <img
            src={config.chainIconUrl}
            alt={config.chainName}
            className="w-10 h-10"
          />
        </div>

        {/* Floating Protocol Icons */}
        <FloatingIcon
          src="https://cryptologos.cc/logos/optimism-ethereum-op-logo.png"
          alt="Optimism"
          className="top-0 left-1/2 -translate-x-1/2"
          size={36}
        />
        <FloatingIcon
          src="https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png"
          alt="DAI"
          className="top-8 left-8"
          size={32}
        />
        <FloatingIcon
          src="https://cryptologos.cc/logos/ethereum-eth-logo.png"
          alt="Ethereum"
          className="top-6 right-6"
          size={38}
        />
        <FloatingIcon
          src="https://cryptologos.cc/logos/solana-sol-logo.png"
          alt="Solana"
          className="bottom-8 left-6"
          size={30}
        />
        <FloatingIcon
          src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
          alt="USDC"
          className="bottom-6 right-8"
          size={34}
        />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3">No positions</h3>

      {/* Description */}
      <p className="text-gray-500 max-w-sm mb-8">
        Looks like you don't have any active positions yet. If you think a
        position is missing try refreshing the page.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 hover:opacity-90"
          style={{
            backgroundColor: primaryColor,
            color: config.secondaryColor,
          }}
        >
          Go to FastBridge
        </button>
        <button
          onClick={() => navigate("/opportunities")}
          className="px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 border-2 hover:bg-gray-50"
          style={{
            borderColor: primaryColor,
            color: primaryColor,
          }}
        >
          View Opportunities
        </button>
      </div>

      {/* Floating animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
