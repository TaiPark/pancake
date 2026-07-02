"use client";

import { motion, useReducedMotion } from "motion/react";

export function KineticBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="kinetic-background" aria-hidden="true">
      <motion.div
        className="kinetic-grid"
        animate={reducedMotion ? undefined : { backgroundPosition: ["0px 0px", "96px 64px"] }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="kinetic-sweep"
        animate={reducedMotion ? undefined : { x: ["-8%", "8%"], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <motion.div
        className="kinetic-scan"
        animate={reducedMotion ? undefined : { y: ["-12%", "112%"] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
