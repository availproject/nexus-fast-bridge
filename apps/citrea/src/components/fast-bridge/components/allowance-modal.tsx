import { AllowanceModal } from "@fastbridge/fast-bridge-core";

export default function CitreaAllowanceModal(
  props: Parameters<typeof AllowanceModal>[0],
) {
  return <AllowanceModal {...props} chainSlug="citrea" />;
}
