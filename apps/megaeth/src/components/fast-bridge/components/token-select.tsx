import { TokenSelect } from "@fastbridge/fast-bridge-core";

export default function MegaethTokenSelect(props: Parameters<typeof TokenSelect>[0]) {
  return <TokenSelect {...props} chainSlug="megaeth" />;
}
