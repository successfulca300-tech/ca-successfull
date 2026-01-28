import Layout from "@/components/layout/Layout";
import { stats } from "@/data/mockData";
import { Target, Eye, Award, Users } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            About Us
          </h1>
        </div>
      </div>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          {/* Our Journey */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="section-title mb-6">Our Journey</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              CA Successful has been at the forefront of professional education, helping thousands of students achieve their dreams of becoming Chartered Accountants, Cost Accountants, and Company Secretaries. Our journey began with a simple mission - to provide quality education that transforms lives.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mt-4">
              Over the years, we have produced multiple All India Ranks, including 6 times AIR 1 in CA Final examinations. Our success is built on the foundation of expert faculty, comprehensive study materials, and personalized guidance.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <p className="stat-number">{stat.number}</p>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Mission & Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-card p-8 rounded-xl shadow-md border border-border">
              <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Target className="text-primary" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
              <p className="text-muted-foreground">
                To provide world-class education and guidance to aspiring professionals, enabling them to achieve excellence in their respective fields through innovative teaching methodologies and comprehensive study materials.
              </p>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-md border border-border">
              <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Eye className="text-primary" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Our Vision</h3>
              <p className="text-muted-foreground">
                To be the most trusted and preferred institution for professional education, recognized for our commitment to student success, integrity, and continuous innovation in learning.
              </p>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="max-w-4xl mx-auto">
            <h2 className="section-title mb-8 text-center">Why Choose Us?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Award, title: "Expert Faculty", desc: "Learn from AIR holders and industry experts" },
                { icon: Users, title: "Personalized Attention", desc: "Small batch sizes for better interaction" },
                { icon: Target, title: "Result Oriented", desc: "Proven track record of top ranks" },
                { icon: Eye, title: "Updated Content", desc: "Course material aligned with latest syllabus" },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
                  <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="text-primary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
