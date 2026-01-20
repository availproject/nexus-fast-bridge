"use client";

import type { Position } from "@/lib/types/position";
import config from "../../../config";

interface PositionCardProps {
  position: Position;
  onWithdraw?: (position: Position) => void;
}

export function PositionCard({ position, onWithdraw }: PositionCardProps) {
  const {
    protocol,
    chain,
    token,
    currentValue,
    totalDeposits,
    depositedUsd,
    currentValueUsd,
    returnRate,
    returnType,
    interestRates,
  } = position;

  const primaryColor = config.primaryColor;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Header with gradient */}
      <div
        className="p-4"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}40 0%, ${primaryColor}20 15%, #ffffff 50%, ${primaryColor}20 85%, ${primaryColor}40 100%)`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Token Icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            {token.icon ? (
              <img
                src={token.icon}
                alt={token.symbol}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <span
                className="text-sm font-bold"
                style={{ color: primaryColor }}
              >
                {token.symbol.slice(0, 2)}
              </span>
            )}
          </div>
          {/* Protocol & Chain */}
          <div>
            <h3 className="font-semibold text-gray-900">
              {protocol} {token.symbol}
            </h3>
            <p className="text-xs text-gray-500">{chain}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        {/* Value Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Value</p>
            <p className="text-lg font-bold text-gray-900">
              {currentValue}{" "}
              <span className="text-sm font-normal">{token.symbol}</span>
            </p>
            {currentValueUsd && (
              <p className="text-xs text-gray-400">~${currentValueUsd} USD</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Deposits</p>
            <p className="text-lg font-bold text-gray-900">
              {totalDeposits}{" "}
              <span className="text-sm font-normal">{token.symbol}</span>
            </p>
            {depositedUsd && (
              <p className="text-xs text-gray-400">~${depositedUsd} USD</p>
            )}
          </div>
        </div>

        {/* Return & Interest Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Return</p>
            <p className="text-lg font-bold" style={{ color: primaryColor }}>
              {returnRate}{" "}
              <span className="text-sm font-normal text-gray-500">
                {returnType}
              </span>
            </p>
          </div>
          {interestRates && interestRates.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Interest Rates</p>
              <div className="flex gap-2 flex-wrap">
                {interestRates.map((rate) => (
                  <div key={rate.period} className="text-center">
                    <p
                      className="text-sm font-bold"
                      style={{ color: primaryColor }}
                    >
                      {rate.rate}
                    </p>
                    <p className="text-xs text-gray-400">{rate.period}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Withdraw Button */}
        <button
          onClick={() => onWithdraw?.(position)}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90"
          style={{
            backgroundColor: primaryColor,
            color: config.secondaryColor,
          }}
        >
          WITHDRAW
        </button>
      </div>
    </div>
  );
}
