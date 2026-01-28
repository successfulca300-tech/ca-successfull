import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { booksAPI } from "@/lib/api";

const BookPayment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res: any = await booksAPI.getById(id);
        setBook(res.book || res);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load book');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  const handleCompletePurchase = async () => {
    if (!book) return;
    try {
      setSubmitting(true);
      const { openRazorpay } = await import('@/utils/razorpay');
      await openRazorpay('book', book);
      // After successful payment the helper reloads; but navigate as fallback
      toast.success('Purchase initiated');
      navigate('/dashboard?tab=books');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to complete purchase');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="container mx-auto px-4 py-20 text-center">Loading...</div></Layout>;
  if (!book) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Buy: {book.title}</h1>
        <div className="bg-card p-6 rounded-lg mb-6">
          <p className="text-muted-foreground">Amount</p>
          <p className="text-2xl font-bold">₨{book.price?.toLocaleString() || '0'}</p>
        </div>

        <Button className="btn-primary" onClick={handleCompletePurchase} disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin mr-2" /> Processing...</> : 'Complete Purchase'}
        </Button>
      </div>
    </Layout>
  );
};

export default BookPayment;
