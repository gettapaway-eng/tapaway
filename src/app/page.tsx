import { preload } from 'react-dom';
import { Hero } from '@/components/site/hero';
import { Features } from '@/components/site/features';
import { Steps } from '@/components/site/steps';
import { Footer } from '@/components/site/footer';

export default function Home() {
  // The hero's poster is the first paint; fetch it with the HTML. (Browsers
  // ignore preload for video — the <video preload="auto"> handles the film.)
  preload('/hero-poster.jpg', { as: 'image', fetchPriority: 'high' });

  return (
    <main>
      <Hero />
      <Features />
      <Steps />
      <Footer />
    </main>
  );
}
