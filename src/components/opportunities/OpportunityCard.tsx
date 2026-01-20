"use client";

import type { Opportunity } from "@/lib/types/opportunity";
import { ArrowRight, Zap } from "lucide-react";
import config from "../../../config";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick?: (opportunity: Opportunity) => void;
}

export function OpportunityCard({
  opportunity,
  onClick,
}: OpportunityCardProps) {
  const { title, description, tags, apy, proceedText, logic } = opportunity;
  const token = logic.tokens.destination;
  const protocol = tags?.[0] || "DeFi";
  const chain = token.chain.network;

  // Generate gradient based on primary color
  const primaryColor = config.primaryColor;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onClick?.(opportunity)}
    >
      {/* Gradient Header */}
      <div
        className="relative h-20 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}40 0%, ${primaryColor}20 15%, #ffffff 50%, ${primaryColor}20 85%, ${primaryColor}40 100%)`,
        }}
      >
        {/* Protocol Icon */}
        <div className="absolute top-3 right-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}80 0%, ${primaryColor} 100%)`,
            }}
          >
            {token.icon ? (
              <img
                src={token.icon}
                alt={token.symbol}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <Zap className="w-5 h-5 text-white" />
            )}
          </div>
        </div>

        {/* APY Badge */}
        {apy && (
          <div className="absolute top-3 left-4">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {apy} APY
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Protocol & Chain */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 capitalize">
                {protocol} • {chain}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 group-hover:gap-2"
            style={{
              backgroundColor: primaryColor,
              color: config.secondaryColor,
            }}
          >
            <span className="hidden sm:inline">{proceedText}</span>
            <span className="sm:hidden">Invest</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
