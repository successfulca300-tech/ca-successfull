  import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { categoriesAPI, coursesAPI } from "@/lib/api";
import CourseCard from "@/components/courses/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";

const Classes = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, coursesRes] = await Promise.all([
          categoriesAPI.getAll(),
          coursesAPI.getAll({ limit: 100 }),
        ]);

        setCategories(categoriesRes.categories || []);
        setCourses(coursesRes.courses || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setCategories([]);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCategoryChange = async (categoryId: string) => {
    setActiveCategory(categoryId);
    if (categoryId === "All") {
      const res = await coursesAPI.getAll({ limit: 100 });
      setCourses(res.courses || []);
    } else {
      const res = await coursesAPI.getByCategory(categoryId, { limit: 100 });
      setCourses(res.courses || []);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            Our Courses
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            Comprehensive courses for CA, CMA & CS preparation
          </p>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => handleCategoryChange("All")}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                activeCategory === "All"
                  ? "bg-accent text-accent-foreground border-2 border-accent"
                  : "bg-card text-foreground border-2 border-border hover:border-accent"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={() => handleCategoryChange(category._id)}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category._id
                    ? "bg-accent text-accent-foreground border-2 border-accent"
                    : "bg-card text-foreground border-2 border-border hover:border-accent"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Course Grid - All Courses */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-80 rounded-xl" />
                ))}
              </>
            ) : filteredCourses.length > 0 ? (
              filteredCourses.map((course, index) => (
                <CourseCard key={course._id} course={course} index={index} />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-12 col-span-full">No courses found.</p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Classes;
