import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Eye, BarChart, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { FIXED_TEST_SERIES } from '@/data/fixedTestSeries';
import { testSeriesAPI } from '@/lib/api';

const TestSeries = () => {
  const [loading] = useState(false);
  const navigate = useNavigate();
  const [managedData, setManagedData] = useState<any>({});
  const [displayedSeries, setDisplayedSeries] = useState<any[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, {thumbnail?: string}>>({});

  // Fetch backend media (thumbnails) for fixed series so subadmin uploads are visible to all users
  const [mediaLoading, setMediaLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchMediaForAll = async () => {
      setMediaLoading(true);
      const map: Record<string, {thumbnail?: string}> = {};
      try {
        await Promise.all(
          FIXED_TEST_SERIES.map(async (s) => {
            try {
              const res = await testSeriesAPI.getMedia(s._id, 'thumbnail');
              if (res && res.success && res.media && res.media.length > 0) {
                map[s._id] = { thumbnail: res.media[0].fileUrl };
              }
            } catch (e) {
              // ignore individual failures
            }
          })
        );
      } finally {
        setMediaMap(map);
        setMediaLoading(false);
      }
    };
    fetchMediaForAll();
  }, []);

  // Load managed data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('testSeriesManagement');
    if (saved) {
      try {
        setManagedData(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to load managed data:', err);
      }
    }
  }, []);

  // Set displayed series (active ones, sorted by displayOrder)
  useEffect(() => {
    const activeSeries = FIXED_TEST_SERIES
      .map((series, index) => {
        const managed = managedData[series._id] || {};
        const backendThumb = mediaMap[series._id]?.thumbnail;
        return {
          ...series,
          title: managed.cardTitle || managed.title || series.title,
          description: managed.cardDescription || managed.description || series.description,
          thumbnail: managed.cardThumbnail || backendThumb || series.thumbnail,
          isActive: managed.isActive !== false, // Default to true
          displayOrder: managed.displayOrder !== undefined ? managed.displayOrder : index,
        };
      })
      .filter((s) => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    setDisplayedSeries(activeSeries);
  }, [managedData, mediaMap]);

  const handleViewDetails = (test: any) => navigate(`/testseries/${test._id}`);

  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            Test Series
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            Practice tests designed by Teachers for effective exam preparation
          </p>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Cards Grid - NO FILTERS */}
          {mediaLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-lg shadow-md transition-all duration-300 overflow-hidden border border-gray-200">
                  <div className="p-4 border-b border-gray-100 h-20 flex flex-col justify-center">
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                  <div className="w-full h-64 bg-gray-100 overflow-hidden">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedSeries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedSeries.map((test) => (
                <div
                  key={test._id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
                >
                  {/* Card Header - Title */}
                  <div className="p-4 border-b border-gray-100 h-20 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-0 line-clamp-2">
                      {test.title}
                    </h3>
                  </div>

                  {/* Card Middle - Thumbnail Image (larger) */}
                  <div className="w-full h-64 bg-gray-100 overflow-hidden">
                    {mediaLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : test.thumbnail ? (
                      <img
                        src={test.thumbnail}
                        alt={test.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white">
                        <span className="text-muted-foreground font-semibold text-center px-4">
                          {test.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Price Label & Button */}
                  <div className="p-4 space-y-3">
                    <div>
                      { (test.seriesType === 'S4') ? (
                        <p className="text-sm text-muted-foreground">Starting from <span className="font-semibold">₹{test.pricing?.subjectPrice ?? 1200}</span></p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Started from <span className="font-semibold">₹{test.pricing?.subjectPrice ?? 450}</span></p>
                      ) }
                    </div>

                    <Button
                      onClick={() => handleViewDetails(test)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 rounded-lg transition"
                    >
                      <Eye size={18} className="mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground font-semibold">
                No Test Series Available
              </p>
            </div>
          )}

          {/* Why Choose Section */}
          {/* <div className="mt-16 bg-secondary/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">Why Choose Our Test Series?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart className="text-primary" size={32} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Detailed Analytics</h3>
                <p className="text-muted-foreground text-sm">Track your progress with comprehensive performance reports</p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-primary" size={32} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Performance Insights</h3>
                <p className="text-muted-foreground text-sm">Track your progress with clear subject-wise feedback</p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-primary" size={32} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Expert Solutions</h3>
                <p className="text-muted-foreground text-sm">Detailed solutions and explanations by subject experts</p>
              </div>
            </div>
          </div> */}
        </div>
      </section>
    </Layout>
  );
};

export default TestSeries;
