import logo from '../assets/logo.png';
import Globe from './Globe.jsx';
import { offerings } from '../data/catalogue.js';

export default function Hero({ playing, onToggleMotion }) {
  return (
    <div className="opening-screen">
      <header className="brand">
        <img src={logo} alt="MindSuite" width="773" height="165" />
        <div className="mission">
          <div className="eyebrow">Our mission</div>
          <p>
            <span>Our Customers’ Success.</span>
            <span>Our People’s Passion.</span>
            <span>Our World’s Progress.</span>
          </p>
        </div>
      </header>
      <section className="hero globe-scene" aria-labelledby="hero-title">
        <Globe playing={playing} />
        <div className="hero-content">
          <div className="eyebrow">Build. Run. Protect. Transform.</div>
          <h1 id="hero-title">
            Architecting <span className="lavender">Intelligence.</span>
            <br />
            Integrating <span className="cyan">Technology.</span>
            <br />
            Transforming <span className="pink">Businesses.</span>
          </h1>
          <p>
            Explore MindSuite’s connected capabilities—from software and AI to cybersecurity, platform
            engineering and business systems. Every offering, definition and deliverable is available as
            you scroll.
          </p>
          <a className="cta" href="#catalogue">
            Explore our capabilities <span aria-hidden="true">↓</span>
          </a>
          <p className="scroll-hint">
            Five families · {offerings.length} offerings · One continuous catalogue
          </p>
        </div>
        <button className="motion" type="button" aria-pressed={!playing} onClick={onToggleMotion}>
          {playing ? 'Pause motion' : 'Resume motion'}
        </button>
      </section>
    </div>
  );
}
