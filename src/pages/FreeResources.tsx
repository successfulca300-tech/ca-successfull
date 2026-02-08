import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { ChevronRight, Download, FileText, Lock, BookOpen, PlayCircle, FileText as TestIcon } from "lucide-react";
import { categoriesAPI, coursesAPI, testSeriesAPI, booksAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePublishedResources } from "@/hooks/usePublishedResources";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FreeResources = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [categories, setCategories] = useState<any[]>([]);
  const [freeCourses, setFreeCourses] = useState<any[]>([]);
  const [freeTestSeries, setFreeTestSeries] = useState<any[]>([]);
  const [freeBooks, setFreeBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { resources: freeNotes, loading: freeNotesLoading } = usePublishedResources({
    resourceCategory: 'notes',
    category: activeCategory !== 'All' ? activeCategory : undefined,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catsRes = await categoriesAPI.getAll();
        setCategories(catsRes.categories || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchFreeResources = async () => {
      try {
        setLoading(true);

        // Fetch free courses
        const coursesRes = await coursesAPI.getAll();
        const freeCoursesData = coursesRes.courses?.filter((course: any) => course.price === 0 || course.isFree) || [];
        setFreeCourses(freeCoursesData);

        // Fetch free test series
        const testSeriesRes = await testSeriesAPI.getAll();
        const freeTestSeriesData = testSeriesRes.testSeries?.filter((ts: any) => ts.price === 0 || ts.isFree) || [];
        setFreeTestSeries(freeTestSeriesData);

        // Fetch free books
        const booksRes = await booksAPI.getAll();
        const freeBooksData = booksRes.books?.filter((book: any) => book.price === 0 || book.isFree) || [];
        setFreeBooks(freeBooksData);

      } catch (err) {
        console.error('Error fetching free resources:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFreeResources();
  }, []);

  const hasFreeResources = freeCourses.length > 0 || freeTestSeries.length > 0 || freeBooks.length > 0 || freeNotes.length > 0;

  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            Free Resources
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            Access free study materials, courses, test series, books, and notes
          </p>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-200 ${
                activeCategory === "All"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-foreground border border-border hover:border-primary hover:text-primary"
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={() => setActiveCategory(category._id)}
                className={`px-6 py-2.5 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category._id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-foreground border border-border hover:border-primary hover:text-primary"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {loading || freeNotesLoading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-6">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, j) => (
                      <Card key={j} className="overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                        <CardContent className="p-4 space-y-3">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-8 w-24" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : hasFreeResources ? (
            <div className="space-y-12">
              {/* Free Courses */}
              {freeCourses.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <PlayCircle className="text-blue-600" size={24} />
                    Free Courses
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freeCourses.map((course) => (
                      <Card key={course._id} className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <PlayCircle className="text-white" size={48} />
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Free Course
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mb-2 line-clamp-2">{course.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {course.description || 'Comprehensive course content'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{course.duration || 'Self-paced'}</span>
                            <Button asChild size="sm">
                              <Link to={`/course/${course._id}`}>
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Start Learning
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Test Series */}
              {freeTestSeries.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <FileText className="text-purple-600" size={24} />
                    Free Test Series
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freeTestSeries.map((testSeries) => (
                      <Card key={testSeries._id} className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                          {testSeries.thumbnail ? (
                            <img src={testSeries.thumbnail} alt={testSeries.title} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="text-white" size={48} />
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Free Test Series
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mb-2 line-clamp-2">{testSeries.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {testSeries.description || 'Practice tests and mock exams'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{testSeries.totalTests || testSeries.tests?.length || 0} Tests</span>
                            <Button asChild size="sm">
                              <Link to={`/testseries/${testSeries._id}`}>
                                <FileText className="w-4 h-4 mr-2" />
                                View Tests
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Books */}
              {freeBooks.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <BookOpen className="text-orange-600" size={24} />
                    Free Books
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freeBooks.map((book) => (
                      <Card key={book._id} className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                          {book.thumbnail ? (
                            <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="text-white" size={48} />
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Free Book
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mb-2 line-clamp-2">{book.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {book.description || 'Educational book and study material'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{book.pages || 0} Pages</span>
                            <Button asChild size="sm">
                              <Link to={`/books/${book._id}`}>
                                <Download className="w-4 h-4 mr-2" />
                                View Book
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Notes/Resources */}
              {freeNotes.length > 0 && (
                <div>
                  <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <FileText className="text-green-600" size={24} />
                    Free Study Notes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freeNotes.map((note) => (
                      <Card key={note._id} className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                          {note.thumbnail ? (
                            <img src={note.thumbnail} alt={note.title} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="text-white" size={48} />
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Free Notes
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mb-2 line-clamp-2">{note.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {note.description || 'Study notes and materials'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">by {note.createdBy?.name || 'Author'}</span>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!user) {
                                  toast.error('Please login to view');
                                  navigate('/login');
                                  return;
                                }
                                if (note.fileUrl) window.open(note.fileUrl, '_blank');
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">No Free Resources Found</h3>
              <p>Check back later for new free educational content.</p>
            </div>
          )}

          {/* Login Prompt - Only show when user is not logged in */}
          {!user && (
            <div className="mt-12 bg-secondary/50 rounded-xl p-8 text-center border border-border">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Want More Resources?</h3>
              <p className="text-muted-foreground mb-4">
                Sign up for free to access 100+ additional study materials and exclusive content
              </p>
              <Button
                className="btn-primary"
                onClick={() => navigate("/login?tab=signup")}
              >
                Sign Up for Free
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default FreeResources;
