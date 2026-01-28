import { useEffect, useState } from "react";
import { testimonialsAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Quote } from "lucide-react";

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        const res = await testimonialsAPI.getAll({ limit: 6 });
        setTestimonials(res.testimonials || []);
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-title">What Our Students Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </>
          ) : testimonials.length > 0 ? (
            testimonials.map((testimonial, index) => (
              <div
                key={testimonial._id}
                className="bg-card p-6 rounded-xl shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Quote className="text-accent mb-4" size={32} />
                <p className="text-muted-foreground mb-6 italic">"{testimonial.comment}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {(() => {
                        const userName = testimonial.userName || (testimonial.userId && testimonial.userId.name) || 'Anonymous';
                        return userName.charAt(0);
                      })()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {testimonial.userName || (testimonial.userId && testimonial.userId.name) || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">({testimonial.rating}/5)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground col-span-full">No testimonials yet</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
