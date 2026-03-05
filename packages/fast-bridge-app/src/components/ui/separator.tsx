"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Separator({ className, ...props }: ComponentProps<"hr">) {
  return (
    <hr
      className={cn("my-2 h-px w-full bg-border", className)}
      data-slot="separator"
      {...props}
    />
  );
}

export { Separator };
