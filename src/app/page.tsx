import { Hero } from "@/components/site/hero";
import { Features } from "@/components/site/features";
import { Steps } from "@/components/site/steps";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Steps />
      <Footer />
    </main>
  );
}
