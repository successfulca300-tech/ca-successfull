import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { testSeriesAPI, enrollmentsAPI } from "@/lib/api";

const TestSeriesPayment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res: any = await testSeriesAPI.getById(id);
        setSeries(res.testSeries || res);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load test series');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  const handleCompletePurchase = async () => {
    if (!series) return;
    try {
      setSubmitting(true);
      const { openRazorpay } = await import('@/utils/razorpay');
      await openRazorpay('testseries', series);
      toast.success('Purchase initiated');
      navigate('/dashboard?tab=test-series');
    } catch (err: any) {
      console.error(err);
      // If error indicates already enrolled, verify via API and proceed gracefully
      if (err.message && (err.message.includes('Already purchased') || err.message.includes('already enrolled') || err.message.includes('Already'))) {
        try {
          const check: any = await enrollmentsAPI.checkEnrollment({ testSeriesId: series._id });
          if (check && check.enrolled) {
            toast.info('You are already enrolled. Redirecting to Dashboard.');
            navigate('/dashboard?tab=test-series');
            return;
          }
          toast.error('Could not verify purchase. Please contact support.');
          return;
        } catch (e) {
          console.error('Enrollment check failed after duplicate error', e);
          toast.error('Failed to complete purchase');
          return;
        }
      }
      toast.error(err.message || 'Failed to complete purchase');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="container mx-auto px-4 py-20 text-center">Loading...</div></Layout>;
  if (!series) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Buy / Enroll: {series.title}</h1>
        <div className="bg-card p-6 rounded-lg mb-6">
          <p className="text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold">₨{series.price?.toLocaleString() || '0'}</p>
        </div>

        <Button className="btn-primary" onClick={handleCompletePurchase} disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin mr-2" /> Processing...</> : 'Complete Purchase'}
        </Button>
      </div>
    </Layout>
  );
};

export default TestSeriesPayment;
