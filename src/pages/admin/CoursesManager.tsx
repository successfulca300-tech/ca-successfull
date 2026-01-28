import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { coursesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2, Eye, Plus, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const CoursesManager = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Check admin access
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      navigate("/");
      return;
    }
    fetchCourses();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await coursesAPI.getAll({ limit: 100 });
      setCourses(res.courses || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await coursesAPI.delete(id);
      setCourses(courses.filter((c) => c._id !== id));
      toast.success("Course deleted successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete course");
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary-foreground">Courses Manager</h1>
            <Button onClick={() => navigate("/admin/courses/create")} className="btn-primary">
              <Plus size={18} className="mr-2" /> New Course
            </Button>
          </div>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid gap-6">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </>
            ) : filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <div key={course._id} className="bg-card p-6 rounded-xl border border-border flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{course.title}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        course.publishStatus === 'published' ? 'bg-green-100 text-green-700' :
                        course.publishStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {course.publishStatus}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{course.description?.substring(0, 100)}...</p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>₹{course.price?.toLocaleString() || '0'}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {course.duration}h
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} /> {course.enrollmentCount || 0} enrolled
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/courses/${course._id}`)}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/admin/courses/edit/${course._id}`)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(course._id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-12">No courses found.</p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CoursesManager;
