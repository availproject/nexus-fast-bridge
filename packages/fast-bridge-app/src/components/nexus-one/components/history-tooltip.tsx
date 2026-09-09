import { Arrow, Content, Portal } from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";
import { Tooltip, TooltipTrigger } from "../../ui/tooltip";

export function HistoryTooltip({ children }: { children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <Portal>
        <Content
          align="end"
          avoidCollisions={false}
          className="fade-in-0 slide-in-from-bottom-1 z-[1000] min-w-[9.875rem] shrink-0 animate-in whitespace-nowrap rounded-[0.5rem] bg-white px-2.5 py-[0.5625rem] text-center font-medium text-[#111827] text-xs leading-4 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1 motion-reduce:animate-none"
          side="top"
          sideOffset={8}
          style={{
            fontFamily: '"Geist", system-ui, sans-serif',
          }}
        >
          View Transaction History
          <Arrow className="h-[0.3125rem] w-[0.625rem] fill-white" />
        </Content>
      </Portal>
    </Tooltip>
  );
}
