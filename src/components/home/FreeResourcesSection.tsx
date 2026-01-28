import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, PlayCircle, Download } from "lucide-react";
import { coursesAPI, testSeriesAPI, booksAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const FreeResourcesSection = () => {
  const [freeCourses, setFreeCourses] = useState<any[]>([]);
  const [freeTestSeries, setFreeTestSeries] = useState<any[]>([]);
  const [freeBooks, setFreeBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFreeResources = async () => {
      try {
        setLoading(true);

        // Fetch free courses (assuming price = 0 or free flag)
        const coursesRes = await coursesAPI.getAll();
        const freeCoursesData = coursesRes.courses?.filter((course: any) => course.price === 0 || course.isFree) || [];
        setFreeCourses(freeCoursesData.slice(0, 3)); // Show only 3

        // Fetch free test series
        const testSeriesRes = await testSeriesAPI.getAll();
        const freeTestSeriesData = testSeriesRes.testSeries?.filter((ts: any) => ts.price === 0 || ts.isFree) || [];
        setFreeTestSeries(freeTestSeriesData.slice(0, 3)); // Show only 3

        // Fetch free books
        const booksRes = await booksAPI.getAll();
        const freeBooksData = booksRes.books?.filter((book: any) => book.price === 0 || book.isFree) || [];
        setFreeBooks(freeBooksData.slice(0, 3)); // Show only 3

      } catch (err) {
        console.error('Error fetching free resources:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFreeResources();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Free Learning Resources</h2>
            <p className="text-lg text-gray-600">Loading free courses, test series, and books...</p>
          </div>
        </div>
      </section>
    );
  }

  const hasFreeResources = freeCourses.length > 0 || freeTestSeries.length > 0 || freeBooks.length > 0;

  if (!hasFreeResources) {
    return null; // Don't show section if no free resources
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Free Learning Resources</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Access high-quality educational content completely free. Start your learning journey today!
          </p>
        </div>

        <div className="space-y-12">
          {/* Free Courses */}
          {freeCourses.length > 0 && (
            <div>
              <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <BookOpen className="text-blue-600" size={24} />
                Free Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeCourses.map((course) => (
                  <Card key={course._id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Free
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {course.description || 'Comprehensive course content'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{course.duration || 'Self-paced'}</span>
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
                  <Card key={testSeries._id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Free
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{testSeries.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {testSeries.description || 'Practice tests and mock exams'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{testSeries.totalTests || testSeries.tests?.length || 0} Tests</span>
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
                  <Card key={book._id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Free
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{book.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {book.description || 'Educational book and study material'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{book.pages || 0} Pages</span>
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
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button asChild size="lg" className="btn-primary">
            <Link to="/free-resources">
              View All Free Resources
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FreeResourcesSection;
