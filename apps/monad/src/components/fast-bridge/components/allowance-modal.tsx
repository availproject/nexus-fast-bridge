import { AllowanceModal } from "@fastbridge/fast-bridge-core";

export default function MonadAllowanceModal(
  props: Parameters<typeof AllowanceModal>[0],
) {
  return <AllowanceModal {...props} chainSlug="monad" />;
}
