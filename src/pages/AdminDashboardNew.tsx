import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { dashboardAPI, authAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Users, BookOpen, Tag, Clock } from 'lucide-react';
import Layout from '@/components/layout/Layout';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAdminAndFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check user role
        const user = localStorage.getItem('user');
        if (!user) {
          navigate('/login');
          return;
        }

        const userData = JSON.parse(user);
        if (userData.role !== 'admin') {
          toast({
            title: 'Access Denied',
            description: 'This page is only for administrators',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Fetch dashboard stats
        const statsData = await dashboardAPI.getStats();
        setStats(statsData.stats);
        setRecentEnrollments(statsData.recentEnrollments);
        setPendingActions(statsData.pendingActions);
      } catch (err: any) {
        console.error('Error fetching dashboard:', err);
        setError(err.message || 'Failed to load dashboard data');
        toast({
          title: 'Error',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    validateAdminAndFetch();
  }, [navigate, toast]);

  const handleLogout = async () => {
    try {
      authAPI.logout();
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully',
      });
      navigate('/login');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{loading ? '-' : value}</span>
          <span className="text-3xl opacity-20">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (error && !loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-destructive/10 border border-destructive text-destructive p-6 rounded-lg">
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your platform content and users</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <StatCard title="Total Users" value={stats?.totalUsers || 0} icon="👥" color="border-l-blue-500" />
              <StatCard title="Total Courses" value={stats?.totalCourses || 0} icon="📚" color="border-l-green-500" />
              <StatCard title="Active Offers" value={stats?.activeOffers || 0} icon="🏷️" color="border-l-yellow-500" />
              <StatCard title="Pending Requests" value={stats?.pendingPublishRequests || 0} icon="📋" color="border-l-red-500" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recent Enrollments
              </CardTitle>
              <CardDescription>Latest student course enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentEnrollments.length > 0 ? (
                <div className="space-y-3">
                  {recentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{enrollment.userName}</p>
                        <p className="text-sm text-muted-foreground">{enrollment.courseTitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent enrollments</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Actions
              </CardTitle>
              <CardDescription>Items awaiting your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : pendingActions.length > 0 ? (
                <div className="space-y-2">
                  {pendingActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold bg-yellow-200 dark:bg-yellow-800 rounded-full">
                        {action.count}
                      </span>
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No pending actions</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={() => navigate('/admin/courses')}>
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Courses
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/offers')}>
                <Tag className="mr-2 h-4 w-4" />
                Manage Offers
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/categories')}>
                <Tag className="mr-2 h-4 w-4" />
                Categories
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/resources')}>
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Resources
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/users')}>
                <Users className="mr-2 h-4 w-4" />
                Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
