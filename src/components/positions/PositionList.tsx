"use client";

import { useState } from "react";
import type { Position } from "@/lib/types/position";
import { PositionCard } from "./PositionCard";
import { EmptyPositions } from "./EmptyPositions";
import config from "../../../config";

type CategoryFilter = "all" | "lending" | "staking" | "borrowing";

interface PositionListProps {
  positions: Position[];
  onWithdraw?: (position: Position) => void;
}

export function PositionList({ positions, onWithdraw }: PositionListProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "lending", label: "Lending" },
    { id: "staking", label: "Staking" },
    { id: "borrowing", label: "Borrowing" },
  ];

  const filteredPositions =
    activeCategory === "all"
      ? positions
      : positions.filter((p) => p.category === activeCategory);

  const primaryColor = config.primaryColor;

  // Show empty state when no positions at all
  if (positions.length === 0) {
    return <EmptyPositions />;
  }

  return (
    <div className="space-y-6">
      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap justify-center">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className="px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200"
            style={{
              backgroundColor:
                activeCategory === category.id ? primaryColor : "transparent",
              color:
                activeCategory === category.id
                  ? config.secondaryColor
                  : "#6b7280",
              borderColor:
                activeCategory === category.id ? primaryColor : "#e5e7eb",
            }}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {filteredPositions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {activeCategory} positions found
          </div>
        ) : (
          filteredPositions.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              onWithdraw={onWithdraw}
            />
          ))
        )}
      </div>
    </div>
  );
}
