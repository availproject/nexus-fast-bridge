import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import AvailLogo from "/avail_logo.svg";
import { chains } from "./chains";
import ChainCard from "./components/chain-card";
import FloatingLogos from "./components/floating-logos";
import SocialGlyph from "./components/social-glyph";
import { AuroraText } from "./components/ui/aurora-text";
import { SOCIAL_LINKS } from "./lib/constant";

const socialLinkClassName =
  "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(32,34,36)] text-white transition-[transform,background-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_4px_12px_rgba(32,34,36,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] md:h-8 md:w-8";

export default function App() {
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative z-[1] flex min-h-screen flex-col p-0">
      {/* Navbar */}
      <motion.nav
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-[100] flex items-center justify-between border-[var(--border-default)] border-b bg-[var(--background-primary)] px-4 py-3 md:px-8 md:py-4"
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div
          className="flex cursor-pointer items-center gap-3 no-underline"
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          <img
            alt="Avail"
            className="h-7 w-auto"
            height={28}
            src={AvailLogo}
            width={120}
          />
          <div className="h-6 w-px bg-[var(--border-default)]" />
          <span className="hidden font-semibold text-[15px] text-[var(--foreground-primary)] tracking-[-0.01em] [font-family:var(--font-display)] md:inline">
            Avail FastBridge
          </span>
        </motion.div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        animate={{ opacity: 1 }}
        className="relative min-h-70 overflow-hidden border-(--border-default) border-b bg-(--background-primary) px-5 pt-14 pb-10 text-center md:min-h-90 md:px-8 md:pt-20 md:pb-14"
        initial={{ opacity: 0 }}
        ref={heroRef}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Floating logos background */}
        <FloatingLogos mousePosition={mousePosition} />

        <div className="relative z-2 mx-auto mt-12 max-w-180 bg-[radial-gradient(closest-side,var(--background-primary)_85%,transparent_100%)]">
          <h1 className="relative inline-flex flex-wrap items-center justify-center gap-0.5 font-bold text-(--foreground-primary) text-[28px] leading-[1.15] tracking-[-0.02em] [font-family:var(--font-display)] md:text-[clamp(52px,6vw,72px)]">
            <AuroraText>Avail FastBridge</AuroraText>
          </h1>
          <h2 className="text-center font-medium text-[18px] text-[var(--foreground-primary)] md:text-[clamp(20px,3vw,32px)]">
            Fast Crypto Bridge for Stables Across Chains
          </h2>
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 max-w-140 text-balance p-4 text-center font-normal text-(--foreground-secondary) text-[15px] leading-[1.6] [font-family:var(--font-body)]! md:text-[17px]"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <strong>Avail FastBridge is fast.</strong> <br />
            Bridge stablecoins like USDC, USDT and others across 15+ chains in
            seconds with no wrapping and no complexity. It's a secure,
            multi-chain bridge powered by Avail Nexus.
          </motion.p>
        </div>
      </motion.section>

      {/* Chain Grid */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8 md:py-12">
        <h2 className="mb-6 text-center font-bold text-2xl text-[var(--foreground-primary)]">
          Bridge Stablecoins to Any Chain
        </h2>
        <div className="mb-16 grid grid-cols-1 gap-4 md:gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
          {chains.map((chain, index) => {
            return <ChainCard chain={chain} index={index} key={chain.slug} />;
          })}
        </div>

        <section className="mx-auto max-w-4xl space-y-6 text-[var(--foreground-secondary)]">
          <div className="space-y-6">
            <h2 className="text-center font-bold text-2xl text-[var(--foreground-primary)] md:text-3xl">
              Why Use Avail FastBridge as Your Multi-Chain Bridge
            </h2>

            <div className="space-y-6 text-[var(--foreground-secondary)] text-base leading-relaxed md:text-lg">
              <p>
                Avail FastBridge is the quickest way to move your assets between
                chains. In a single transaction you can instantly{" "}
                <strong>bridge USDC across multiple chains</strong>.
              </p>

              <p>
                It&rsquo;s one of the few{" "}
                <strong>multi-chain, and multi-transaction bridges</strong>{" "}
                enabling you to move assets freely in a single transaction
                between major ecosystems like Ethereum, Base, Arbitrum,
                Optimism, and emerging L2s such as MegaETH, Citrea, and Monad.
              </p>

              <p>
                Avail FastBridge specializes in{" "}
                <strong>cross-chain bridging</strong> for quick and seamless{" "}
                <strong>stablecoin transfers</strong>, ensuring your liquidity
                is never fragmented. Experience the speed of a true{" "}
                <strong>fast crypto bridge</strong> that eliminates the
                complexities of wrapping and waiting.
              </p>

              <p>
                Powered by Avail Nexus, providing uncompromised security and
                seamless interoperability for the decentralized age.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-6 shadow-sm transition-all hover:shadow-md">
              <h3 className="mb-3 font-semibold text-[var(--foreground-primary)] text-lg">
                Supported Chains
              </h3>
              <p className="text-[var(--foreground-secondary)] text-sm leading-relaxed">
                MegaETH, Citrea, Monad, Ethereum, Arbitrum, Optimism, Base,
                Scroll, Polygon, Avalanche, and more.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-6 shadow-sm transition-all hover:shadow-md">
              <h3 className="mb-3 font-semibold text-[var(--foreground-primary)] text-lg">
                Supported Tokens
              </h3>
              <p className="text-[var(--foreground-secondary)] text-sm leading-relaxed">
                USDC, USDT, USDM, ETH and native assets.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-6 shadow-sm transition-all hover:shadow-md">
              <h3 className="mb-3 font-semibold text-[var(--foreground-primary)] text-lg">
                Key Features
              </h3>
              <ul className="list-inside list-disc space-y-1 text-[var(--foreground-secondary)] text-sm leading-relaxed">
                <li>Atomic settlement speed</li>
                <li>Avail Nexus security</li>
                <li>Zero slippage on stablecoins</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] border-[var(--border-default)] border-t bg-[var(--background-primary)] px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:px-8 md:py-6"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="mx-auto w-full max-w-[460px] rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-4 py-4 md:hidden">
          <div className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ opacity: 1 }}
              className="text-[var(--foreground-muted)] text-sm"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.8 }}
            >
              Powered by
            </motion.span>
            <motion.a
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex min-h-11 items-center gap-2 rounded-[100px] border border-[var(--border-default)] bg-[var(--background-primary)] px-[14px] py-2 font-medium text-[var(--foreground-primary)] text-sm no-underline transition-[transform,background-color,border-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:border-[var(--blue-300)] hover:bg-[var(--background-tertiary)] hover:shadow-[0_4px_12px_hsla(214,92%,48%,0.15)] focus-visible:outline-2 focus-visible:outline-[var(--blue-500)] focus-visible:outline-offset-2"
              href="https://availproject.org"
              initial={{ opacity: 0, x: -10 }}
              rel="noopener noreferrer"
              target="_blank"
              transition={{ delay: 0.9 }}
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                alt="Avail"
                className="h-4 w-auto"
                height={16}
                src={AvailLogo}
                width={68}
              />
              <ExternalLink size={12} />
            </motion.a>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <motion.a
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[100px] border border-[var(--border-default)] bg-[var(--background-primary)] px-[14px] py-2 font-medium text-[var(--foreground-primary)] text-sm no-underline transition-[transform,background-color,border-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:border-[var(--blue-300)] hover:bg-[var(--background-tertiary)] hover:shadow-[0_4px_12px_hsla(214,92%,48%,0.15)] focus-visible:outline-2 focus-visible:outline-[var(--blue-500)] focus-visible:outline-offset-2"
              href="https://discord.com/invite/AvailProject"
              initial={{ opacity: 0, x: -10 }}
              rel="noopener noreferrer"
              target="_blank"
              transition={{ delay: 0.85 }}
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                alt=""
                aria-hidden="true"
                className="h-4 w-4 object-contain"
                height={16}
                src="/Discord-Symbol-Black.png"
                width={16}
              />
              <span>Discord</span>
            </motion.a>

            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--background-primary)] px-2 py-1.5"
              initial={{ opacity: 0, x: 10 }}
              transition={{ delay: 1 }}
            >
              {SOCIAL_LINKS.map((social) => (
                <a
                  aria-label={social.label}
                  className={socialLinkClassName}
                  href={social.href}
                  key={social.id}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <SocialGlyph id={social.id} />
                </a>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-[1200px] md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <motion.a
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex min-h-11 items-center gap-2 rounded-[100px] border border-[var(--border-default)] bg-[var(--background-primary)] px-[14px] py-2 font-medium text-[var(--foreground-primary)] text-sm no-underline transition-[transform,background-color,border-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:border-[var(--blue-300)] hover:bg-[var(--background-tertiary)] hover:shadow-[0_4px_12px_hsla(214,92%,48%,0.15)] focus-visible:outline-2 focus-visible:outline-[var(--blue-500)] focus-visible:outline-offset-2 md:justify-self-start"
            href="https://discord.com/invite/AvailProject"
            initial={{ opacity: 0, x: -10 }}
            rel="noopener noreferrer"
            target="_blank"
            transition={{ delay: 0.85 }}
            whileHover={{
              scale: 1.05,
              y: -2,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              alt=""
              aria-hidden="true"
              className="h-3.5 w-3.5 object-contain"
              height={14}
              src="/Discord-Symbol-Black.png"
              width={14}
            />
            <span>Discord</span>
          </motion.a>

          <div className="flex items-center justify-center gap-2 md:justify-self-center">
            <motion.span
              animate={{ opacity: 1 }}
              className="text-[var(--foreground-muted)] text-sm"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.8 }}
            >
              Powered by
            </motion.span>
            <motion.a
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex min-h-11 items-center gap-2 rounded-[100px] border border-[var(--border-default)] bg-[var(--background-primary)] px-[14px] py-2 font-medium text-[var(--foreground-primary)] text-sm no-underline transition-[transform,background-color,border-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:border-[var(--blue-300)] hover:bg-[var(--background-tertiary)] hover:shadow-[0_4px_12px_hsla(214,92%,48%,0.15)] focus-visible:outline-2 focus-visible:outline-[var(--blue-500)] focus-visible:outline-offset-2"
              href="https://availproject.org"
              initial={{ opacity: 0, x: -10 }}
              rel="noopener noreferrer"
              target="_blank"
              transition={{ delay: 0.9 }}
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                alt="Avail"
                className="h-4 w-auto"
                height={16}
                src={AvailLogo}
                width={68}
              />
              <ExternalLink size={12} />
            </motion.a>
          </div>

          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 md:justify-self-end"
            initial={{ opacity: 0, x: 10 }}
            transition={{ delay: 1 }}
          >
            <span className="font-medium text-[rgb(167,167,167)] text-sm leading-5">
              Socials
            </span>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  aria-label={social.label}
                  className={socialLinkClassName}
                  href={social.href}
                  key={`desktop-${social.id}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <SocialGlyph id={social.id} />
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}
