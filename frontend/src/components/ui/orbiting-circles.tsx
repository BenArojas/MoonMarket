import React from 'react';
import { cn } from "@/lib/utils";

interface OrbitingCirclesProps {
  className?: string;
  children: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
}

export default function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  const childrenArray = React.Children.toArray(children);
  const numberOfChildren = childrenArray.length;

  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 w-full h-full"
        >
          <circle
            className="stroke-white/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      {childrenArray.map((child, index) => {
        const angle = (index / numberOfChildren) * 360;
        return (
          <div
            key={index}
            style={{
              '--duration': `${duration}s`,
              '--radius': `${radius}px`,
              '--angle': `${angle}deg`,
            } as React.CSSProperties}
            className={cn(
              "absolute flex items-center justify-center",
              "animate-multi-orbit",
              { "[animation-direction:reverse]": reverse },
              { [`[animation-delay:${delay}s]`]: delay !== 0 },
              className
            )}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}