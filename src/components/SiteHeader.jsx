import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import logo from '../assets/logo.png';
import SiteNav from './SiteNav.jsx';

/**
 * Sticky top bar: logo (back to top) and the section menu. Publishes its height as
 * --header-h so sticky columns and anchor jumps can sit below it.
 */
export default function SiteHeader() {
  const ref = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const header = ref.current;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--header-h', `${header.offsetHeight}px`);
    });
    observer.observe(header);

    const onScroll = () => setScrolled(scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <header className={`brand site-header${scrolled ? ' is-scrolled' : ''}`} ref={ref}>
      <a className="brand-home" href="#top" aria-label="MindSuite — back to top">
        <img src={logo} alt="MindSuite" width="773" height="165" />
      </a>
      <SiteNav />
      <div className="mission header-mission">
        <div className="eyebrow">Our mission</div>
        <p>
          <span>Our Customers’ Success.</span>
          <span>Our People’s Passion.</span>
          <span>Our World’s Progress.</span>
        </p>
      </div>
    </header>
  );
}

/** Floating "Back to top" button, shown once the visitor is past the opening screen. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(scrollY > innerHeight * 0.8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href="#top"
      className={`back-to-top${visible ? ' is-visible' : ''}`}
      aria-label="Back to top"
      title="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp aria-hidden="true" focusable="false" />
    </a>
  );
}
