import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { booksAPI, enrollmentsAPI } from "@/lib/api";
import { openRazorpay } from '@/utils/razorpay';
import { GraduationCap, Clock, Calendar, CheckCircle, ShoppingCart, Users, BarChart3, Award, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Check if user is logged in, redirect to login if not
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        const res = await booksAPI.getById(id!);
        // Backend returns book directly, not wrapped in a 'book' property
        setBook(res as any || null);

        // Check if user is enrolled
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const checkRes = await enrollmentsAPI.checkEnrollment({ bookId: id! });
            setIsEnrolled(!!(checkRes as any).enrollment);
          } catch (enrollErr) {
            setIsEnrolled(false);
          }
        }
      } catch (err) {
        console.error('Error fetching book:', err);
        toast.error('Failed to load book');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBook();
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

  if (!book) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Book not found</h1>
        </div>
      </Layout>
    );
  }

  const handleEnroll = async () => {
    const user = localStorage.getItem('user');
    if (!user) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(user);
    if (userObj.role === 'admin' || userObj.role === 'subadmin') {
      toast.error('Admins and sub-admins cannot purchase');
      return;
    }

    try {
      // Handle free books differently
      if (book.price === 0) {
        // Create enrollment for free book
        await enrollmentsAPI.create({ bookId: id, paymentStatus: 'paid' });
        toast.success('Book added to your dashboard!');
        navigate('/dashboard?tab=books');
        return;
      }

      // Handle paid books with Razorpay
      await openRazorpay('book', book);
    } catch (err: any) {
      console.error('Payment error', err);
      toast.error(err.message || 'Payment failed');
    }
  };



  const highlights = [
    "Complete syllabus coverage",
    "High-quality content",
    "Downloadable study materials",
    "Practice questions included",
    "Expert authored content",
    "Lifetime access",
  ];

  return (
    <Layout>
      <div className="bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Book Image & Basic Info */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video bg-gradient-to-br from-primary to-navy rounded-xl overflow-hidden shadow-2xl mb-8">
                {book.thumbnail && (
                  <img
                    src={book.thumbnail}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold opacity-80 mb-2">{book.category?.name || 'Book'}</p>
                      <h1 className="text-2xl md:text-3xl font-bold">{book.title}</h1>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Status Badge */}
              {book.publishStatus === 'draft' && (
                <span className="inline-block bg-yellow-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                  Draft
                </span>
              )}
              {book.publishStatus === 'published' && (
                <span className="inline-block bg-green-600 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                  Published
                </span>
              )}

              {/* Price & Buttons */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold text-foreground">₹{book.price?.toLocaleString() || '0'}</span>
                  {book.originalPrice && book.originalPrice > book.price && (
                    <span className="text-lg text-muted-foreground line-through">₹{book.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {!isEnrolled ? (
                  <div className="flex gap-3 flex-col sm:flex-row">
                    <Button onClick={handleEnroll} className="flex-1 btn-primary py-6 text-lg">
                      <ShoppingCart className="mr-2" size={20} />
                      {book.price > 0 ? 'BUY NOW' : 'GET FREE BOOK'}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button disabled className="w-full py-6 text-lg mb-3">
                      ✓ Already Purchased
                    </Button>
                    <Button onClick={() => navigate(`/books/${id}/read`)} className="w-full btn-primary py-4">
                      Read Book
                    </Button>
                  </div>
                )}
              </div>

              {/* Book Overview Stats */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-6">Book Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {book.author && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <GraduationCap className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Author</p>
                      <p className="font-semibold text-sm truncate">{book.author}</p>
                    </div>
                  )}
                  {book.pages && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <BookOpen className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Pages</p>
                      <p className="font-semibold text-sm">{book.pages}</p>
                    </div>
                  )}
                  {book.level && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <BarChart3 className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Level</p>
                      <p className="font-semibold text-sm capitalize">{book.level}</p>
                    </div>
                  )}
                  {book.enrollmentCount !== undefined && (
                    <div className="p-4 bg-card rounded-lg border border-border">
                      <Users className="text-primary mb-2" size={24} />
                      <p className="text-xs text-muted-foreground mb-1">Students</p>
                      <p className="font-semibold text-sm">{book.enrollmentCount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* About Book */}
              {book.description && (
                <div className="mb-8 p-6 bg-card rounded-lg border border-border">
                  <h2 className="text-2xl font-semibold mb-4">About This Book</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{book.description}</p>
                </div>
              )}

              {/* What You'll Learn */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-6">What You'll Get</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      <span className="font-medium">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Book Chapters/Topics */}
              {book.topics && book.topics.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-6">Book Contents</h2>
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    {book.topics.map((topic: string, index: number) => (
                      <div key={index} className="p-4 border-b border-border last:border-b-0 flex items-start gap-3">
                        <BookOpen className="text-primary flex-shrink-0 mt-1" size={18} />
                        <span>{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Author & Book Details */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Price Summary Card */}
                <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                  <h3 className="text-xl font-semibold mb-4">Book Details</h3>

                  {book.author && (
                    <div className="mb-4 pb-4 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">Author</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {book.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{book.author}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {book.rating !== undefined && (
                    <div className="mb-4 pb-4 border-b border-border flex items-center gap-2">
                      <Award className="text-primary" size={18} />
                      <div>
                        <p className="text-sm text-muted-foreground">Rating</p>
                        <p className="font-semibold">{(book.rating || 4.8).toFixed(1)} ⭐</p>
                      </div>
                    </div>
                  )}

                  {book.pages && (
                    <div className="mb-4 pb-4 border-b border-border flex items-center gap-2">
                      <BookOpen className="text-primary" size={18} />
                      <div>
                        <p className="text-sm text-muted-foreground">Pages</p>
                        <p className="font-semibold">{book.pages} Pages</p>
                      </div>
                    </div>
                  )}

                  {book.level && (
                    <div className="mb-4 flex items-center gap-2">
                      <BarChart3 className="text-primary" size={18} />
                      <div>
                        <p className="text-sm text-muted-foreground">Level</p>
                        <p className="font-semibold capitalize">{book.level}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase Info */}
                <div className="bg-primary/10 p-6 rounded-xl border border-primary/20">
                  <h4 className="font-semibold mb-3 text-foreground">This Book Includes</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Lifetime Access
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      HD Quality Content
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Downloadable PDF
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Practice Questions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={18} />
                      Expert Authored
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

export default BookDetail;
