import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { BookOpen, Star, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { categoriesAPI, booksAPI } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const Books = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, booksRes] = await Promise.all([
          categoriesAPI.getAll(),
          booksAPI.getAll({ limit: 100 }),
        ]);
        setCategories(categoriesRes.categories || []);
        setBooks(booksRes.books || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setCategories([]);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCategoryChange = async (categoryId: string) => {
    setActiveCategory(categoryId);
    if (categoryId === "All") {
      const res = await booksAPI.getAll({ limit: 100 });
      setBooks(res.books || []);
    } else {
      const res = await booksAPI.getByCategory(categoryId, { limit: 100 });
      setBooks(res.books || []);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });



  const handleViewDetails = (book: any) => {
    navigate(`/books/${book._id}`);
  };

  const handleDownload = (book: any) => {
    if (book.fileUrl) {
      window.open(book.fileUrl, '_blank');
      toast.success('Opening resource...');
    } else {
      toast.error('Download URL not available');
    }
  };

  return (
    <Layout>
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground text-center">
            Books & Study Materials
          </h1>
          <p className="text-primary-foreground/80 text-center mt-2">
            Quality books authored by expert CA faculty
          </p>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              placeholder="Search books..."
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

          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
              </>
            ) : filteredBooks.length > 0 ? (
              filteredBooks.map((book: any, index: number) => (
                <div
                  key={book._id}
                  className="bg-card rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-border animate-fade-in group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="h-56 overflow-hidden relative">
                    <img 
                      src={book.thumbnail || '/placeholder-book.png'} 
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                      <span className="text-xs font-semibold text-primary-foreground bg-green-600 px-3 py-1 rounded-full">
                        Published
                      </span>
                      {book.price > 0 ? (
                        <span className="text-sm font-bold text-primary-foreground bg-primary px-3 py-1 rounded-full">
                          ₨{book.price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-primary-foreground bg-green-600 px-3 py-1 rounded-full">
                          Free
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 min-h-[56px] group-hover:text-primary transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      by {book.createdBy?.name || 'Unknown Author'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[40px]">
                      {book.description || 'No description available'}
                    </p>
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">(4.8)</span>
                    </div>
                    <div className="pt-4 border-t border-border space-y-2">
                      <Button
                        onClick={() => handleViewDetails(book)}
                        size="sm"
                        className="w-full"
                      >
                        <Eye size={16} className="mr-1" />
                        {book.price === 0 ? 'Get Free' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-12 col-span-full">No books found.</p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Books;
