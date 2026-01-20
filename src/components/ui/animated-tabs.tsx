"use client";

import { useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import config from "../../../config";

interface Tab {
  id: string;
  label: string;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: AnimatedTabsProps) {
  const [selectedTab, setSelectedTab] = useState(activeTab);

  // Sync with external activeTab when it changes (e.g., browser back/forward)
  useEffect(() => {
    setSelectedTab(activeTab);
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    setSelectedTab(tabId);
    // Delay navigation slightly to allow animation to start smoothly
    requestAnimationFrame(() => {
      onTabChange(tabId);
    });
  };

  return (
    <LayoutGroup>
      <div
        className={cn(
          "relative inline-flex items-center justify-center rounded-full p-1 border border-gray-200/50",
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative z-10 px-6 py-2 text-sm font-medium rounded-full bg-transparent"
              style={{ color: isActive ? config.secondaryColor : "#6b7280" }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: config.primaryColor }}
                  transition={{
                    type: "tween",
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
