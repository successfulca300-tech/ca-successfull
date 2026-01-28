import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CourseCard from "@/components/courses/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { coursesAPI, categoriesAPI } from "@/lib/api";
import { ArrowRight } from "lucide-react";

const CoursesSection = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, coursesRes] = await Promise.all([
          categoriesAPI.getAll(),
          coursesAPI.getAll({ limit: 4 }),
        ]);
        
        setCategories(categoriesRes.categories || []);
        setCourses(coursesRes.courses || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCategoryChange = async (categoryId: string) => {
    setActiveCategory(categoryId);
    try {
      const res = await coursesAPI.getByCategory(categoryId, { limit: 4 });
      setCourses(res.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const categoryOptions = [
    { id: "All", name: "All" },
    ...categories.slice(0, 3).map(cat => ({ id: cat._id, name: cat.name })),
  ];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">Learn from the Best</span>
          <h2 className="section-title mt-2">Explore Popular Courses</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Comprehensive courses designed by AIR holders and experienced faculty to help you crack CA/CMA exams
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categoryOptions.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-200 ${
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground border border-border hover:border-primary hover:text-primary"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </>
          ) : courses.length > 0 ? (
            courses.map((course, index) => (
              <CourseCard key={course._id} course={course} index={index} />
            ))
          ) : (
            <p className="text-center text-muted-foreground col-span-full">No courses found</p>
          )}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/classes"
            className="inline-flex items-center gap-2 btn-primary group"
          >
            View All Courses
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;