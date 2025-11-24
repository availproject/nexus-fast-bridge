"use client";
import * as React from "react";

interface CountdownTimerProps {
  targetDate: Date;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  React.useEffect(() => {
    if (!targetDate || isNaN(targetDate.getTime())) {
      console.error("Invalid target date provided to CountdownTimer");
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <div className="flex gap-4 sm:gap-6 md:gap-8">
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {String(timeLeft.days).padStart(2, "0")}
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground uppercase tracking-wide">
            Days
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {String(timeLeft.hours).padStart(2, "0")}
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground uppercase tracking-wide">
            Hours
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {String(timeLeft.minutes).padStart(2, "0")}
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground uppercase tracking-wide">
            Minutes
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold">
            {String(timeLeft.seconds).padStart(2, "0")}
          </div>
          <div className="text-xs sm:text-sm md:text-base text-muted-foreground uppercase tracking-wide">
            Seconds
          </div>
        </div>
      </div>
    </div>
  );
};

