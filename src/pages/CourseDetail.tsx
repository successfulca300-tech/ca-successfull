import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { coursesAPI, enrollmentsAPI, filesAPI } from "@/lib/api";
import { openRazorpay } from '@/utils/razorpay';
import { GraduationCap, Clock, Calendar, CheckCircle, ShoppingCart, Users, BarChart3, Award, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Protected Video component for preview
const ProtectedVideo = ({ src, courseId, title }: { src: string; courseId?: string; title: string }) => {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingUrl(true);
        const res: any = await filesAPI.getViewUrl(src, { courseId });
        if (mounted) setPlayUrl(res?.url || null);
      } catch (e) {
        console.error('video token error', e);
      } finally {
        if (mounted) setLoadingUrl(false);
      }
    })();
    return () => { mounted = false; };
  }, [src, courseId]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Right-click save/print is disabled to protect content');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable common save/print shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 'v')) {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
    // Disable F12 (developer tools)
    if (e.key === 'F12') {
      e.preventDefault();
      toast.error('Developer tools are disabled to protect content');
    }
    // Disable Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      toast.error('Screenshots are disabled to protect content');
    }
    // Disable other function keys that might be used for debugging
    if (e.key.startsWith('F') && e.key !== 'F5' && e.key !== 'F11') {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
  };

  if (loadingUrl) return <div className="w-full h-full flex items-center justify-center"><Skeleton className="h-12 w-full"/></div>;
  if (!playUrl) return <div className="text-center text-muted-foreground">Unable to load video.</div>;

  return (
    <div
      className="w-full h-full"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      <video
        controls
        controlsList="nodownload"
        autoPlay={false}
        className="w-full h-full object-cover"
        src={playUrl}
        poster={undefined} // Remove poster for protected video
        onContextMenu={handleContextMenu}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      />
    </div>
  );
};

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any>(null);

  // Check if user is logged in, redirect to login if not
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await coursesAPI.getById(id!);
        // Backend returns course directly, not wrapped in a 'course' property
        setCourse(res as any || null);

        // Check if user is enrolled
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const checkRes = await enrollmentsAPI.checkEnrollment({ courseId: id! });
            setIsEnrolled(!!(checkRes as any).enrollment);
          } catch (enrollErr) {
            setIsEnrolled(false);
          }
        }

        // Fetch preview video - same logic as CourseContent page
        try {
          // First check if course has videoUrl
          if (res.videoUrl) {
            setPreviewVideo({ url: res.videoUrl, title: 'Course Preview Video' });
          } else {
            // Otherwise get first video resource
            const resourcesRes = await resourcesAPI.getByCourseId(id!, {
              type: 'video',
              resourceCategory: 'video',
              limit: 1
            });
            if (resourcesRes.resources && resourcesRes.resources.length > 0) {
              setPreviewVideo(resourcesRes.resources[0]);
            }
          }
        } catch (videoErr) {
          console.error('Error fetching preview video:', videoErr);
          // Don't show error toast for video fetch failure
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        toast.error('Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCourse();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-[4/5]" />
            <div>
              <Skeleton className="h-10 mb-4" />
              <Skeleton className="h-8 mb-6" />
              <Skeleton className="h-12 mb-4" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
        </div>
      </Layout>
    );
  }

  const handleEnroll = async () => {
    const user = localStorage.getItem('user');
    if (!user) {
      toast.error('Please login to enroll');
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(user);
    if (userObj.role === 'admin' || userObj.role === 'subadmin') {
      toast.error('Admins and sub-admins cannot enroll');
      return;
    }

    try {
      // Handle free courses differently
      if (course.price === 0) {
        // Create enrollment for free course
        await enrollmentsAPI.create({ courseId: id, paymentStatus: 'paid' });
        toast.success('Course added to your dashboard!');
        navigate('/dashboard?tab=courses');
        return;
      }

      // Handle paid courses with Razorpay
      await openRazorpay('course', course);
    } catch (err: any) {
      console.error('Payment error', err);
      toast.error(err.message || 'Payment failed');
    }
  };

  const handleAddToCart = async () => {
    const user = localStorage.getItem('user');
    if (!user) {
      toast.error('Please login to add to cart');
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(user);
    if (userObj.role === 'admin' || userObj.role === 'subadmin') {
      toast.error('Cart is disabled for admin/subadmin');
      return;
    }

    try {
      await cartAPI.add(id!, 'course', 1);
      toast.success('Added to cart');
      navigate('/cart');
    } catch (err: any) {
      console.error('Add to cart error', err);
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const highlights = [
    "Complete syllabus coverage",
    "Video lectures in HD quality",
    "Downloadable study materials",
    "Practice questions & mock tests",
    "Doubt clearing sessions",
    "Validity till next attempt",
  ];

  // Content protection handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Right-click save/print is disabled to protect content');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable common save/print shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'c' || e.key === 'a' || e.key === 'x' || e.key === 'v')) {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
    // Disable F12 (developer tools)
    if (e.key === 'F12') {
      e.preventDefault();
      toast.error('Developer tools are disabled to protect content');
    }
    // Disable Print Screen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      toast.error('Screenshots are disabled to protect content');
    }
    // Disable other function keys that might be used for debugging
    if (e.key.startsWith('F') && e.key !== 'F5' && e.key !== 'F11') {
      e.preventDefault();
      toast.error('This action is disabled to protect content');
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    toast.error('Dragging is disabled to protect content');
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Copying is disabled to protect content');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Pasting is disabled to protect content');
  };

  const handleSelectStart = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Text selection is disabled to protect content');
  };

  return (
    <Layout>
      <div
        className="bg-background py-8"
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onDragStart={handleDragStart}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Course Image & Basic Info */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video bg-gradient-to-br from-primary to-navy rounded-xl overflow-hidden shadow-2xl mb-8">
                {course.thumbnail && (
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-80 mb-2">{course.category?.name || 'Course'}</p>
                      <h1 className="text-2xl md:text-3xl font-bold">{course.title}</h1>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Status Badge */}
              {course.publishStatus === 'draft' && (
                <span className="inline-block bg-yellow-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                  Draft
                </span>
              )}
              {course.publishStatus === 'published' && (
                <span className="inline-block bg-green-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                  Published
                </span>
              )}

              {/* Price & Buttons */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold text-foreground">₹{course.price?.toLocaleString() || '0'}</span>
                  {course.originalPrice && course.originalPrice > course.price && (
                    <span className="text-lg text-muted-foreground line-through">₹{course.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {!isEnrolled ? (
                  <div className="flex gap-3 flex-col sm:flex-row">
                    <Button onClick={handleEnroll} className="flex-1 btn-primary py-6 text-lg">
                      <ShoppingCart className="mr-2" size={20} />
                      ENROLL NOW
                    </Button>
                    <Button onClick={handleAddToCart} variant="outline" className="flex-1 py-6">
                      <ShoppingCart className="mr-2" size={20} />
                      Add to Cart
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button disabled className="w-full py-6 text-lg mb-3">
                      ✓ Already Enrolled
                    </Button>
                    <Button onClick={() => navigate(`/course/${id}/content`)} className="w-full btn-primary py-4">
                      Open Course Content
                    </Button>
                  </div>
                )}
              </div>

              {/* Overview Stats */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-6">Course Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {course.instructor && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <GraduationCap className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Instructor</p>
                      <p className="font-semibold text-sm truncate">{course.instructor}</p>
                    </div>
                  )}
                  {course.duration && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <Clock className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <p className="font-semibold text-sm">{course.duration}h</p>
                    </div>
                  )}
                  {course.level && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <BarChart3 className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Level</p>
                      <p className="font-semibold text-sm capitalize">{course.level}</p>
                    </div>
                  )}
                  {course.enrollmentCount !== undefined && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <Users className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Students</p>
                      <p className="font-semibold text-sm">{course.enrollmentCount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* About Course */}
              {course.description && (
                <div className="mb-8 p-6 bg-card rounded-lg border border-border">
                  <h2 className="text-2xl font-semibold mb-4">About This Course</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{course.description}</p>
                </div>
              )}

              {/* Course Preview Video or What You'll Learn */}
              {previewVideo ? (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-6">Course Preview</h2>
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <video
                      controls
                      controlsList="nodownload"
                      className="w-full aspect-video"
                      poster={previewVideo.thumbnail}
                      preload="metadata"
                    >
                      <source src={previewVideo.fileUrl || previewVideo.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-6">What You'll Learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                        <span className="font-medium">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Curriculum */}
              {course.topics && course.topics.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-6">Course Topics</h2>
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    {course.topics.map((topic: string, index: number) => (
                      <div key={index} className="p-4 border-b border-border last:border-b-0 flex items-start gap-3">
                        <BookOpen className="text-primary flex-shrink-0 mt-1" size={18} />
                        <span>{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Instructor & Course Details */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Price Summary Card */}
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                  <h3 className="text-xl font-semibold mb-4">Course Details</h3>
                  
                  {course.instructor && (
                    <div className="mb-4 pb-4 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">Instructor</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {course.instructor.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{course.instructor}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {course.rating !== undefined && (
                    <div className="mb-4 pb-4 border-b border-border flex items-center gap-2">
                      <Award className="text-primary" size={18} />
                      <div>
                        <p className="text-sm text-muted-foreground">Rating</p>
                        <p className="font-semibold">{(course.rating || 4.8).toFixed(1)} ⭐</p>
                      </div>
                    </div>
                  )}

                  {course.duration && (
                    <div className="mb-4 pb-4 border-b border-border flex items-center gap-2">
                      <Clock className="text-primary" size={18} />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{course.duration} Hours</p>
                      </div>
                    </div>
                  )}

                  {course.level && (
                    <div className="mb-4 flex items-center gap-2">
                      <BarChart3 className="text-primary" size={18} />
                      <div>
                        <p className="text-sm text-muted-foreground">Level</p>
                        <p className="font-semibold capitalize">{course.level}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enrollment Info */}
                <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
                  <h4 className="font-semibold mb-3 text-foreground">This Course Includes</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Lifetime Access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      HD Video Lectures
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Study Materials
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Mock Tests & Practice
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Doubt Clearing Support
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetail;
