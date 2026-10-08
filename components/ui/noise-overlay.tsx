"use client";

import { memo } from "react";

// A small noise tile used as a repeating background image. The browser rasterises it once,
// unlike a full-viewport live <feTurbulence> filter with mix-blend-overlay, which is
// recomputed on every scroll/repaint and made pages stutter and freeze on slower devices.
const NOISE_TILE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const NoiseOverlay = memo(function NoiseOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
      style={{ backgroundImage: NOISE_TILE, backgroundRepeat: "repeat" }}
    />
  );
});
