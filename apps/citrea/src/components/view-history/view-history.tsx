import { ViewHistory as CoreViewHistory } from "@fastbridge/fast-bridge-core";
import { getChainRuntimeConfig } from "@fastbridge/chain-runtime-config";

const runtimeConfig = getChainRuntimeConfig("citrea");

export default function ViewHistory(props: Parameters<typeof CoreViewHistory>[0]) {
  return (
    <CoreViewHistory
      {...props}
      logoOverridesByChainId={runtimeConfig.fastBridge.logoOverridesByChainId}
    />
  );
}
