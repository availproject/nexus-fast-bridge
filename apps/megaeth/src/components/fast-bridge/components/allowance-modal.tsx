import { AllowanceModal } from "@fastbridge/fast-bridge-core";

export default function MegaethAllowanceModal(
  props: Parameters<typeof AllowanceModal>[0],
) {
  return <AllowanceModal {...props} chainSlug="megaeth" />;
}
