"use client";

import { motion, useReducedMotion } from "motion/react";

export function KineticBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="kinetic-background" aria-hidden="true">
      <motion.div
        className="kinetic-grid"
        animate={reducedMotion ? undefined : { backgroundPosition: ["0px 0px", "96px 64px"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="kinetic-sweep"
        animate={reducedMotion ? undefined : { x: ["-20%", "20%"], opacity: [0.36, 0.58, 0.36] }}
        transition={{ duration: 9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />
      <motion.div
        className="kinetic-scan"
        animate={reducedMotion ? undefined : { y: ["-12%", "112%"] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
