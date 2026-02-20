"use client";

import type { RFF } from "@avail-project/nexus-core";
import { Clock, LoaderPinwheel, SquareArrowOutUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { TOKEN_IMAGES } from "../common";
import useViewHistory from "./hooks/useViewHistory";

const SourceChains = ({ sources }: { sources: RFF["sources"] }) => {
  const sourceList = sources ?? [];
  return (
    <div className="flex items-center">
      {sourceList.map((source, index) => (
        <div
          className={cn(
            "rounded-full transition-transform hover:scale-110",
            index > 0 && "-ml-2"
          )}
          key={source?.chain?.id}
          style={{ zIndex: sourceList.length - index }}
        >
          <img
            alt={source?.chain?.name}
            className="rounded-full"
            height={24}
            src={source?.chain?.logo}
            width={24}
          />
        </div>
      ))}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const getVariant = (status: string) => {
    if (status === "Fulfilled") {
      return "default";
    }
    if (status === "Deposited") {
      return "secondary";
    }
    if (status === "Refunded") {
      return "outline";
    }
    if (status === "Failed") {
      return "destructive";
    }
    return "default";
  };

  return (
    <Badge className="px-3 py-1" variant={getVariant(status)}>
      <p className="font-semibold text-xs tracking-wide">{status}</p>
    </Badge>
  );
};

const DestinationToken = ({
  destination,
}: {
  destination: RFF["destinations"];
}) => {
  return (
    <div className="flex items-center">
      {destination.map((dest, index) => (
        <div
          className={cn(
            "rounded-full transition-transform hover:scale-110",
            index > 0 && "-ml-2"
          )}
          key={dest.token.symbol}
          style={{ zIndex: destination.length - index }}
        >
          <img
            alt={dest.token.symbol}
            className="rounded-full"
            height={24}
            src={TOKEN_IMAGES[dest.token.symbol]}
            width={24}
          />
        </div>
      ))}
    </div>
  );
};

const ViewHistory = ({
  viewAsModal = true,
  className,
  refreshNonce,
}: {
  viewAsModal?: boolean;
  className?: string;
  refreshNonce?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    history,
    loadError,
    displayedHistory,
    hasMore,
    isLoadingMore,
    getStatus,
    observerTarget,
    refreshHistory,
    ITEMS_PER_PAGE,
    formatExpiryDate,
  } = useViewHistory();

  useEffect(() => {
    if (!(viewAsModal && isOpen)) {
      return;
    }
    void refreshHistory();
  }, [isOpen, refreshHistory, viewAsModal]);

  useEffect(() => {
    if (!refreshNonce) {
      return;
    }
    void refreshHistory();
  }, [refreshHistory, refreshNonce]);

  const renderHistoryContent = () => {
    if (displayedHistory.length > 0) {
      return (
        <>
          {displayedHistory?.map((pastIntent) => (
            <Card
              className="gap-3 border-border/50 p-4 transition-shadow duration-200 hover:shadow-md"
              key={pastIntent.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <DestinationToken destination={pastIntent?.destinations} />
                  <div className="flex flex-col">
                    <p className="font-medium text-sm">
                      {pastIntent?.destinations
                        .map((d) => d?.token?.symbol)
                        .join(", ")}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Intent #{pastIntent?.id}
                    </p>
                  </div>
                </div>
                <StatusBadge status={getStatus(pastIntent)} />
              </div>

              <Separator className="my-1" />

              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex w-full flex-1 items-center justify-between gap-x-3 sm:min-w-fit">
                  <SourceChains sources={pastIntent?.sources} />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-px w-8 bg-border" />
                    <span className="text-xs">→</span>
                    <div className="h-px w-8 bg-border" />
                  </div>
                  <div className="rounded-full hover:scale-110">
                    <img
                      alt={pastIntent?.destinationChain?.name}
                      className="rounded-full"
                      height={24}
                      src={pastIntent?.destinationChain?.logo ?? ""}
                      width={24}
                    />
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-x-2 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-muted-foreground text-xs">Expiry</p>
                    <p className="font-medium text-xs">
                      {formatExpiryDate(pastIntent?.expiry)}
                    </p>
                  </div>
                  <a
                    href={pastIntent?.explorerUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Button size="icon" variant="outline">
                      <SquareArrowOutUpRight className="size-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}

          {hasMore && (
            <div className="flex justify-center py-4" ref={observerTarget}>
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LoaderPinwheel className="size-4 animate-spin" />
                  <span className="text-sm">Loading more...</span>
                </div>
              )}
            </div>
          )}

          {!hasMore && displayedHistory?.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center py-4">
              <p className="text-muted-foreground text-sm">
                No more transactions to load
              </p>
            </div>
          )}
        </>
      );
    }

    if (history === null) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
            <LoaderPinwheel className="relative size-12 animate-spin text-primary" />
          </div>
          <div className="space-y-1 text-center">
            <p className="font-medium text-base">Loading your history</p>
            <p className="text-muted-foreground text-sm">
              Fetching your past transactions...
            </p>
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Clock className="size-16 text-muted-foreground/30" />
          <div className="space-y-1 text-center">
            <p className="font-medium text-base">Unable to load history</p>
            <p className="text-muted-foreground text-sm">{loadError}</p>
          </div>
          <Button
            onClick={() => {
              void refreshHistory();
            }}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Clock className="size-16 text-muted-foreground/30" />
        <div className="space-y-1 text-center">
          <p className="font-medium text-base">No history yet</p>
          <p className="text-muted-foreground text-sm">
            Your transaction history will appear here
          </p>
        </div>
      </div>
    );
  };

  if (!viewAsModal) {
    return (
      <div className="no-scrollbar flex max-h-96 w-full max-w-md flex-col gap-y-3 overflow-y-auto">
        {renderHistoryContent()}
      </div>
    );
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn("group relative", className)}
          size="icon"
          variant="ghost"
        >
          <Clock className="size-5 text-primary transition-transform group-hover:scale-110" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="font-semibold text-2xl">
            Transaction History
          </DialogTitle>
        </DialogHeader>
        <div className="no-scrollbar flex max-h-96 w-full flex-col gap-y-3 overflow-y-auto">
          {renderHistoryContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewHistory;
