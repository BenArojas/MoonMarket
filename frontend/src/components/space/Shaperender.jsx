import { interpolate } from "flubber";
import { animated, useSpring, config, to } from "react-spring";
import * as d3 from "d3";
import { useMemo, useRef } from "react";

export const ShapeRenderer = ({ path, color, index }) => {
  const currD = useRef(path);

  const pathInterpolator = useMemo(
    () => interpolate(currD.current, path),
    [path]
  );

  const springProps = useSpring({
    from: { t: 0 },
    to: { t: 1 },
    reset: currD.current !== path,
    onChange: ({ t }) => {
      currD.current = pathInterpolator(t || 1);
    },
    config: config.molasses,
  });

  // Create holographic gradient
  const gradientId = `holographicGradient-${index}`;
  const glowId = `glow-${index}`;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={d3.color(color).brighter(1).toString()} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={d3.color(color).darker(1).toString()} />
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
        // stroke="black"
        fill={`url(#${gradientId})`}
        fillOpacity={0.8}
        strokeWidth={1}
        filter={`url(#${glowId})`}
        className="holographic-shape"
      />
    </>
  );
};