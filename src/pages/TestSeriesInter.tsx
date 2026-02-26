import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { FIXED_TEST_SERIES_INTER } from '@/data/fixedTestSeries';
import { testSeriesAPI } from '@/lib/api';

const TestSeriesInter = () => {
  const [loading] = useState(false);
  const navigate = useNavigate();
  const [managedData, setManagedData] = useState<any>({});
  const [displayedSeries, setDisplayedSeries] = useState<any[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, {thumbnail?: string}>>({});

  const [mediaLoading, setMediaLoading] = useState<boolean>(true);
  useEffect(() => {
    const fetchMediaForAll = async () => {
      setMediaLoading(true);
      const map: Record<string, {thumbnail?: string}> = {};
      try {
        await Promise.all(
          FIXED_TEST_SERIES_INTER.map(async (s) => {
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

  useEffect(() => {
    // Fetch managed overrides from server for each fixed inter series
    const fetchManaged = async () => {
      const map: Record<string, any> = {};
      try {
        await Promise.all(
          FIXED_TEST_SERIES_INTER.map(async (s) => {
            try {
              const resp: any = await testSeriesAPI.getFixedManaged(s._id);
              if (resp && resp.success && resp.testSeries) {
                map[s._id] = resp.testSeries;
              }
            } catch (e) {
              // ignore per-series failures
            }
          })
        );
      } catch (e) {
        console.error('Failed to fetch managed series from server', e);
      } finally {
        // fallback to any locally saved managed data for quick edits
        try {
          const saved = localStorage.getItem('testSeriesManagement_inter') || localStorage.getItem('testSeriesManagement');
          if (saved) {
            const local = JSON.parse(saved);
            Object.keys(local || {}).forEach(k => { if (!map[k]) map[k] = local[k]; });
          }
        } catch (e) {}
        setManagedData(map);
      }
    };
    fetchManaged();
  }, []);

  useEffect(() => {
    const activeSeries = FIXED_TEST_SERIES_INTER
      .map((series, index) => {
        const managed = managedData[series._id] || {};
        const backendThumb = mediaMap[series._id]?.thumbnail;
        return {
          ...series,
          title: managed.cardTitle || managed.title || series.title,
          description: managed.cardDescription || managed.description || series.description,
          thumbnail: managed.cardThumbnail || backendThumb || series.thumbnail,
          isActive: managed.isActive !== false,
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
            CA Inter Test Series
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            Practice tests designed by Teachers for effective CA Inter preparation
          </p>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
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
                  <div className="p-4 border-b border-gray-100 h-20 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-0 line-clamp-2">
                      {test.title}
                    </h3>
                  </div>

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

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const discountPercent = 20;
                          const originalPrice = Number(test.pricing?.subjectPrice ?? 400);
                          const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
                          return (
                            <>
                              <span>Starting from </span>
                              <span className="line-through text-gray-500 mr-2">{"\u20B9"}{originalPrice}</span>
                              <span className="font-semibold text-primary mr-2">{"\u20B9"}{discountedPrice}</span>
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                {discountPercent}% OFF   Use Code Now
                              </span>
                            </>
                          );
                        })()}
                      </div>
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
        </div>
      </section>
    </Layout>
  );
};

export default TestSeriesInter;

