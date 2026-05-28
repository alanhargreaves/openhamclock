/**
 * usePopupPosition — calculates a popup's position relative to an anchor element.
 *
 * Returns an inline style object with top/left positioning and a className
 * indicating whether the popup is above or below the anchor.
 *
 * The popup is positioned below the anchor by default. If there isn't enough
 * space below (viewport boundary), it flips above. It also handles right-edge
 * overflow.
 *
 * Usage:
 *   const pos = usePopupPosition(anchorRef, popupWidth);
 *   <div style={{ position: 'fixed', ...pos.style, ... }} className={pos.className}>
 *     ...
 *   </div>
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// Minimum padding from viewport edges
const MARGIN = 8;
// Extra padding from right edge to avoid clipping
const RIGHT_MARGIN = 16;

export default function usePopupPosition(anchorRef, popupWidth = 260) {
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    className: '',
  });
  const rafRef = useRef(null);

  const recalculate = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const anchor = anchorRef?.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const popupH = 160; // approximate popup height (will adjust)
      const availBelow = window.innerHeight - rect.bottom - MARGIN;
      const availAbove = rect.top - MARGIN;

      let top;
      let cls = 'below';

      if (availBelow >= popupH * 0.6 || availBelow > availAbove) {
        // Position below anchor
        top = rect.bottom + MARGIN;
        cls = 'below';
      } else {
        // Position above anchor
        top = rect.top - MARGIN - popupH;
        cls = 'above';
      }

      // Horizontal: align left edge with anchor's left edge
      let left = rect.left;
      const popupRight = left + popupWidth;
      if (popupRight > window.innerWidth - RIGHT_MARGIN) {
        // Shift left to stay in viewport
        left = window.innerWidth - popupWidth - RIGHT_MARGIN;
      }
      // Ensure left edge doesn't go off-screen
      if (left < MARGIN) left = MARGIN;

      setPosition({ top, left, className: cls });
    });
  }, [anchorRef, popupWidth]);

  useEffect(() => {
    recalculate();
    const onResize = () => recalculate();
    const onScroll = () => recalculate();

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Observe DOM changes that might shift the anchor
    const observer = new ResizeObserver(recalculate);
    if (anchorRef?.current) observer.observe(anchorRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [recalculate]);

  return position;
}
