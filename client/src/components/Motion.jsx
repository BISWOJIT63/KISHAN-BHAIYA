import { motion as Motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "../store/useAppStore.js";

const pageVariants = {
  default: { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } } },
  operations: { hidden: { opacity: 0, x: 14 }, visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" } } },
};

const listVariants = {
  commerce: { hidden: {}, visible: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } } },
  operations: { hidden: {}, visible: { transition: { staggerChildren: 0.075, delayChildren: 0.03 } } },
};

const itemVariants = {
  commerce: { hidden: { opacity: 0, y: 14, scale: 0.985 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.26, ease: "easeOut" } } },
  operations: { hidden: { opacity: 0, x: 16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.24, ease: "easeOut" } } },
};

function useMotionEnabled() {
  const lowBandwidth = useAppStore((state) => state.lowBandwidth);
  const reducedMotion = useReducedMotion();
  return !lowBandwidth && !reducedMotion;
}

export function PageMotion({ children, className, kind = "default" }) {
  const enabled = useMotionEnabled();
  const variants = pageVariants[kind] || pageVariants.default;
  return <Motion.div className={className} variants={variants} initial={enabled ? "hidden" : false} animate="visible">{children}</Motion.div>;
}

export function Stagger({ children, className, kind = "commerce" }) {
  const enabled = useMotionEnabled();
  const variants = listVariants[kind] || listVariants.commerce;
  return <Motion.div className={className} variants={variants} initial={enabled ? "hidden" : false} animate="visible">{children}</Motion.div>;
}

export function StaggerItem({ children, className, kind = "commerce" }) {
  const enabled = useMotionEnabled();
  const variants = itemVariants[kind] || itemVariants.commerce;
  return <Motion.div className={className} variants={enabled ? variants : undefined}>{children}</Motion.div>;
}
