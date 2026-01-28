import { useEffect, useState } from "react";
import { dashboardAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const StatsSection = () => {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [realStatsData, setRealStatsData] = useState<any>(null);

  // Dummy stats to attract users - showing impressive numbers
  const dummyStats = [
    { number: '10,000+', label: 'Students' },
    { number: '500+', label: 'Courses' },
    { number: '200+', label: 'Test Series' },
    { number: '50+', label: 'Active Offers' },
    { number: '1,000+', label: 'Resources' },
    { number: '25+', label: 'Pending Requests' },
  ];

  useEffect(() => {
    // Only fetch real stats if user is admin
    if (userRole === 'admin') {
      const fetchStats = async () => {
        try {
          setLoading(true);
          const res = await dashboardAPI.getStats();
          setRealStatsData(res.stats || null);
        } catch (err) {
          console.error('Error fetching stats:', err);
          setRealStatsData(null);
        } finally {
          setLoading(false);
        }
      };
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  // Show real stats for admin, dummy stats for everyone else
  const displayStats = userRole === 'admin' && realStatsData ? [
    { number: realStatsData.totalUsers?.toString() || '0', label: 'Students' },
    { number: realStatsData.totalCourses?.toString() || '0', label: 'Courses' },
    { number: realStatsData.totalTestSeries?.toString() || '0', label: 'Test Series' },
    { number: realStatsData.activeOffers?.toString() || '0', label: 'Active Offers' },
    { number: realStatsData.totalResources?.toString() || '0', label: 'Resources' },
    { number: realStatsData.pendingPublishRequests?.toString() || '0', label: 'Pending Requests' },
  ] : dummyStats;

  return (
    <section className="py-12 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {userRole === 'admin' && loading ? (
            [1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            displayStats.map((stat, index) => (
              <div
                key={index}
                className="stat-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="stat-number">{stat.number}</p>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
