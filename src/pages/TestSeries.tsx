import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Eye, BarChart, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FIXED_TEST_SERIES } from '@/data/fixedTestSeries';

const TestSeries = () => {
  const [loading] = useState(false);
  const navigate = useNavigate();
  const [managedData, setManagedData] = useState<any>({});
  const [displayedSeries, setDisplayedSeries] = useState<any[]>([]);

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

  // Fetched details from backend to prefer DB thumbnails when available
  const [fetchedSeriesMap, setFetchedSeriesMap] = useState<Record<string, any>>({});

  // Set displayed series (active ones, sorted by displayOrder)
  useEffect(() => {
    const activeSeries = FIXED_TEST_SERIES
      .map((series, index) => {
        const managed = managedData[series._id] || {};
        const fetched = fetchedSeriesMap[series._id] || {};
        return {
          ...series,
          title: fetched.title || managed.cardTitle || managed.title || series.title,
          description: fetched.description || managed.cardDescription || managed.description || series.description,
          // Prefer fetched DB thumbnail (created by subadmin) over managed or fixed
          thumbnail: fetched.thumbnail || managed.cardThumbnail || series.thumbnail,
          isActive: fetched.isActive !== undefined ? fetched.isActive : (managed.isActive !== false), // If backend says active, prefer it
          displayOrder: managed.displayOrder !== undefined ? managed.displayOrder : index,
        };
      })
      .filter((s) => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    setDisplayedSeries(activeSeries);
  }, [managedData, fetchedSeriesMap]);

  // Load DB overrides (thumbnail etc.) for fixed series (s1..s4) in a single call
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/g, '')}/api/testseries/fixed-overrides`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (data && data.overrides) {
          setFetchedSeriesMap(data.overrides);
        }
      } catch (e) {
        console.error('Failed to fetch fixed test series overrides', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
          {displayedSeries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedSeries.map((test) => (
                <div
                  key={test._id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
                >
                  {/* Card Header - Title */}
                  <div className="p-4 border-b border-gray-100 h-32 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {test.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 flex-1">
                      {test.description}
                    </p>
                  </div>

                  {/* Card Middle - Thumbnail Image */}
                  <div className="w-full h-48 bg-gray-100 overflow-hidden">
                    {test.thumbnail ? (
                      <img
                        src={test.thumbnail}
                        alt={test.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-400">
                        <span className="text-white font-semibold text-center px-4">
                          {test.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - Price & Button */}
                  <div className="p-4 space-y-4">
                    <div>
                     
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
          <div className="mt-16 bg-secondary/30 rounded-2xl p-8">
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
                <h3 className="font-semibold text-foreground mb-2">All India Ranking</h3>
                <p className="text-muted-foreground text-sm">Compare your performance with students across India</p>
              </div>
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-primary" size={32} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Expert Solutions</h3>
                <p className="text-muted-foreground text-sm">Detailed solutions and explanations by subject experts</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TestSeries;
