import Layout from "@/components/layout/Layout";
import OfferBanner from "@/components/home/OfferBanner";
import HeroSection from "@/components/home/HeroSection";
import ServicesSection from "@/components/home/ServicesSection";
import YoutubeSection from "@/components/home/YoutubeSection";
import FAQSection from "@/components/home/FAQSection";

const Index = () => {
  return (
    <Layout>
      <OfferBanner />
      <HeroSection />
      <ServicesSection />
      <YoutubeSection />
      <FAQSection />
    </Layout>
  );
};

export default Index;
