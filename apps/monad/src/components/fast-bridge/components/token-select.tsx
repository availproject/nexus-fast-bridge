import { TokenSelect } from "@fastbridge/fast-bridge-core";

export default function MonadTokenSelect(props: Parameters<typeof TokenSelect>[0]) {
  return <TokenSelect {...props} chainSlug="monad" />;
}
