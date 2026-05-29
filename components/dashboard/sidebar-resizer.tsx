"use client";

import { useSidebar } from "@/components/ui/sidebar";

const DEFAULT_WIDTH = 260;
const COLLAPSE_THRESHOLD = 180;
const MAX_WIDTH = 400;
const ELASTIC_FACTOR = 0.35;

export function SidebarResizer() {
  const { setOpen } = useSidebar();

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const wrapper = document.querySelector(
      '[data-slot="sidebar-wrapper"]',
    ) as HTMLElement | null;
    if (!wrapper) return;

    let collapsed = false;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const sidebarElements = wrapper.querySelectorAll(
      '[data-slot="sidebar-gap"], [data-slot="sidebar-container"]',
    ) as NodeListOf<HTMLElement>;
    sidebarElements.forEach((el) => {
      el.style.transition = "none";
    });

    function handleMouseMove(ev: MouseEvent) {
      const mouseX = ev.clientX;

      if (mouseX < COLLAPSE_THRESHOLD) {
        setOpen(false);
        wrapper!.style.setProperty("--sidebar-width", `${DEFAULT_WIDTH}px`);
        collapsed = true;
        cleanup();
        return;
      }

      if (mouseX < DEFAULT_WIDTH) {
        const distance = DEFAULT_WIDTH - mouseX;
        const elasticWidth = DEFAULT_WIDTH - distance * ELASTIC_FACTOR;
        wrapper!.style.setProperty("--sidebar-width", `${elasticWidth}px`);
      } else {
        const clamped = Math.min(MAX_WIDTH, mouseX);
        wrapper!.style.setProperty("--sidebar-width", `${clamped}px`);
      }
    }

    function animateWidth(from: number, to: number) {
      const start = performance.now();
      const duration = 220;
      function step() {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const width = from + (to - from) * eased;
        wrapper!.style.setProperty("--sidebar-width", `${width}px`);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function cleanup() {
      if (!collapsed) {
        const currentWidth = parseFloat(
          wrapper!.style.getPropertyValue("--sidebar-width") || "0",
        );
        if (currentWidth < DEFAULT_WIDTH) {
          animateWidth(currentWidth, DEFAULT_WIDTH);
        }
      }
      sidebarElements.forEach((el) => {
        el.style.transition = "";
      });
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", cleanup);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", cleanup);
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute top-0 right-0 bottom-0 z-20 w-1 cursor-col-resize bg-transparent transition-colors hover:bg-ring/50"
      aria-hidden
    />
  );
}
