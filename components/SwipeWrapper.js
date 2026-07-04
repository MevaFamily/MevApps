"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";

const TABS = [
  "/transaksi",
  "/rangkuman",
  "/akun",
  "/hub"
];

export default function SwipeWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Track direction: 1 for right-to-left swipe (going next), -1 for left-to-right (going prev)
  const [direction, setDirection] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const currentIndex = TABS.findIndex(tab => pathname.startsWith(tab));

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      // Swipe left = go to NEXT tab
      if (currentIndex >= 0 && currentIndex < TABS.length - 1) {
        setDirection(1);
        router.push(TABS[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      // Swipe right = go to PREV tab
      if (currentIndex > 0) {
        setDirection(-1);
        router.push(TABS[currentIndex - 1]);
      }
    },
    preventDefaultTouchmoveEvent: false,
    trackMouse: false,
    delta: 60, // Minimum distance before swipe is triggered
    swipeDuration: 500, // Maximum time for swipe gesture
  });

  // Exclude login or loading pages from animation
  if (!isClient || pathname === "/login" || pathname === "/") {
    return (
      <main className="flex-1 overflow-y-auto pb-24 touch-pan-y">
        {children}
      </main>
    );
  }

  // iOS style slide transition variants
  const variants = {
    initial: (dir) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: 1,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { type: "tween", ease: "easeOut", duration: 0.3 }
    },
    exit: (dir) => ({
      x: dir > 0 ? "-30%" : dir < 0 ? "30%" : 0, 
      opacity: 0.8,
      transition: { type: "tween", ease: "easeIn", duration: 0.3 }
    })
  };

  const rootPath = pathname.split('/')[1] || "root";

  return (
    <div {...handlers} className="flex-1 relative w-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.main
          key={rootPath}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 w-full h-full overflow-y-auto pb-24 touch-pan-y bg-neutral-50"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
