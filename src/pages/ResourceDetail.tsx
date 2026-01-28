import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { resourcesAPI, enrollmentsAPI } from "@/lib/api";
import { ArrowLeft, Download, ShoppingCart, Play } from "lucide-react";

const ResourceDetail = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResource = async () => {
      if (!resourceId) return;
      
      try {
        setLoading(true);
        const response: any = await resourcesAPI.getById(resourceId);
        if (response?.resource) {
          setResource(response.resource);
        } else {
          toast.error("Resource not found");
          navigate(-1);
        }
      } catch (error) {
        console.error('Error fetching resource:', error);
        toast.error("Failed to load resource");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [resourceId, navigate]);

  const handlePurchase = () => {
    toast.success(`${resource.title} added to cart!`);
  };

  const handleAttempt = () => {
    toast.success(`Starting ${resource.title}...`);
    // Navigate to test interface if test series
    if (resource.resourceCategory === 'test' || resource.type === 'test') {
      navigate(`/testseries/${resource.testSeriesId || resourceId}`);
    }
  };

  const handleDownload = () => {
    if (resource.fileUrl) {
      window.open(resource.fileUrl, '_blank');
      toast.success('Downloading resource...');
    } else {
      toast.error('Download URL not available');
    }
  };

  const handleGetFree = async () => {
    try {
      let enrollmentData: any = { paymentStatus: 'paid' };

      if (resource.resourceCategory === 'book') {
        enrollmentData.bookId = resourceId;
      } else if (resource.resourceCategory === 'course') {
        enrollmentData.courseId = resourceId;
      } else if (resource.resourceCategory === 'test') {
        enrollmentData.testSeriesId = resourceId;
      }

      await enrollmentsAPI.create(enrollmentData);
      toast.success(`${resource.title} added to your dashboard!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error enrolling in free resource:', error);
      toast.error(error.message || 'Failed to get free resource');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
              Resource Details
            </h1>
          </div>
        </div>

        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-6">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (!resource) {
    return (
      <Layout>
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
              Resource Not Found
            </h1>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            className="text-primary-foreground hover:bg-primary-foreground/20 mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            {resource.title}
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            by {resource.createdBy?.name || 'Unknown Author'}
          </p>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Resource Image */}
            <div className="md:col-span-1">
              <img
                src={resource.thumbnail || '/placeholder-resource.png'}
                alt={resource.title}
                className="w-full rounded-xl shadow-lg object-cover h-96"
              />
              
              {/* Price and Action Button */}
              <div className="mt-6 space-y-4">
                <div className="bg-card p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  {resource.price > 0 ? (
                    <p className="text-3xl font-bold text-primary">
                      ₨{resource.price.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-3xl font-bold text-green-600">FREE</p>
                  )}
                </div>

                {/* Action Buttons */}
                {resource.resourceCategory === 'book' ? (
                  resource.price > 0 ? (
                    <Button 
                      onClick={handlePurchase}
                      className="w-full btn-primary py-6 text-lg"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Purchase Book - ₨{resource.price.toLocaleString()}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleDownload}
                      className="w-full btn-primary py-6 text-lg"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download Free Book
                    </Button>
                  )
                ) : resource.resourceCategory === 'test' ? (
                  <Button 
                    onClick={handleAttempt}
                    className="w-full btn-primary py-6 text-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Attempt Test Series
                  </Button>
                ) : resource.resourceCategory === 'notes' ? (
                  <Button 
                    onClick={handleDownload}
                    className="w-full btn-primary py-6 text-lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Notes
                  </Button>
                ) : resource.resourceCategory === 'video' ? (
                  <Button 
                    onClick={handlePurchase}
                    className="w-full btn-primary py-6 text-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {resource.price > 0 ? `Enroll - ₨${resource.price.toLocaleString()}` : 'Watch Free'}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Resource Information */}
            <div className="md:col-span-2 space-y-6">
              {/* Basic Info */}
              <div className="bg-card p-6 rounded-xl border border-border">
                <h2 className="text-2xl font-bold mb-4">Resource Information</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Resource Type</p>
                    <p className="font-semibold capitalize">{resource.resourceCategory || resource.type || 'Resource'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <p className="font-semibold">{resource.category?.name || resource.category || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                      resource.status === 'published' ? 'bg-green-100 text-green-700' :
                      resource.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {resource.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Created</p>
                    <p className="font-semibold">
                      {new Date(resource.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {resource.description || 'No description available'}
                </p>
              </div>

              {/* Additional Details */}
              {resource.resourceCategory === 'test' && (
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-semibold mb-3">Test Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Questions</p>
                      <p className="font-semibold">{resource.totalTests || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Duration</p>
                      <p className="font-semibold">{resource.duration || '60'} minutes</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Creator Info */}
              <div className="bg-secondary/30 p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-3">Creator Information</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <p className="text-2xl font-bold text-primary">
                      {resource.createdBy?.name?.[0]?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">{resource.createdBy?.name}</p>
                    <p className="text-sm text-muted-foreground">{resource.createdBy?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ResourceDetail;
