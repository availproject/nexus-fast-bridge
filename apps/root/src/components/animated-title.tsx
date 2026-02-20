import { motion } from "motion/react";

function AnimatedTitle({ text }: { text: string }) {
  const letters = text.split("");
  const letterOccurrenceByValue = new Map<string, number>();
  const letterEntries = letters.map((letter) => {
    const occurrence = (letterOccurrenceByValue.get(letter) ?? 0) + 1;
    letterOccurrenceByValue.set(letter, occurrence);
    return {
      key: `${letter}-${occurrence}`,
      letter,
    };
  });

  return (
    <h1 className="relative inline-flex flex-wrap items-center justify-center gap-[2px] font-bold text-[28px] text-[var(--foreground-primary)] leading-[1.15] tracking-[-0.02em] [font-family:var(--font-display)] md:[font-size:clamp(32px,5vw,52px)]">
      {letterEntries.map(({ key, letter }, index) => (
        <motion.span
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          className="inline-block"
          initial={{ opacity: 0, y: 30, rotateX: -90 }}
          key={key}
          transition={{
            duration: 0.5,
            delay: 0.2 + index * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
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
