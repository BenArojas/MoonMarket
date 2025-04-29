import { interpolate } from "flubber";
import { animated, useSpring, config, to } from "@react-spring/web";
import * as d3 from "d3";
import { useMemo, useRef } from "react";

interface ShapeRendererProps {
  path: string;
  color: string;
  index: number;
}

export const ShapeRenderer = ({ path, color, index }: ShapeRendererProps) => {
  const currD = useRef<string>(path);

  // Type the interpol  interpolator function from flubber
  const pathInterpolator = useMemo<((t: number) => string)>(
    () => interpolate(currD.current, path),
    [path]
  );

  // Define spring props with explicit types
  const springProps = useSpring({
    t: currD.current !== path ? 1 : 0, // Reset t to 0 when path changes
    opacity: 1,
    from: { t: currD.current !== path ? 0 : 1, opacity: 0 },
    config: config.molasses,
    onRest: () => {
      currD.current = path; // Update currD.current when animation completes
    },
  });

  // Create holographic gradient
  const gradientId = `holographicGradient-${index}`;
  const glowId = `glow-${index}`;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={d3.color(color)!.brighter(1).toString()} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={d3.color(color)!.darker(1).toString()} />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <animated.path
        d={to(springProps.t, pathInterpolator)}
        opacity={springProps.opacity}
        fill={`url(#${gradientId})`}
        fillOpacity={0.8}
        strokeWidth={1}
        filter={`url(#${glowId})`}
        className="holographic-shape"
      />
    </>
  );
};