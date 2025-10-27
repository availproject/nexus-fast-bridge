import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import HeroSection from "@/components/hero-section";
import config from "../../config";

export default function Home() {
  return (
    <div className="font-sans flex max-h-screen py-12 gap-16">
      <div className="min-h-screen w-full relative">
        {/* Radial Gradient Background from Top */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${config.primaryColor} 125%)`,
          }}
        />
        {/* Your Content/Components */}
        <main className="flex flex-col flex-1 px-4 gap-8">
          <HeroSection />
          <FastBridgeShowcase />
        </main>
      </div>
    </div>
  );
}
