"use client";

import { TrendingUp } from "lucide-react";
import { PositionList } from "@/components/positions/PositionList";
import { samplePositions } from "@/lib/positions-data";
import type { Position } from "@/lib/types/position";

export default function Positions() {
  const handleWithdraw = (position: Position) => {
    console.log("Withdraw from position:", position.id);
    // TODO: Implement withdraw logic
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Positions
          </h1>
          <TrendingUp className="w-8 h-8 text-gray-700" />
        </div>
        <p className="text-gray-600 max-w-xl mx-auto">
          Understand your positions across all of the DeFi apps that you
          currently have invested in
        </p>
      </div>

      {/* Positions List */}
      <PositionList positions={samplePositions} onWithdraw={handleWithdraw} />

      {/* Powered by footer */}
      <div className="flex w-full items-center gap-x-1 justify-center mt-12">
        <p
          className="text-xs md:text-sm font-light"
          style={{ color: "#666666" }}
        >
          Powered by
        </p>
        <a
          href="https://availproject.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/avail_logo.svg"
            alt="Avail Logo"
            className="w-12 md:w-16 h-auto"
            style={{ opacity: 0.5 }}
          />
        </a>
      </div>
    </div>
  );
}
