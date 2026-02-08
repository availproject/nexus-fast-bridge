import { ViewHistory as CoreViewHistory } from "@fastbridge/fast-bridge-core";

export default function ViewHistory(props: Parameters<typeof CoreViewHistory>[0]) {
  return <CoreViewHistory {...props} />;
}
