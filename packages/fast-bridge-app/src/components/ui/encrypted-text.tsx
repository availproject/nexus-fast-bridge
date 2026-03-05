"use client";
import { motion, useInView } from "motion/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface EncryptedTextProps {
  /** Optional custom character set to use for the gibberish effect. */
  charset?: string;
  className?: string;
  /** CSS class for styling the encrypted/scrambled characters */
  encryptedClassName?: string;
  /**
   * Time in milliseconds between gibberish flips for unrevealed characters.
   * Lower is more jittery. Defaults to 50ms.
   */
  flipDelayMs?: number;
  /**
   * Time in milliseconds between revealing each subsequent real character.
   * Lower is faster. Defaults to 50ms per character.
   */
  revealDelayMs?: number;
  /** CSS class for styling the revealed characters */
  revealedClassName?: string;
  text: string;
}

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

function generateRandomCharacter(charset: string): string {
  const index = Math.floor(Math.random() * charset.length);
  return charset.charAt(index);
}

function generateGibberishPreservingSpaces(
  original: string,
  charset: string
): string {
  if (!original) {
    return "";
  }
  let result = "";
  for (const ch of original) {
    result += ch === " " ? " " : generateRandomCharacter(charset);
  }
  return result;
}

function shouldFlipCharacters(
  now: number,
  lastFlipTime: number,
  flipDelayMs: number
): boolean {
  return now - lastFlipTime >= Math.max(0, flipDelayMs);
}

function refreshScrambleCharacters(params: {
  charset: string;
  currentRevealCount: number;
  scrambleChars: string[];
  text: string;
}) {
  const { text, currentRevealCount, scrambleChars, charset } = params;
  for (let index = 0; index < text.length; index += 1) {
    if (index < currentRevealCount) {
      continue;
    }
    scrambleChars[index] =
      text[index] === " " ? " " : generateRandomCharacter(charset);
  }
}

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  className,
  revealDelayMs = 50,
  charset = DEFAULT_CHARSET,
  flipDelayMs = 50,
  encryptedClassName,
  revealedClassName,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  const [revealCount, setRevealCount] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastFlipTimeRef = useRef<number>(0);
  const characterEntries = useMemo(() => {
    const counts = new Map<string, number>();
    return text.split("").map((character) => {
      const nextCount = (counts.get(character) ?? 0) + 1;
      counts.set(character, nextCount);
      return {
        character,
        key: `${character}-${nextCount}`,
      };
    });
  }, [text]);
  const scrambleCharsRef = useRef<string[]>(
    text ? generateGibberishPreservingSpaces(text, charset).split("") : []
  );

  useEffect(() => {
    if (!isInView) {
      return;
    }

    // Reset state for a fresh animation whenever dependencies change
    const initial = text
      ? generateGibberishPreservingSpaces(text, charset)
      : "";
    scrambleCharsRef.current = initial.split("");
    startTimeRef.current = performance.now();
    lastFlipTimeRef.current = startTimeRef.current;
    setRevealCount(0);

    let isCancelled = false;

    const update = (now: number) => {
      if (isCancelled) {
        return;
      }

      const elapsedMs = now - startTimeRef.current;
      const totalLength = text.length;
      const currentRevealCount = Math.min(
        totalLength,
        Math.floor(elapsedMs / Math.max(1, revealDelayMs))
      );

      setRevealCount(currentRevealCount);

      if (currentRevealCount >= totalLength) {
        return;
      }

      if (shouldFlipCharacters(now, lastFlipTimeRef.current, flipDelayMs)) {
        refreshScrambleCharacters({
          text,
          currentRevealCount,
          scrambleChars: scrambleCharsRef.current,
          charset,
        });
        lastFlipTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      isCancelled = true;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInView, text, revealDelayMs, charset, flipDelayMs]);

  if (!text) {
    return null;
  }

  return (
    <motion.span aria-label={text} className={cn(className)} ref={ref}>
      {characterEntries.map(({ character, key }, index) => {
        const isRevealed = index < revealCount;
        let displayChar = character;
        if (!isRevealed) {
          if (character === " ") {
            displayChar = " ";
          } else {
            displayChar =
              scrambleCharsRef.current[index] ??
              generateRandomCharacter(charset);
          }
        }

        return (
          <span
            className={cn(isRevealed ? revealedClassName : encryptedClassName)}
            key={key}
          >
            {displayChar}
          </span>
        );
      })}
    </motion.span>
  );
};
