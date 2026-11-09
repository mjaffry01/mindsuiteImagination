import { useEffect, useState } from 'react';
import { offerings } from '../data/catalogue.js';

/**
 * Index of the offering currently being read. Each offering is "entered" at the top of its
 * family header (first in family), area header (first in area) or its own card otherwise.
 */
export default function useReadingPosition() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let tops = [];
    let queued = false;

    const markerId = (o) => (o.firstInFamily ? o.family.id : o.firstInArea ? o.area.id : o.id);

    function track() {
      queued = false;
      const y = scrollY + Math.min(innerHeight * 0.28, 210);
      let lo = 0;
      let hi = tops.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (tops[mid] <= y) lo = mid;
        else hi = mid - 1;
      }
      setIndex(lo);
    }

    function measure() {
      tops = offerings.map((o) => {
        const el = document.getElementById(markerId(o));
        return el ? el.getBoundingClientRect().top + scrollY : Infinity;
      });
      // Cards above the ones built so far count as already passed, keeping the list in order.
      const firstBuilt = tops.findIndex((top) => top !== Infinity);
      for (let i = 0; i < firstBuilt; i += 1) tops[i] = -Infinity;
      track();
    }

    const onScroll = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(track);
      }
    };

    // Card heights change with width and font loading, so re-measure on any layout change.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, []);

  return offerings[index];
}
