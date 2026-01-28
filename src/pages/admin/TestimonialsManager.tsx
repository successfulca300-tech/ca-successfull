import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { testimonialsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TestimonialsManager = () => {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      navigate("/");
      return;
    }

    fetchTestimonials();
  }, [navigate]);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await testimonialsAPI.getAll({ limit: 100, status: "pending" });
      setTestimonials(res.testimonials || []);
    } catch (err) {
      console.error("Error fetching testimonials:", err);
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await testimonialsAPI.moderate(id, { status: "approved" });
      setTestimonials(testimonials.filter((t) => t._id !== id));
      toast.success("Testimonial approved");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejection (optional):") || undefined;
    try {
      await testimonialsAPI.moderate(id, { status: "rejected", rejectionReason: reason });
      setTestimonials(testimonials.filter((t) => t._id !== id));
      toast.success("Testimonial rejected");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete testimonial permanently?")) return;
    try {
      await testimonialsAPI.delete(id);
      setTestimonials(testimonials.filter((t) => t._id !== id));
      toast.success("Testimonial deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary-foreground">Testimonials Moderation</h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <>
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 mb-4" />)}
            </>
          ) : testimonials.length > 0 ? (
            <div className="grid gap-4">
              {testimonials.map((t) => (
                <div key={t._id} className="bg-card p-4 rounded-lg border border-border flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.userId?.name || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground">{t.comment}</p>
                    <p className="text-xs text-muted-foreground mt-2">Rating: {t.rating}/5</p>
                    <p className="text-xs text-muted-foreground mt-2">Submitted: {new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleApprove(t._id)}>
                      <Check size={14} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleReject(t._id)}>
                      <X size={14} />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(t._id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">No pending testimonials.</div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default TestimonialsManager;
