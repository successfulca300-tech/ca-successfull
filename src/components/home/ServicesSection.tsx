import { BarChart3, FileText, Star, Users, BookOpen, Target } from "lucide-react";

const ServicesSection = () => {
  const services = [
    {
      title: "Test Series",
      description: "Comprehensive test papers covering all CA exam topics with realistic difficulty levels",
      icon: BarChart3,
      color: "from-blue-500 to-cyan-600",
      details: "Full Syllabus : 15 papers, 50% Syllabus : 10 papers, 30% Syllabus : 15 papers, CA Successful Specials : 30 special papers"
    },
    {
      title: "Answer Sheet Evaluation",
      description: "Detailed review and marking of your answer sheets by expert mentors",
      icon: FileText,
      color: "from-purple-500 to-pink-600",
      details: "Subject-wise breakdown, common mistakes identified, improvement strategies"
    },
    {
      title: "Personalized Feedback",
      description: "Get comprehensive feedback on your performance with actionable improvement tips",
      icon: Star,
      color: "from-green-500 to-emerald-600",
      details: "Performance analysis, weak areas identification, targeted recommendations",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-700"
    },
    {
      title: "Expert Mentorship",
      description: "One-on-one guidance and study support throughout your journey",
      icon: Users,
      color: "from-orange-500 to-red-600",
      details: "Strategic guidance, doubt clarification, consistent accountability"
    },
    {
      title: "Study Resources",
      description: "Access to comprehensive study materials and reference content",
      icon: BookOpen,
      color: "from-indigo-500 to-purple-600",
      details: "Topic notes, formula sheets, practice problems, revision materials"
    },
    {
      title: "Progress Tracking",
      description: "Monitor your improvement over time with detailed performance analytics",
      icon: Target,
      color: "from-teal-500 to-green-600",
      details: "Score trends, subject-wise performance, improvement metrics"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-background via-blue-50/30 to-purple-50/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Services
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need for successful CA exam preparation - from test series to personalized mentorship
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <div
                key={idx}
                className="group relative bg-white rounded-xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary/30"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity`}></div>

                {/* Icon */}
                <div
                  className={`inline-flex p-3 rounded-lg mb-4 ${
                    service.iconBg ? service.iconBg : `bg-gradient-to-br ${service.color}`
                  } ${service.iconText ? service.iconText : "text-white"}`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {service.description}
                  </p>
                  <p className="text-xs text-primary font-semibold">
                    {service.details}
                  </p>
                </div>

                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 rounded-bl-3xl transition-opacity`}></div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground mb-6">
            Join CA Successful today and transform your exam preparation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/test-series" className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition">
              Start Test Series
            </a>
            <a href="/mentorship" className="inline-flex items-center justify-center px-8 py-3 rounded-lg border-2 border-primary text-primary hover:bg-primary/5 font-semibold transition">
              Join Mentorship
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
