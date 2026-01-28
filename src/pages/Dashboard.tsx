import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, MapPin, FileText, LogOut, User, Loader2, BookOpen, PlayCircle, Lock, Copy, ChevronDown, Upload, Eye, Award, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { enrollmentsAPI, usersAPI, authAPI } from "@/lib/api";
import { getFixedSeriesById } from "@/data/fixedTestSeries";

const menuItems = [
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "test-series", label: "My Test Series", icon: FileText },
  { id: "books", label: "My Books", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "address", label: "Address", icon: MapPin },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("courses");
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [testSeriesSubmissions, setTestSeriesSubmissions] = useState<any>({});
  const [testSeriesPurchases, setTestSeriesPurchases] = useState<any>({});
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<{ seriesId: string; subject: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState<{ seriesId: string; subject: string } | null>(null);
  const [suggestedAnswersWarning, setSuggestedAnswersWarning] = useState<{ seriesId: string; subject: string } | null>(null);

  
  // Form states for settings
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
  });
  
  // Form states for address
  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
  });



  // Handle tab changes from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location]);

  // Load user and enrollments on mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);

      // Fetch complete user data including phone number
      const fetchUserData = async () => {
        try {
          const fullUserData = await authAPI.getMe();
          setUser(fullUserData);
          // Update localStorage with complete user data
          localStorage.setItem('user', JSON.stringify(fullUserData));
          setFormData({
            name: fullUserData.name || '',
            phone: fullUserData.phone || '',
            dateOfBirth: fullUserData.dateOfBirth ? new Date(fullUserData.dateOfBirth).toISOString().split('T')[0] : '',
          });
          setAddressData({
            street: fullUserData.address?.street || '',
            city: fullUserData.address?.city || '',
            state: fullUserData.address?.state || '',
            country: fullUserData.address?.country || 'India',
            postalCode: fullUserData.address?.postalCode || '',
          });
        } catch (err) {
          console.error('Failed to fetch user data:', err);
          // Fallback to localStorage data
          setFormData({
            name: userData.name || '',
            phone: userData.phone || '',
            dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : '',
          });
          setAddressData({
            street: userData.address?.street || '',
            city: userData.address?.city || '',
            state: userData.address?.state || '',
            country: userData.address?.country || 'India',
            postalCode: userData.address?.postalCode || '',
          });
        }
      };

      fetchUserData();
    } catch {
      navigate("/login");
      return;
    }

    fetchEnrollments();
  }, [navigate]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await enrollmentsAPI.getAll();
      let processedEnrollments = (res.enrollments || []).map(enrollment => {
        if (enrollment.testSeriesId && typeof enrollment.testSeriesId === 'string') {
          const fixedSeries = getFixedSeriesById(enrollment.testSeriesId);
          if (fixedSeries) {
            enrollment.testSeriesId = fixedSeries;
          }
        }
        return enrollment;
      });

      // Group enrollments by testSeriesId and merge purchasedSubjects
      const groupedByTestSeries: { [key: string]: any } = {};
      processedEnrollments.forEach(enrollment => {
        const seriesId = enrollment.testSeriesId?._id || enrollment.testSeriesId?.id || enrollment.testSeriesId;
        if (seriesId) {
          if (!groupedByTestSeries[seriesId]) {
            // First purchase of this series
            groupedByTestSeries[seriesId] = { ...enrollment };
          } else {
            // Additional purchase - merge subjects
            const existing = groupedByTestSeries[seriesId];
            const existingSubjects = new Set(existing.purchasedSubjects || []);
            const newSubjects = enrollment.purchasedSubjects || [];
            
            // Merge all subjects from all purchases
            newSubjects.forEach(subject => existingSubjects.add(subject));
            
            // Update merged subjects
            existing.purchasedSubjects = Array.from(existingSubjects);
            
            // Keep the earliest enrollment date for display
            const existingDate = new Date(existing.enrollmentDate);
            const newDate = new Date(enrollment.enrollmentDate);
            if (newDate < existingDate) {
              existing.enrollmentDate = enrollment.enrollmentDate;
            }
            
            // Update expiry to the latest expiry date
            const existingExpiry = existing.expiryDate ? new Date(existing.expiryDate) : null;
            const newExpiry = enrollment.expiryDate ? new Date(enrollment.expiryDate) : null;
            if (!existingExpiry || (newExpiry && newExpiry > existingExpiry)) {
              existing.expiryDate = enrollment.expiryDate;
            }
          }
        }
      });

      // Convert grouped object back to array
      processedEnrollments = Object.values(groupedByTestSeries);
      setEnrolledCourses(processedEnrollments);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedResources = () => {
    try {
      const saved = localStorage.getItem('savedResources');
      if (saved) {
        const resources = JSON.parse(saved);
        setSavedResources(resources);
      }
    } catch (err) {
      console.error('Error loading saved resources:', err);
    }
  };

  // Load test series submissions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('testSeriesSubmissions');
    if (saved) {
      try {
        setTestSeriesSubmissions(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading submissions:', err);
      }
    }

    // Load purchase data
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        const allPurchases = JSON.parse(localStorage.getItem('testSeriesPurchases') || '{}');
        const userPurchases = allPurchases[userObj.id] || [];
        
        // Create a map by series ID for quick lookup
        const purchaseMap: any = {};
        userPurchases.forEach((purchase: any) => {
          purchaseMap[purchase.testSeriesId] = purchase;
        });
        setTestSeriesPurchases(purchaseMap);
      } catch (err) {
        console.error('Error loading purchases:', err);
      }
    }
  }, []);


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const res = await usersAPI.updateProfile({
        name: formData.name,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
      });

      // Update user in localStorage with new data
      const updatedUser = {
        ...user,
        name: (res as any).name,
        phone: (res as any).phone,
        dateOfBirth: (res as any).dateOfBirth,
        address: (res as any).address,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Update profile error:', err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };



  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const res = await usersAPI.updateProfile({
        address: addressData,
      });

      // Update user in localStorage with new address
      const updatedUser = {
        ...user,
        address: (res as any).address,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success('Address updated successfully!');
    } catch (err: any) {
      console.error('Update address error:', err);
      toast.error(err.message || 'Failed to update address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };





  // Show loading while checking auth
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">
            Welcome, {user?.name || 'User'}
          </h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-secondary text-destructive"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {/* My Courses */}
              {activeTab === "courses" && (
                <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
                  <h2 className="text-xl font-semibold mb-6">My Enrolled Courses</h2>
                  {enrolledCourses.filter(e => e.courseId).length > 0 ? (
                    <div className="space-y-4">
                      {enrolledCourses.filter(e => e.courseId).map((enrollment) => (
                        <div key={enrollment._id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg border border-border">
                          <div className="w-24 h-16 bg-gradient-to-br from-primary to-navy rounded-lg flex items-center justify-center overflow-hidden">
                            {enrollment.courseId?.thumbnail ? (
                              <img src={enrollment.courseId.thumbnail} alt={enrollment.courseId.title} className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="text-primary-foreground" size={24} />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{enrollment.courseId?.title || 'Course'}</h3>
                            <p className="text-sm text-muted-foreground">
                              Progress: {enrollment.progress || 0}%
                            </p>
                            <div className="w-full bg-secondary rounded-full h-2 mt-2">
                              <div
                                className="bg-accent h-2 rounded-full transition-all"
                                style={{ width: `${enrollment.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          <Button className="btn-primary" onClick={() => navigate(`/course/${enrollment.courseId?._id}/content`)}>
                            <PlayCircle size={18} className="mr-2" /> Start Course
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Lock className="mx-auto mb-4" size={48} />
                      <p>You haven't enrolled in any courses yet.</p>
                      <p className="text-sm mt-2">Purchase a course to get started!</p>
                      <Button onClick={() => navigate("/classes")} className="btn-primary mt-4">
                        Browse Courses
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "settings" && (
                <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
                  <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>



                  {/* Profile Form */}
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        value={user?.email || ""}
                        className="bg-muted"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Date of Birth</label>
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Profile"
                      )}
                    </Button>
                  </form>
                </div>
              )}


              {activeTab === "address" && (
                <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
                  <h2 className="text-xl font-semibold mb-6">My Address</h2>
                  
                  <form onSubmit={handleUpdateAddress} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Street Address</label>
                      <Input
                        value={addressData.street}
                        onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                        placeholder="Enter street address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">City</label>
                        <Input
                          value={addressData.city}
                          onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">State</label>
                        <Input
                          value={addressData.state}
                          onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                          placeholder="Enter state"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Country</label>
                        <Input
                          value={addressData.country}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Postal Code</label>
                        <Input
                          value={addressData.postalCode}
                          onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                          placeholder="Enter postal code"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Address"
                      )}
                    </Button>

                    {(addressData.street || addressData.city || addressData.state || addressData.postalCode) && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm font-medium text-green-800 mb-2">Address Preview:</p>
                        <p className="text-sm text-green-700">
                          {addressData.street}<br />
                          {addressData.city}, {addressData.state} {addressData.postalCode}<br />
                          {addressData.country}
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {activeTab === "test-series" && (
                <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
                  <h2 className="text-2xl font-semibold mb-8">Your Papers</h2>
                  {enrolledCourses.filter(e => e.testSeriesId).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {enrolledCourses.filter(e => e.testSeriesId).map((enrollment) => {
                        const series = enrollment.testSeriesId;
                        const seriesId = series?._id || series?.id;
                        const purchaseDate = new Date(enrollment.enrollmentDate);
                        const expiryDate = enrollment.expiryDate ? new Date(enrollment.expiryDate) : new Date(purchaseDate.getTime() + 60 * 24 * 60 * 60 * 1000);
                        const isExpired = new Date() > expiryDate;
                        const statusBadge = isExpired ? 'Expired' : 'Active';
                        const statusColor = isExpired ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300';

                        return (
                          <div key={enrollment._id}>
                            {/* Card Container */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                              {/* Header with Status */}
                              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">{series?.title || 'Test Series'}</h3>
                                  <div className="flex gap-2 mt-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}>
                                      {statusBadge}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Details Section */}
                              <div className="p-6 space-y-4">
                                {/* Purchased Subjects */}
                                {enrollment.purchasedSubjects && enrollment.purchasedSubjects.length > 0 && (
                                  <div>
                                    <span className="text-sm text-gray-600">Subjects:</span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {enrollment.purchasedSubjects.map((subject: string) => (
                                        <span key={subject} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                          {subject}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Purchase Date */}
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Purchased on:</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {purchaseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>

                                {/* Expiry Date */}
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Expires at:</span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}, 12:00 AM
                                  </span>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-200"></div>

                                {/* Action Button */}
                                <Button
                                  onClick={() => navigate(`/testseries/${seriesId}/content`)}
                                  className="w-full btn-primary mt-2"
                                >
                                  View Full Details
                                </Button>
                              </div>
                            </div>


                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="mx-auto mb-4" size={48} />
                      <p>You haven't purchased any test series yet.</p>
                      <Button onClick={() => navigate("/test-series")} className="btn-primary mt-4">
                        Browse Test Series
                      </Button>
                    </div>
                  )}


                </div>
              )}

              {activeTab === "books" && (
                <div className="bg-card p-8 rounded-xl shadow-sm border border-border">
                  <h2 className="text-xl font-semibold mb-6">My Books</h2>
                  {enrolledCourses.filter(e => e.bookId).length > 0 ? (
                    <div className="space-y-4">
                      {enrolledCourses.filter(e => e.bookId).map((enrollment) => (
                        <div key={enrollment._id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg border border-border">
                          <div className="w-24 h-16 bg-gradient-to-br from-primary to-navy rounded-lg flex items-center justify-center overflow-hidden">
                            {enrollment.bookId?.thumbnail ? (
                              <img src={enrollment.bookId.thumbnail} alt={enrollment.bookId.title} className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="text-primary-foreground" size={24} />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{enrollment.bookId?.title || 'Book'}</h3>
                            <p className="text-sm text-muted-foreground">Purchased: {new Date(enrollment.enrollmentDate).toLocaleDateString()}</p>
                          </div>
                          <Button className="btn-primary" onClick={() => navigate(`/books/${enrollment.bookId?._id}/read`)}>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="mx-auto mb-4" size={48} />
                      <p>You haven't purchased any books yet.</p>
                      <Button onClick={() => navigate("/books")} className="btn-primary mt-4">
                        Browse Books
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Suggested Answers Warning Modal */}
            {suggestedAnswersWarning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-xl border border-border p-8 max-w-sm w-full shadow-lg">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="text-red-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Important Notice</h3>
                      <p className="text-sm text-muted-foreground mt-1">Before viewing suggested answers</p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-900">
                      <strong>⚠️ Warning:</strong> If you view the suggested answers before submitting your answer sheet, you won't be able to submit your answers later.
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    Make sure you have completed your answer sheet and uploaded it before viewing the suggested answers.
                  </p>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => setSuggestedAnswersWarning(null)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (suggestedAnswersWarning) {
                          // The actual URL would be passed through the modal
                          setSuggestedAnswersWarning(null);
                        }
                      }}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
