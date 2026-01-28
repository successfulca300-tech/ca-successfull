import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { offersAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";

const OfferBanner = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await offersAPI.getAll();
        console.log('Offers API Response:', res);
        const offersList = (res as any)?.offers || [];
        console.log('Number of active offers:', offersList.length || 0);
        
        if (offersList && offersList.length > 0) {
          setOffers(offersList);
          console.log('Offers set:', offersList);
        } else {
          console.log('No active offers found - Check if offers exist with today\'s date or earlier');
          setError('No active offers at the moment');
        }
      } catch (err) {
        console.error('Error fetching offers:', err);
        setError('Failed to load offers');
      }
    };

    fetchOffers();
  }, []);

  if (!isVisible || offers.length === 0) return null;

  const currentOffer = offers[currentIndex];
  
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? offers.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === offers.length - 1 ? 0 : prevIndex + 1
    );
  };

  const discountText = currentOffer.discountType === 'percentage' 
    ? `${currentOffer.discountValue}% OFF` 
    : `₹${currentOffer.discountValue} OFF`;

  const validTill = new Date(currentOffer.endDate).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-accent text-accent-foreground py-3 px-4 relative">
      <div className="container mx-auto flex items-center justify-between gap-4">
        {/* Previous Button */}
        {offers.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            className="h-8 w-8 p-0 text-accent-foreground hover:bg-accent-foreground/20"
          >
            <ChevronLeft size={18} />
          </Button>
        )}

        {/* Offer Content */}
        <div className="flex-1 text-center">
          <p className="text-sm font-medium">
            🎉 {currentOffer.title}: Get {discountText}! Use code: <span className="font-bold">{currentOffer.code || 'N/A'}</span> | Valid till {validTill}
          </p>
          {offers.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2">
              {offers.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-accent-foreground w-6' 
                      : 'bg-accent-foreground/50 w-2 hover:bg-accent-foreground/70'
                  }`}
                  aria-label={`Go to offer ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Next Button */}
        {offers.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            className="h-8 w-8 p-0 text-accent-foreground hover:bg-accent-foreground/20"
          >
            <ChevronRight size={18} />
          </Button>
        )}

        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="hover:opacity-70 transition-opacity"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default OfferBanner;
