"use client";

import { OpportunityList } from "@/components/opportunities/OpportunityList";
import { sampleOpportunities } from "@/lib/opportunities-data";

export default function Opportunities() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          DeFi Opportunities
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto mb-4">
          Explore yield-generating opportunities across multiple chains. Deposit
          once, earn continuously.
        </p>
        <p className="text-xs text-gray-400 max-w-lg mx-auto">
          ⚠️ These are third-party platforms. APY rates are indicative and may
          change based on market conditions.
        </p>
      </div>

      {/* Opportunities List */}
      <OpportunityList opportunities={sampleOpportunities} />

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
