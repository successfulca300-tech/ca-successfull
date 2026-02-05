import Layout from "@/components/layout/Layout";
import { Target, Eye, Award, Users, FileText, BarChart, ShieldCheck, Clock } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <span className="inline-block text-xs uppercase tracking-widest text-primary-foreground/80 bg-primary-foreground/10 px-3 py-1 rounded-full">
              CA Exam Preparation
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mt-4">
              About CA Successful
            </h1>
            <p className="text-primary-foreground/80 mt-4 text-lg">
              Structured learning, smart testing, and expert evaluation for CA Final and Inter.
            </p>
          </div>
        </div>
      </div>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          {/* Our Story */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="animate-fade-in" style={{ animationDelay: "60ms" }}>
                <h2 className="section-title mb-6">Our Story</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  CA Successful is built for one goal: helping CA aspirants clear every level with confidence. From
                  foundation concepts to final-stage exam strategy, we focus on clarity, consistency, and real exam
                  outcomes.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed mt-4">
                  Our ecosystem combines concept classes, revision support, test series, and evaluation so students
                  can learn, practice, and improve in a structured way. We believe smart preparation with regular
                  testing and expert feedback is the shortest path to success.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: FileText, label: "Concept + Practice", sub: "Learn, revise, then apply in exams" },
                  { icon: BarChart, label: "Performance Analytics", sub: "Track accuracy, speed, and weak areas" },
                  { icon: ShieldCheck, label: "Verified Evaluation", sub: "Checked by experts with guidance" },
                  { icon: Clock, label: "Timely Schedules", sub: "Stay on-track for every attempt" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{ animationDelay: `${idx * 80}ms` }}
                    className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition animate-fade-in hover:-translate-y-1 hover:border-primary/40"
                  >
                    <item.icon className="text-primary mb-3" size={28} />
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-card p-8 rounded-xl shadow-md border border-border animate-fade-in hover:-translate-y-1 transition" style={{ animationDelay: "80ms" }}>
              <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Target className="text-primary" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
              <p className="text-muted-foreground">
                To deliver exam-focused CA education that builds strong concepts, disciplined practice, and
                the confidence to perform on the final paper.
              </p>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-md border border-border animate-fade-in hover:-translate-y-1 transition" style={{ animationDelay: "140ms" }}>
              <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Eye className="text-primary" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Our Vision</h3>
              <p className="text-muted-foreground">
                To be a student-first CA preparation platform focused on clarity, consistency, and measurable progress.
              </p>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 animate-fade-in" style={{ animationDelay: "120ms" }}>
              <h2 className="section-title">Why Choose Us?</h2>
              <p className="text-muted-foreground mt-3 text-lg">
                A focused system that turns preparation into performance.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Award, title: "Exam-Focused Teaching", desc: "Concepts + application aligned with CA paper patterns." },
                { icon: Users, title: "Mentor-Led Guidance", desc: "Personalized strategy, doubt support, and accountability." },
                { icon: Target, title: "Structured Test Series", desc: "Regular tests with evaluation and improvement plan." },
                { icon: Eye, title: "Latest Syllabus", desc: "Updated coverage with exam-oriented notes and revisions." },
                { icon: BarChart, title: "Analytics That Matter", desc: "Know your weak areas and track growth." },
                { icon: ShieldCheck, title: "Expert Evaluation", desc: "Detailed checks so you learn how to score more." },
              ].map((item, index) => (
                <div
                  key={index}
                  style={{ animationDelay: `${index * 70}ms` }}
                  className="group p-6 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition animate-fade-in hover:-translate-y-1 hover:border-primary/40"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                    <item.icon className="text-primary" size={24} />
                  </div>
                  <h4 className="font-semibold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="max-w-4xl mx-auto mt-16">
            <div className="p-8 md:p-10 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-center animate-fade-in" style={{ animationDelay: "160ms" }}>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Ready to Prepare the Smart Way?
              </h3>
              <p className="text-muted-foreground mb-6">
                Start with our test series and build a focused plan for your CA attempt.
              </p>
              <a
                href="/test-series"
                className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
              >
                Explore Test Series
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
