import { ShoppingCart, FileText, CheckCircle, Star } from "lucide-react";

const steps = [
  {
    icon: ShoppingCart,
    title: "Select & Purchase",
    description: "Choose your test series (S1, S2, S3, or S4), select subjects and payment method to get instant access.",
    number: "1"
  },
  {
    icon: FileText,
    title: "Access Test Papers",
    description: "Download high-quality test papers designed by Teachers covering full syllabus to advanced topics.",
    number: "2"
  },
  {
    icon: CheckCircle,
    title: "Attempt & Upload",
    description: "Solve papers within the deadline and upload your answer sheets for detailed evaluation.",
    number: "3"
  },
  {
    icon: Star,
    title: "Get Feedback",
    description: "Receive comprehensive feedback with solutions, performance analytics, and all-India rankings.",
    number: "4"
  },
];

const YoutubeSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="section-title">How to Access Test Series</h2>
          <p className="text-muted-foreground mt-4 text-lg">Simple 4-step process to purchase, attempt, and get expert feedback</p>
        </div>

        {/* Vertical Timeline with Zig-Zag */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary via-primary to-secondary"></div>

            {/* Steps */}
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const isLeft = index % 2 === 0;
              
              return (
                <div key={index} className="mb-12 relative">
                  <div className={`flex items-center gap-8 ${isLeft ? "flex-row" : "flex-row-reverse"}`}>
                    {/* Content Box */}
                    <div className={`flex-1 ${isLeft ? "text-right pr-8" : "text-left pl-8"}`}>
                      <div className={`p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 ${
                        isLeft 
                          ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50" 
                          : "bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/30 hover:border-secondary/50"
                      }`}>
                        <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>

                    {/* Center Icon Circle */}
                    <div className="flex-shrink-0 z-10">
                      <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-xl transform hover:scale-110 transition-transform ${
                        isLeft 
                          ? "bg-gradient-to-br from-primary to-primary/80 border-primary text-white" 
                          : "bg-gradient-to-br from-secondary to-secondary/80 border-secondary text-white"
                      }`}>
                        <IconComponent className="w-9 h-9" />
                        <span className="text-xs font-bold mt-1">{step.number}</span>
                      </div>
                    </div>

                    {/* Empty Space */}
                    <div className="flex-1"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 pt-8 border-t border-primary/20">
          <h3 className="text-2xl font-bold text-foreground mb-3">Ready to Get Started?</h3>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Browse our comprehensive test series and start your exam preparation journey with expert-designed papers.</p>
          <a
            href="/test-series"
            className="inline-block px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Explore Test Series Now →
          </a>
        </div>
      </div>
    </section>
  );
};

export default YoutubeSection;
