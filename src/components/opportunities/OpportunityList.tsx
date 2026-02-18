"use client";

import type { Opportunity } from "@/lib/types/opportunity";
import { OpportunityCard } from "./OpportunityCard";

interface OpportunityListProps {
  opportunities: Opportunity[];
  onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function OpportunityList({
  opportunities,
  onOpportunityClick,
}: OpportunityListProps) {
  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No opportunities available
        </h3>
        <p className="text-sm text-gray-500">
          Check back later for new DeFi opportunities
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {opportunities.map((opportunity) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onClick={onOpportunityClick}
        />
      ))}
    </div>
  );
}
