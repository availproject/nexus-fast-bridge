import { motion } from "motion/react";
function AnimatedTitle({ text }: { text: string }) {
  const letters = text.split("");

  return (
    <h1 className="relative inline-flex flex-wrap items-center justify-center gap-[2px] text-[28px] leading-[1.15] font-bold tracking-[-0.02em] text-[var(--foreground-primary)] [font-family:var(--font-display)] md:[font-size:clamp(32px,5vw,52px)]">
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 30, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.2 + index * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block"
          whileHover={{
            scale: 1.2,
            rotate: [0, -5, 5, 0],
            color: "var(--foreground-brand)",
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </h1>
  );
}
export default AnimatedTitle;
