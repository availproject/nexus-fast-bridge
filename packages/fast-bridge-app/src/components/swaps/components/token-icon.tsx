"use client";

import { cn } from "@/lib/utils";

type TokenIconSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<TokenIconSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

interface TokenIconProps {
  chainLogo?: string;
  className?: string;
  size?: TokenIconSize;
  symbol?: string;
  tokenLogo?: string;
}

export const TokenIcon = ({
  symbol,
  tokenLogo,
  chainLogo,
  size = "md",
  className,
}: TokenIconProps) => {
  const dimension = SIZE_MAP[size];

  return (
    <span className={cn("relative inline-flex", className)}>
      {tokenLogo ? (
        <img
          alt={symbol ?? "token"}
          className={cn("rounded-full object-cover")}
          height={dimension}
          src={tokenLogo}
          width={dimension}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-ring/80 font-semibold text-muted-foreground uppercase",
            {
              "h-6 w-6 text-xs": size === "sm",
              "h-8 w-8 text-sm": size === "md",
              "h-10 w-10 text-base": size === "lg",
            }
          )}
        >
          {" "}
        </span>
      )}
      {chainLogo ? (
        <span className="absolute -right-0.5 -bottom-0.5 rounded-full border border-background bg-background">
          <img
            alt="chain logo"
            className="rounded-full object-cover"
            height={Math.max(14, dimension * 0.4)}
            src={chainLogo}
            width={Math.max(14, dimension * 0.4)}
          />
        </span>
      ) : (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-ring font-semibold text-muted-foreground uppercase"
          )}
        >
          {" "}
        </span>
      )}
    </span>
  );
};
