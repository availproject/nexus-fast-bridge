import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { PreviewPanel as CorePreviewPanel } from "@fastbridge/fast-bridge-core";
import config from "../../config";

interface PreviewPanelProps {
  children: ReactNode;
}

export function PreviewPanel({ children }: Readonly<PreviewPanelProps>) {
  const { status, connector, address } = useAccount();

  return (
    <CorePreviewPanel
      chainGifUrl={config.chainGifUrl}
      chainGifAlt={config.chainGifAlt}
      heroText={config.heroText}
      wallet={{ status, connector, address }}
    >
      {children}
    </CorePreviewPanel>
  );
}
