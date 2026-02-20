import React from "react";
import { ChevronDownIcon, ChevronUpIcon } from "./icons";
import { Skeleton } from "../../ui/skeleton";
import { usdFormatter } from "../../common";

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: string;
  valueSuffix?: string;
  showBreakdown?: boolean;
  loading?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  children?: React.ReactNode;
}

function SummaryCard({
  icon,
  title,
  subtitle,
  value,
  valueSuffix,
  showBreakdown,
  loading = false,
  expanded = false,
  onToggleExpand,
  children,
}: SummaryCardProps) {
  return (
    <div className="border-t border-border py-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-start">
          <div className="mt-0.5">{icon}</div>
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-sm leading-4.5 text-card-foreground font-medium">
              {title}
            </span>
            {subtitle && (
              <span className="font-sans text-[13px] leading-4.5 text-muted-foreground w-40 truncate">
                {subtitle}
              </span>
            )}
            {showBreakdown && (
              <button
                className="flex gap-1 items-center mt-0.5 hover:text-card-foreground transition-colors group"
                onClick={onToggleExpand}
              >
                <span className="font-sans text-[13px] leading-4.5 text-muted-foreground group-hover:text-card-foreground transition-colors">
                  View details
                </span>
                {expanded ? (
                  <ChevronUpIcon
                    size={14}
                    className="text-muted-foreground group-hover:text-card-foreground transition-colors"
                  />
                ) : (
                  <ChevronDownIcon
                    size={14}
                    className="text-muted-foreground group-hover:text-card-foreground transition-colors"
                  />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          {loading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-display text-card-foreground tracking-[0.36px] leading-4.5 font-medium">
                {valueSuffix === "USD"
                  ? usdFormatter.format(parseFloat(value))
                  : value}
              </span>
              {valueSuffix && (
                <span className="text-muted-foreground text-[13px] leading-4.5">
                  {valueSuffix}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {expanded && children && (
        <div className="mt-3 pt-3 border-t border-border/50">{children}</div>
      )}
    </div>
  );
}

export default SummaryCard;
