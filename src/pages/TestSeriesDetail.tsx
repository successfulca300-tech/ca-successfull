import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { testSeriesAPI, enrollmentsAPI, offersAPI } from "@/lib/api";
import { getFixedSeriesById } from '@/data/fixedTestSeries';
import { openRazorpay } from '@/utils/razorpay';
import { Calendar, CheckCircle, ShoppingCart, Download, Play, FileText, AlertCircle, Image as ImageIcon, Upload, Truck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Helper functions for video URL conversion
function getYouTubeEmbedUrl(url: string): string {
  let videoId = '';
  
  if (url.includes('youtu.be')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
  } else if (url.includes('youtube.com')) {
    videoId = url.split('v=')[1]?.split('&')[0] || '';
  }
  
  return `https://www.youtube.com/embed/${videoId}`;
}

function getVimeoEmbedUrl(url: string): string {
  const videoId = url.split('vimeo.com/')[1]?.split('?')[0] || '';
  return `https://player.vimeo.com/video/${videoId}`;
}

const TestSeriesDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [baseSeries, setBaseSeries] = useState<any>(null);
  const [managedData, setManagedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]); // 'series1', 'series2', 'series3'
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [computedPrice, setComputedPrice] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [totalPapers, setTotalPapers] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<null | { code: string; type: 'flat' | 'percent'; value: number; label?: string }>(null);
  const [seriesMode, setSeriesMode] = useState<'Scheduled' | 'Unscheduled'>('Scheduled');
  const [userObj, setUserObj] = useState<any>(null);
  const [uploadedPapers, setUploadedPapers] = useState<{ [subject: string]: any[] }>({});
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }
    const parsed = JSON.parse(user);
    setUserObj(parsed);
  }, [navigate]);

  // Load series data (fixed + managed)
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoading(true);
        const fixed = getFixedSeriesById(id);
        if (fixed) {
          setBaseSeries(fixed as any);
        } else {
          const res = await testSeriesAPI.getById(id!);
          setBaseSeries(res as any || null);
        }

        // Load managed data from localStorage
        const managed = localStorage.getItem("testSeriesManagement");
        if (managed) {
          try {
            const allManaged = JSON.parse(managed);
            setManagedData(allManaged[id!] || null);
          } catch (err) {
            console.error("Failed to load managed data:", err);
          }
        }

        // Check enrollment
        if (userObj) {
          try {
            const checkRes = await enrollmentsAPI.checkEnrollment({ testSeriesId: id! });
            setIsEnrolled(!!(checkRes as any).enrollment);
          } catch (enrollErr) {
            setIsEnrolled(false);
          }
        }
      } catch (err) {
        console.error('Error fetching test series:', err);
        toast.error('Failed to load test series');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSeries();
  }, [id]);

  // Initialize selections
  useEffect(() => {
    if (!baseSeries) return;
    setSelectedGroup(baseSeries.group || null);
    setSelectedSubjects(Array.isArray(baseSeries.subjects) ? [...baseSeries.subjects] : []);
    // Initialize selectedSeries for S1 only
    if (baseSeries.seriesType === 'S1') {
      setSelectedSeries([]);
    }
  }, [baseSeries]);

  // Fetch pricing from backend whenever selections change
  useEffect(() => {
    if (!baseSeries || !id) {
      setComputedPrice(null);
      setBasePrice(0);
      setTotalPapers(0);
      return;
    }

    // For S1, require at least one series selection
    if (baseSeries.seriesType === 'S1' && selectedSeries.length === 0) {
      setComputedPrice(null);
      setBasePrice(0);
      setTotalPapers(0);
      return;
    }

    // Require at least one subject
    if (selectedSubjects.length === 0) {
      setComputedPrice(null);
      setBasePrice(0);
      setTotalPapers(0);
      return;
    }

    const fetchPricing = async () => {
      try {
        const response = await testSeriesAPI.calculatePrice(
          id,
          baseSeries.seriesType === 'S1' ? selectedSeries : [],
          selectedSubjects,
          appliedDiscount?.code || undefined
        );

        if (response.success && response.pricing) {
          const pricing = response.pricing;
          setBasePrice(pricing.basePrice);
          setTotalPapers(pricing.totalPapers);
          setComputedPrice(pricing.finalPrice);
        }
      } catch (error) {
        console.error('Error calculating price:', error);
        toast.error('Failed to calculate price');
      }
    };

    fetchPricing();
  }, [baseSeries, selectedSeries, selectedSubjects, appliedDiscount, id]);

  // Fetch uploaded papers for this test series
  useEffect(() => {
    const fetchPapers = async () => {
      if (!id || !isEnrolled) return;
      
      try {
        setLoadingPapers(true);
        const response = await testSeriesAPI.getPapersGroupedBySubject(id, {
          group: selectedGroup || undefined,
          series: baseSeries?.seriesType === 'S1' && selectedSeries.length > 0 ? selectedSeries[0] : undefined,
        });

        if (response.success && response.papers) {
          setUploadedPapers(response.papers);
        }
      } catch (error) {
        console.error('Error fetching papers:', error);
      } finally {
        setLoadingPapers(false);
      }
    };

    fetchPapers();
  }, [id, isEnrolled, selectedGroup, selectedSeries, baseSeries]);

  const handleApplyDiscount = async () => {
    if (!baseSeries) return;
    const code = (discountInput || '').trim();
    if (!code) {
      toast.error('Enter a discount code');
      return;
    }

    try {
      const res = await offersAPI.validateCoupon(code);
      if (res.valid) {
        const offer = res.offer;
        setAppliedDiscount({
          code: offer.code,
          type: offer.discountType === 'percentage' ? 'percent' : 'flat',
          value: offer.discountValue,
          label: offer.title,
        });
        toast.success(`${offer.title} applied`);
      } else {
        setAppliedDiscount(null);
        toast.error('Invalid discount code');
      }
    } catch (error: any) {
      setAppliedDiscount(null);
      toast.error(error.message || 'Failed to validate coupon');
    }
  };

  const handleEnroll = async () => {
    if (!userObj) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }
    if (userObj.role === 'admin' || userObj.role === 'subadmin') {
      toast.error('Admins and sub-admins cannot purchase');
      return;
    }

    try {
      // For S1, combine selectedSeries and selectedSubjects into purchasedSubjects
      let purchasedSubjectsToSend = selectedSubjects;
      if (baseSeries.seriesType === 'S1') {
        purchasedSubjectsToSend = selectedSeries.flatMap(series => selectedSubjects.map(subject => `${series}-${subject}`));
      }

      // Save purchase details with selected series, group, subjects and deadline
      const purchaseData = {
        testSeriesId: id,
        selectedSeries, // 'series1', 'series2', 'series3'
        selectedGroup,
        selectedSubjects,
        purchaseDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
      };

      // Save to localStorage for access control
      const purchases = JSON.parse(localStorage.getItem('testSeriesPurchases') || '{}');
      if (!purchases[userObj.id]) purchases[userObj.id] = [];
      purchases[userObj.id].push(purchaseData);
      localStorage.setItem('testSeriesPurchases', JSON.stringify(purchases));

      if (computedPrice == null) {
        toast.error('Price calculation error. Please try again.');
        return;
      } else if (computedPrice === 0) {
        await enrollmentsAPI.create({
          testSeriesId: id,
          paymentStatus: 'paid',
          purchasedSubjects: purchasedSubjectsToSend
        });
        toast.success('Test series added to your dashboard!');
        navigate('/dashboard?tab=test-series');
        return;
      } else if (computedPrice > 0) {
        await openRazorpay('testseries', baseSeries, computedPrice, purchasedSubjectsToSend);
      } else {
        toast.error('Invalid price. Please check your selections.');
        return;
      }
    } catch (err: any) {
      console.error('Payment error', err);
      toast.error(err.message || 'Payment failed');
    }
  };



  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <Skeleton className="h-96 mb-8" />
          <Skeleton className="h-40" />
        </div>
      </Layout>
    );
  }

  if (!baseSeries) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Test Series not found</h1>
        </div>
      </Layout>
    );
  }

  const series = managedData || baseSeries;
  const isSubadmin = userObj?.role === 'subadmin';
  const showSeriesSelection = baseSeries?.seriesType === 'S1';

  // Handler for video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const videoData = event.target?.result;
        const existing = JSON.parse(localStorage.getItem('testSeriesManagement') || '{}');
        existing[id] = existing[id] || {};
        existing[id].uploadedVideo = videoData;
        existing[id].uploadedVideoName = file.name;
        localStorage.setItem('testSeriesManagement', JSON.stringify(existing));
        setManagedData({ ...managedData, uploadedVideo: videoData, uploadedVideoName: file.name });
        toast.success('Video uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      <div className="bg-background py-8">
        <div className="container mx-auto px-4">
          
          {/* ============ PAGE HEADER SECTION ============ */}
          <div className="mb-8 p-6 bg-card rounded-xl border border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              {/* Thumbnail Image */}
              <div className="flex flex-col items-center justify-center">
                {series?.thumbnail || series?.cardThumbnail ? (
                  <img
                    src={series.thumbnail || series.cardThumbnail}
                    alt={series.cardTitle || series.title || baseSeries.title}
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-full h-48 bg-secondary rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <ImageIcon size={48} className="text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Title, Price, Mode */}
              <div className="md:col-span-3">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{series.cardTitle || series.title || baseSeries.title}</h1>
                
                <div className="flex items-center gap-6 mb-6 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Price</p>
                    <p className="text-3xl font-bold text-primary">₹{(computedPrice ?? baseSeries.price)?.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Mode</p>
                    <div className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold">
                      {series?.mode || baseSeries.mode || 'Online'}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-muted-foreground">Total Tests</p>
                    <p className="text-xl font-bold">
                      {baseSeries.papersPerSubject && baseSeries.subjects
                        ? baseSeries.seriesType === 'S1'
                          ? Object.values(baseSeries.papersPerSubject).reduce((a, b) => a + b, 0) * 3
                          : Object.values(baseSeries.papersPerSubject).reduce((a, b) => a + b, 0)
                        : 0}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-muted-foreground">Subjects Covered</p>
                    <p className="text-xl font-bold">{baseSeries.subjects?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============ SELECTION FLOW & LIVE SUMMARY ============ */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selection Flow */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 space-y-6">
              <h2 className="text-2xl font-bold">Selection Flow</h2>

              {/* Series Selection - ONLY FOR S1 */}
              {baseSeries?.seriesType === 'S1' && (
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    <span className="inline-block w-6 h-6 rounded-full bg-primary text-primary-foreground text-center text-xs font-bold mr-2">1</span>
                    Select Series (Multiple)
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'series1', label: 'Series 1' },
                      { id: 'series2', label: 'Series 2' },
                      { id: 'series3', label: 'Series 3' },
                    ].map((s) => (
                      <label key={s.id} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/50 transition">
                        <input
                          type="checkbox"
                          checked={selectedSeries.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSeries([...selectedSeries, s.id]);
                            } else {
                              setSelectedSeries(selectedSeries.filter(x => x !== s.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-2 border-primary cursor-pointer"
                        />
                        <span className="font-medium">{s.label}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSeries.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-2">⚠️ Select at least one series to continue</p>
                  )}
                </div>
              )}

              {/* Group Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3">
                  <span className="inline-block w-6 h-6 rounded-full bg-primary text-primary-foreground text-center text-xs font-bold mr-2">{baseSeries?.seriesType === 'S1' ? '2' : '1'}</span>
                  Select Group (Single)
                </label>
                <div className="flex gap-3 flex-wrap">
                  {[{v:'Group 1',l:'Group 1'},{v:'Group 2',l:'Group 2'},{v:'Both',l:'Both Groups'}].map((g) => (
                    <button
                      key={g.v}
                      onClick={() => {
                        setSelectedGroup(g.v);
                        if (g.v === 'Group 1') setSelectedSubjects(['FR', 'AFM', 'Audit']);
                        else if (g.v === 'Group 2') setSelectedSubjects(['DT', 'IDT']);
                        else setSelectedSubjects(['FR', 'AFM', 'Audit', 'DT', 'IDT']);
                      }}
                      disabled={baseSeries?.seriesType === 'S1' ? selectedSeries.length === 0 : false}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                        (baseSeries?.seriesType === 'S1' ? selectedSeries.length === 0 : false)
                          ? 'opacity-50 cursor-not-allowed border-border bg-card'
                          : selectedGroup === g.v
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3">
                  <span className="inline-block w-6 h-6 rounded-full bg-primary text-primary-foreground text-center text-xs font-bold mr-2">{baseSeries?.seriesType === 'S1' ? '3' : '2'}</span>
                  Select Subjects (Multiple)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(baseSeries.subjects || []).map((sub: string) => (
                    <button
                      key={sub}
                      onClick={() =>
                        setSelectedSubjects((prev) =>
                          prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
                        )
                      }
                      disabled={baseSeries?.seriesType === 'S1' ? selectedSeries.length === 0 : false}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition ${
                        (baseSeries?.seriesType === 'S1' ? selectedSeries.length === 0 : false)
                          ? 'opacity-50 cursor-not-allowed border-border bg-card'
                          : selectedSubjects.includes(sub)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Code */}
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-semibold mb-3">Discount Code</label>
                <div className="flex gap-2">
                  <input
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="Enter discount code"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <Button
                    onClick={handleApplyDiscount}
                    disabled={baseSeries?.seriesType === 'S1' ? selectedSeries.length === 0 : false}
                    className="text-sm"
                  >
                    Apply
                  </Button>
                </div>
                {appliedDiscount && (
                  <p className="text-sm text-green-600 mt-2">✓ {appliedDiscount.label || appliedDiscount.code} applied</p>
                )}
              </div>
            </div>

            {/* Live Summary */}
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 h-fit">
              <h3 className="text-lg font-bold mb-4">📋 Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Selected Series</p>
                  <p className="font-semibold">{selectedSeries.length > 0 ? `${selectedSeries.length} series` : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Selected Group</p>
                  <p className="font-semibold">{selectedGroup || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Selected Subjects</p>
                  <p className="font-semibold">{selectedSubjects.length > 0 ? selectedSubjects.join(', ') : '—'}</p>
                </div>
                {totalPapers > 0 && (
                  <div>
                    <p className="text-muted-foreground">Total Papers</p>
                    <p className="font-semibold">{totalPapers}</p>
                  </div>
                )}
                
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Price:</span>
                    <span className="font-semibold">₹{basePrice.toLocaleString()}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-orange-600">
                      <span>Discount:</span>
                      <span className="font-semibold">
                        -{appliedDiscount.type === 'flat' ? `₹${appliedDiscount.value}` : `${appliedDiscount.value}%`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border/30">
                    <span>Final Price:</span>
                    <span className="text-primary">₹{(computedPrice ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Button */}
                {!isEnrolled && (showSeriesSelection ? selectedSeries.length > 0 : true) && selectedGroup && selectedSubjects.length > 0 ? (
                  <Button
                    onClick={handleEnroll}
                    className="w-full mt-4 py-3 text-base font-semibold gap-2"
                  >
                    <ShoppingCart size={18} />
                    {computedPrice && computedPrice > 0 ? `Buy Now • ₹${computedPrice}` : 'Get Free'}
                  </Button>
                ) : !isEnrolled ? (
                  <Button
                    disabled
                    className="w-full mt-4 py-3 text-base opacity-50 cursor-not-allowed"
                  >
                    Complete Selections
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate(`/testseries/${id}/content`)}
                    className="w-full mt-4 py-3 text-base font-semibold"
                  >
                    Open Test Series →
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ============ CONTENT SECTIONS ============ */}

          {/* 1. Overview Section */}
          {series?.description && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Overview</h2>
              {series?.description && (
                <div className="p-6 bg-card rounded-lg border border-border mb-4">
                  <p className="text-muted-foreground whitespace-pre-wrap">{series.description}</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Test Series Details - Upload Timeline (Only for S1) */}
          {baseSeries.seriesType === 'S1' && series?.seriesDates && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Test Series Details</h2>
              <div className="space-y-3 p-6 bg-card rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Truck className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Series 1</p>
                    <p className="font-semibold">Papers will be uploaded by 10th December 2025</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Truck className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Series 2</p>
                    <p className="font-semibold">Papers will be uploaded by 15th February 2026</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Truck className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Series 3</p>
                    <p className="font-semibold">Papers will be uploaded by 20th March 2026</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 mt-3 flex items-start gap-3">
                  <Clock className="text-primary flex-shrink-0 mt-1" size={24} />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">All Series</p>
                    <p className="font-semibold">Submission Deadline: 30th April 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Test Series Schedule - Subject-wise Dates Table */}
          {series?.subjectDateSchedule && series.subjectDateSchedule.length > 0 && (
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-3xl">📅</span>
                Test Series Schedule
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="border border-border px-4 py-3 text-left font-bold text-base bg-yellow-100">SERIES 1</th>
                      <th className="border border-border px-4 py-3 text-left font-bold text-base bg-yellow-100"></th>
                      <th className="border border-border px-4 py-3 text-left font-bold text-base bg-yellow-100">SERIES 2</th>
                      <th className="border border-border px-4 py-3 text-left font-bold text-base bg-yellow-100"></th>
                      <th className="border border-border px-4 py-3 text-left font-bold text-base bg-yellow-100">SERIES 3</th>
                      <th className="border border-border px-4 py-3 text-left font-bold text-base bg-yellow-100"></th>
                    </tr>
                    <tr className="bg-secondary">
                      <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Date</th>
                      <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Subject</th>
                      <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Date</th>
                      <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Subject</th>
                      <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Date</th>
                      <th className="border border-border px-4 py-2 text-left text-sm font-semibold">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.subjectDateSchedule.map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-blue-50/50">
                        <td className="border border-border px-4 py-3 text-center font-bold text-gray-900">{row.series1Date || '-'}</td>
                        <td className="border border-border px-4 py-3 font-bold text-blue-700 text-center">{row.subject || '-'}</td>
                        <td className="border border-border px-4 py-3 text-center font-bold text-gray-900">{row.series2Date || '-'}</td>
                        <td className="border border-border px-4 py-3 font-bold text-blue-700 text-center">{row.subject || '-'}</td>
                        <td className="border border-border px-4 py-3 text-center font-bold text-gray-900">{row.series3Date || '-'}</td>
                        <td className="border border-border px-4 py-3 font-bold text-blue-700 text-center">{row.subject || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Disclaimer */}
          <div className="mb-8 p-6 bg-yellow-50/30 border-2 border-yellow-200/50 rounded-lg">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h2 className="text-2xl font-bold mb-3 text-yellow-900">Disclaimer</h2>
                <div className="text-sm text-yellow-800/80 space-y-2 whitespace-pre-wrap leading-relaxed">
                  {series?.instructions ? (
                    series.instructions
                  ) : (
                    <>
                      <p>• This test series is designed for competitive exam preparation.</p>
                      <p>• Once purchased, access is valid as per the schedule mentioned above.</p>
                      <p>• Refund policy: No refunds after 48 hours of purchase.</p>
                      <p>• Technical support available during business hours.</p>
                      <p>• By purchasing, you agree to our terms and conditions.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-12 mb-8">
            <Button 
              onClick={() => navigate('/test-series')} 
              variant="outline" 
              className="gap-2"
            >
              ← Back to All Test Series
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestSeriesDetail;
