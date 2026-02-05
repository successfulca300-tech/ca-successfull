import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Trophy, ArrowUp } from "lucide-react";
import { useEffect, useState } from 'react';
import { settingsAPI } from '@/lib/api';

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-background via-secondary/30 to-background py-12 md:py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">

            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in">
              Welcome to
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              CA Successful
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in leading-relaxed" style={{ animationDelay: "0.2s" }}>
              Your journey to becoming a successful Chartered Accountant starts here. Structured guidance, comprehensive study materials, and focused practice built for CA exams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Link to="/test-series">
                <Button className="btn-primary text-lg px-8 py-6 w-full sm:w-auto">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Explore Test Series
                </Button>
              </Link>
              <Link to="/mentorship">
                <Button variant="outline" className="btn-outline text-lg px-8 py-6 w-full sm:w-auto">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Mentorship Program
                </Button>
              </Link>
            </div>
            

          </div>
          
          <div className="flex-1 relative animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="relative">
              <div className="w-full max-w-md mx-auto aspect-square bg-gradient-to-br from-primary/5 to-secondary rounded-2xl overflow-hidden shadow-2xl border border-border">
                        <HeroImage />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-8">
                  <div className="text-primary-foreground">
                    <p className="text-xl md:text-2xl font-bold mb-2">

                    </p>
                    <p className="text-sm opacity-90"> Keep Learning, Keep Growing</p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/30 rounded-full blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-primary/20 rounded-full blur-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />

      {/* Scroll to Top Button */}
      <ScrollToTopButton />
    </section>
  );
};

export default HeroSection;

// Scroll to Top Button Component
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-40 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
      aria-label="Scroll to top"
    >
      <ArrowUp size={24} />
    </button>
  );
}

// WhatsApp Button Component
function WhatsAppButton() {
  const handleWhatsAppClick = () => {
    const whatsappChannelUrl = 'https://whatsapp.com/channel/0029Vb6SnzaFXUuhnbgBeZ1m';
    window.open(whatsappChannelUrl, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-20 right-6 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 animate-bounce"
      aria-label="Contact us on WhatsApp"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
      </svg>
    </button>
  );
}

function HeroImage() {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await settingsAPI.get();
        const s = (res as any).settings || {};
        if (mounted) setSrc(s.heroImage || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=600&fit=crop');
      } catch (e) {
        if (mounted) setSrc('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=600&fit=crop');
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <img src={src} alt="Students studying" className="w-full h-full object-contain opacity-90" />
  );
}
