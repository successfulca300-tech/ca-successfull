import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const Mentorship = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
            <Clock className="w-4 h-4" />
            Mentorship Launching Soon
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mt-4">
            CA Mentorship
          </h1>
          <p className="text-primary-foreground/80 mt-4 text-lg max-w-2xl mx-auto">
            We are preparing a focused mentorship program with expert evaluation, strategy calls,
            and performance tracking for CA aspirants.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/15 text-primary-foreground px-5 py-3 rounded-lg">
            <Calendar className="w-5 h-5" />
            Available after 8 Feb 2026
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Expert Evaluation",
                desc: "Detailed answer sheet review with improvement pointers.",
              },
              {
                title: "Mentor Guidance",
                desc: "Personalized strategies to boost your CA scores.",
              },
              {
                title: "Performance Tracking",
                desc: "Progress insights to keep you on the right path.",
              },
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-card rounded-xl border border-border shadow-sm">
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto mt-14">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "When will mentorship start?",
                  a: "The mentorship program will open after 8 Feb 2026. We will announce the exact date on the website and social channels.",
                },
                {
                  q: "Who is mentorship for?",
                  a: "It’s designed for CA Final, CA Inter and  students who want structured practice, feedback, and performance improvement.",
                },
                {
                  q: "Do I need to buy the test series to join?",
                  a: "Mentorship works best with our test series because evaluation is based on those papers, but final eligibility will be announced at launch.",
                },
                {
                  q: "What will be included in mentorship?",
                  a: "Answer sheet evaluation, mentor feedback, improvement tips, and performance tracking. Exact plan details will be shared at launch.",
                },
                {
                  q: "How do I get notified when it launches?",
                  a: "Click “Get Notified” and contact us. We’ll add you to the first-update list.",
                },
              ].map((item, idx) => (
                <div key={idx} className="p-5 bg-card border border-border rounded-lg shadow-sm">
                  <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-12 text-center">
            <p className="text-muted-foreground">
              Until the mentorship program opens, explore our Test Series to start your preparation.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/test-series")} className="gap-2">
                View Test Series <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/contact")}>
                Get Notified
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Mentorship;
