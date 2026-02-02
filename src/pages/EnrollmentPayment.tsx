import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { coursesAPI, enrollmentsAPI } from "@/lib/api";

const EnrollmentPayment = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const res: any = await coursesAPI.getById(courseId);
        setCourse(res.course || res);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load course');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, navigate]);

  const handleCompleteEnrollment = async () => {
    if (!course) return;
    try {
      setSubmitting(true);
      const payload: any = { courseId: course._id || courseId!, amount: course.price || 0, paymentStatus: 'paid' };
      const res = await enrollmentsAPI.create(payload);
      if (res && (res as any)._id) {
        toast.success('Enrollment completed');
        navigate('/dashboard?tab=courses');
        return;
      }
    } catch (err: any) {
      console.error(err);
      // If error indicates already enrolled, verify via API and proceed gracefully
      if (err.message && (err.message.includes('Already purchased') || err.message.includes('already enrolled') || err.message.includes('Already'))) {
        try {
          const check: any = await enrollmentsAPI.checkEnrollment({ courseId: course._id || courseId! });
          if (check && check.enrolled) {
            toast.info('You are already enrolled. Redirecting to Dashboard.');
            navigate('/dashboard?tab=courses');
            return;
          }
          // enrollment not found despite server message - inform user
          toast.error('Could not verify enrollment. Please contact support.');
          return;
        } catch (e) {
          console.error('Enrollment check failed after duplicate error', e);
          toast.error('Failed to complete enrollment');
          return;
        }
      }
      toast.error(err.message || 'Failed to complete enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="container mx-auto px-4 py-20 text-center">Loading...</div></Layout>;
  if (!course) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Buy / Enroll: {course.title}</h1>
        <div className="bg-card p-6 rounded-lg mb-6">
          <p className="text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold">₨{course.price?.toLocaleString() || '0'}</p>
        </div>

        <Button className="btn-primary" onClick={handleCompleteEnrollment} disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin mr-2" /> Processing...</> : 'Complete Enrollment'}
        </Button>
      </div>
    </Layout>
  );
};

export default EnrollmentPayment;
