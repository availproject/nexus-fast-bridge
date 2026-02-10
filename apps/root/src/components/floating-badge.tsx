import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

function FloatingBadge() {
  return (
    <motion.div
      className="inline-flex cursor-default items-center gap-2 rounded-full border border-[var(--blue-200)] bg-[var(--background-brand)] px-4 py-2 text-[13px] font-semibold text-[var(--foreground-brand)]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      whileHover={{ scale: 1.05 }}
    >
      <Sparkles size={14} />
      <span>Fast & Secure</span>
    </motion.div>
  );
}

export default FloatingBadge;
