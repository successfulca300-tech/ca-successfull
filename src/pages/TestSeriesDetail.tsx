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
  const [serverMedia, setServerMedia] = useState<{thumbnail?: string, video?: string}>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]); // 'series1', 'series2', 'series3'
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [computedPrice, setComputedPrice] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [totalPapers, setTotalPapers] = useState<number>(0);
  const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);
  const [discountInput, setDiscountInput] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<null | { code: string; type: 'flat' | 'percent'; value: number; label?: string }>(null);
  const [seriesMode, setSeriesMode] = useState<'Scheduled' | 'Unscheduled'>('Scheduled');
  const [userObj, setUserObj] = useState<any>(null);
  const [uploadedPapers, setUploadedPapers] = useState<{ [subject: string]: any[] }>({});
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Load logged-in user if present (do not force login for viewing details)
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        setUserObj(parsed);
      } catch (e) {
        console.error('Failed to parse user from storage', e);
      }
    }
  }, []);

  // Load series data (fixed + managed)
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoading(true);
        const fixed = getFixedSeriesById(id);
        if (fixed) {
          setBaseSeries(fixed as any);

          // If this is a fixed series (S1..S4) — try to load server-managed version (S1 focus)
          try {
            const fixedResp: any = await testSeriesAPI.getFixedManaged(id!);
            if (fixedResp?.success && fixedResp.testSeries) {
              setManagedData(fixedResp.testSeries);
            }
          } catch (err) {
            // ignore server managed absence
          }
        } else {
          const res = await testSeriesAPI.getById(id!);
          setBaseSeries(res as any || null);
        }

        // Load managed data from localStorage as a fallback if none on server
        const managed = localStorage.getItem("testSeriesManagement");
        if (managed && !managedData) {
          try {
            const allManaged = JSON.parse(managed);
            setManagedData(allManaged[id!] || null);
          } catch (err) {
            console.error("Failed to load managed data:", err);
          }
        }

        // Fetch server-side media (thumbnail/video) so subadmin uploads show up for all users
        try {
          const thumbResp = await testSeriesAPI.getMedia(id!, 'thumbnail');
          if (thumbResp?.success && thumbResp.media && thumbResp.media.length > 0) {
            setServerMedia(prev => ({ ...prev, thumbnail: thumbResp.media[0].fileUrl }));
          }
          const videoResp = await testSeriesAPI.getMedia(id!, 'video');
          if (videoResp?.success && videoResp.media && videoResp.media.length > 0) {
            setServerMedia(prev => ({ ...prev, video: videoResp.media[0].fileUrl }));
          }
        } catch (e) {
          // ignore fetch errors
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

  // Detect if this is CA Inter or CA Final
  const isCAInter = id?.startsWith('inter-') || false;

  // Determine how many series this S1 has (managed override > base data > defaults)
  const getSeriesCount = () => {
    if (!baseSeries) return 0;
    const managedCount = managedData?.pricing?.seriesCount || managedData?.seriesCount;
    if (managedCount && Number(managedCount) > 0) return Number(managedCount);
    const baseCount = baseSeries?.pricing?.seriesCount || baseSeries?.seriesCount;
    if (baseCount && Number(baseCount) > 0) return Number(baseCount);
    // Defaults: Inter S1 uses 2, Final S1 uses 3
    return isCAInter ? 2 : (baseSeries.seriesType === 'S1' ? 3 : 0);
  };
  const seriesCount = getSeriesCount();

  // Default overview texts per series (user-provided)
  const SERIES_OVERVIEWS: Record<string, string> = {
    S2: isCAInter ? `50% Syllabus Test Series (CA Inter)

Focused 50% syllabus coverage for CA Inter

2 Papers per subject

50% + 50% syllabus coverage = 100%

Helps in gradual and structured syllabus completion

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided` : `50% Syllabus Test Series

Ideal for students who want to test preparation in two phases

2 Papers per subject

50% + 50% syllabus coverage = 100%

Helps in gradual and structured syllabus completion

Enroll subject-wise, group-wise or in combinations

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    S4: isCAInter ? `CA Successful Specials (Inter)

Designed for serious CA Inter aspirants aiming for exam success

Total 8 papers per subject for multiple revisions

1 Full syllabus paper (100% coverage)

2 Half syllabus papers (50% + 50%)

5 Chapterwise Full syllabus papers (5 Papers)

Comprehensive practice for all topics

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided` : `CA Successful Test Series

Designed for serious CA aspirants aiming for exam success

Total 6 papers per subject for multiple revisions

1 Full syllabus paper (100% coverage)

2 Half syllabus papers (50% + 50%)

3 Part syllabus papers (30% + 30% + 30%)

Complete syllabus covered with repeated practice

Enroll subject-wise or group-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    S1: isCAInter ? `Full Syllabus Test Series (CA Inter)

Full-length exam-oriented question papers

Available in Series 1 & Series 2

Helps in real exam time management practice

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided` : `Full Syllabus Test Series

Best suited for students who have completed the syllabus

Full-length exam-oriented question papers

Available in Series 1, Series 2 & Series 3

Helps in real exam time management practice

Enroll subject-wise, group-wise or series-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
    S3: isCAInter ? `Chapterwise Test Series (CA Inter)

Chapterwise practice divided into manageable parts

5 Papers per subject

Chapter-by-chapter coverage enabling concept clarity

Perfect for topic-wise and chapter-wise preparation

Enroll subject-wise

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided` : `30% Syllabus Test Series

Perfect for early-stage CA preparation

Syllabus divided into smaller and manageable parts

3 Papers per subject

30% + 30% + 30% syllabus coverage = 100%

Helps in concept-wise and topic-wise preparation

Enroll subject-wise, group-wise or in combinations

Expert evaluation within 48-72 hours

Question papers as per ICAI marking scheme

Detailed answer keys provided`,
  };

  // Default disclaimer texts per series (user-provided)
  const SERIES_DISCLAIMERS: Record<string, string> = {
    S1: `This test series is designed specifically for CA exam preparation.

Access to the test series will be provided as per the schedule and plan selected at the time of enrollment.

All enrollments are confirmed upon purchase and are non-refundable.

Technical assistance will be available during standard business hours to ensure a smooth experience.

By enrolling in the test series, students are agree to our terms and conditions.`,
    S2: `This test series is designed specifically for CA exam preparation.

Access to the test series will be provided as per the schedule and plan selected at the time of enrollment.

All enrollments are confirmed upon purchase and are non-refundable.

Technical assistance will be available during standard business hours to ensure a smooth experience.

By enrolling in the test series, students are agree to our terms and conditions.`,
    S3: `This test series is designed specifically for CA exam preparation.

Access to the test series will be provided as per the schedule and plan selected at the time of enrollment.

All enrollments are confirmed upon purchase and are non-refundable.

Technical assistance will be available during standard business hours to ensure a smooth experience.

By enrolling in the test series, students are agree to our terms and conditions.`,
    S4: `This test series is designed specifically for CA exam preparation.

Access to the test series will be provided as per the schedule and plan selected at the time of enrollment.

All enrollments are confirmed upon purchase and are non-refundable.

Technical assistance will be available during standard business hours to ensure a smooth experience.

By enrolling in the test series, students are agree to our terms and conditions.`,
  };

  // Fetch pricing from backend whenever selections change
  useEffect(() => {
    if (!baseSeries || !id) {
      setComputedPrice(null);
      setBasePrice(0);
      setTotalPapers(0);
      return;
    }

    // For S1 (both CA Final and CA Inter), require at least one series selection
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
          id!,
          baseSeries.seriesType === 'S1' ? selectedSeries : [],
          selectedSubjects,
          appliedDiscount?.code || undefined
        );

        if (response?.success && response.pricing) {
          const pricing = response.pricing as any;
          setBasePrice(pricing.basePrice || 0);
          setTotalPapers(pricing.totalPapers || 0);
          setComputedPrice(pricing.finalPrice || 0);
          setPricingBreakdown(pricing.breakdown || null);
        }
      } catch (error) {
        console.error('Error calculating price:', error);
        toast.error('Failed to calculate price');
      }
    };

    fetchPricing();
  }, [baseSeries, selectedSeries, selectedSubjects, appliedDiscount, id, isCAInter]);

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

        if (response?.success && response.papers) {
          setUploadedPapers(response.papers as { [subject: string]: any[] });
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
    // Allow coupon application for any valid selection (including single subject/paper)

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
  const cleanTitle = (t?: string) => (t || '').replace(/^S[2-4]\s+/i, '').trim();
  const displayTitle = cleanTitle(series?.cardTitle || series?.title || baseSeries?.title);
  const formatDate = (value?: string) => {
    if (!value) return 'TBD';
    const trimmed = String(value).trim();
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const day = parsed.getDate();
      const suffix =
        day % 10 === 1 && day !== 11 ? 'st' :
        day % 10 === 2 && day !== 12 ? 'nd' :
        day % 10 === 3 && day !== 13 ? 'rd' : 'th';
      const monthYear = parsed.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      });
      return `${day}${suffix} ${monthYear}`;
    }
    // Handle strings like "Papers will be uploaded from 1st Feb 2026"
    const match = trimmed.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\s+(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      const parsedFromText = new Date(`${day} ${month} ${year}`);
      if (!Number.isNaN(parsedFromText.getTime())) {
        const d = parsedFromText.getDate();
        const suffix =
          d % 10 === 1 && d !== 11 ? 'st' :
          d % 10 === 2 && d !== 12 ? 'nd' :
          d % 10 === 3 && d !== 13 ? 'rd' : 'th';
        const monthYear = parsedFromText.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        });
        return `${d}${suffix} ${monthYear}`;
      }
    }
    return trimmed;
  };
  const isSubadmin = userObj?.role === 'subadmin';
  const showSeriesSelection = baseSeries?.seriesType === 'S1';

  // Derive groups from subjects when `baseSeries.groups` is not provided
  const derivedGroups = (() => {
    const subs = baseSeries?.subjects || [];
    if (!subs || subs.length === 0) return null;
    // Default split: first 3 subjects -> Group 1, remaining -> Group 2
    const group1 = subs.slice(0, 3);
    const group2 = subs.slice(3);
    return { group1, group2 };
  })();
  const groupsToUse = baseSeries?.groups || derivedGroups;

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
                {(series?.cardThumbnail || serverMedia.thumbnail || series?.thumbnail) ? (
                  <img
                    src={series.cardThumbnail || serverMedia.thumbnail || series.thumbnail}
                    alt={displayTitle}
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
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{displayTitle}</h1>
                
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
                      {(() => {
                        const papers = (baseSeries.papersPerSubject ? Object.values(baseSeries.papersPerSubject) : []) as any[];
                        const sum = papers.reduce((a: number, b: any) => a + Number(b || 0), 0);
                        return baseSeries && baseSeries.seriesType === 'S1' ? sum * 3 : sum;
                      })()
                      }
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

              {/* Series Selection - FOR S1 (Both CA Final AND CA Inter) */}
              {baseSeries?.seriesType === 'S1' && (
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    <span className="inline-block w-6 h-6 rounded-full bg-primary text-primary-foreground text-center text-xs font-bold mr-2">1</span>
                    Select Series (Multiple)
                  </label>
                  <div className="space-y-2">
                    {isCAInter ? (
                      // Inter has Series 1, Series 2
                      [
                        { id: 'series1', label: 'Series 1' },
                        { id: 'series2', label: 'Series 2' },
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
                      ))
                    ) : (
                      // Final has Series 1, Series 2, Series 3
                      [
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
                      ))
                    )}
                  </div>
                  {selectedSeries.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-2">⚠️ Select at least one series to continue</p>
                  )}
                </div>
              )}

              {/* Group Selection - Available for both CA Final and CA Inter */}
              {groupsToUse && (
                <div>
                  <label className="block text-sm font-semibold mb-3">
                    <span className="inline-block w-6 h-6 rounded-full bg-primary text-primary-foreground text-center text-xs font-bold mr-2">{baseSeries?.seriesType === 'S1' ? '2' : '1'}</span>
                    Select Group (Single)
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      {v:'Group 1',l:'Group 1', subjects: groupsToUse.group1 || []},
                      {v:'Group 2',l:'Group 2', subjects: groupsToUse.group2 || []},
                      {v:'Both',l:'Both Groups', subjects: baseSeries.subjects || []}
                    ].map((g) => (
                      <button
                        key={g.v}
                        onClick={() => {
                          setSelectedGroup(g.v);
                          setSelectedSubjects(g.subjects);
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
              )}

              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3">
                  <span className="inline-block w-6 h-6 rounded-full bg-primary text-primary-foreground text-center text-xs font-bold mr-2">{baseSeries?.seriesType === 'S1' && baseSeries?.groups ? '3' : baseSeries?.seriesType === 'S1' && !baseSeries?.groups ? '2' : '1'}</span>
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


            </div>

            {/* Live Summary */}
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 h-fit">
              <h3 className="text-lg font-bold mb-4">📋 Order Summary</h3>
              <div className="space-y-3 text-sm">
                {baseSeries?.seriesType === 'S1' && (
                  <div>
                    <p className="text-muted-foreground">Selected Series</p>
                    <p className="font-semibold">{selectedSeries.length > 0 ? `${selectedSeries.length} series` : '—'}</p>
                  </div>
                )}
                {groupsToUse && (
                  <div>
                    <p className="text-muted-foreground">Selected Group</p>
                    <p className="font-semibold">{selectedGroup || '—'}</p>
                  </div>
                )}
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
                {/* subject-wise breakdown */}
                {selectedSubjects.length > 0 && pricingBreakdown && (
                  <div>
                    <p className="text-muted-foreground">Subject-wise Breakdown</p>
                    <ul className="list-disc ml-6 text-xs">
                      {selectedSubjects.map((sub) => {
                        const papers =
                          (pricingBreakdown && pricingBreakdown.papersPerSubject)
                            ? pricingBreakdown.papersPerSubject
                            : baseSeries?.papersPerSubject
                              ? baseSeries.papersPerSubject[sub] || 0
                              : 0;
                        const pricePer = pricingBreakdown.pricePerSubject || 0;
                        return (
                          <li key={sub} className="mt-1">
                            {sub}: {papers} paper{papers !== 1 && 's'} • ₹{pricePer.toLocaleString()}
                          </li>
                        );
                      })}
                    </ul>
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

                  {/* Discount Code moved here (between Final Price and Buy Now) */}
                  <div className="pt-3">
                    <label className="block text-sm font-semibold mb-2">Discount Code</label>
                    <div className="flex gap-2">
                      <input
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        placeholder="Enter discount code"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      />
                        <Button
                          onClick={handleApplyDiscount}
                          disabled={
                            (baseSeries?.seriesType === 'S1' ? selectedSeries.length === 0 : false)
                          }
                          className="text-sm"
                        >
                          Apply
                        </Button>
                    </div>
                    {appliedDiscount && (
                      <p className="text-sm text-green-600 mt-2">✓ {appliedDiscount.label || appliedDiscount.code} applied</p>
                    )}
                      {/* No minimum-subject restriction; coupons can be applied for single subject/paper purchases */}
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
          {
            (() => {
              const overviewText = (series?.overview as string) || SERIES_OVERVIEWS[series?.seriesType] || series?.description || '';
              if (!overviewText) return null;
              return (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-6">Overview</h2>
                  <div className="p-6 bg-card rounded-lg border border-border mb-4">
                    <p className="text-muted-foreground whitespace-pre-wrap">{overviewText}</p>
                  </div>
                </div>
              );
            })()
          }

          {/* 2. Test Series Details - Upload Timeline (Only for S1) */}
          {baseSeries.seriesType === 'S1' && series?.seriesDates && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">Test Series Details</h2>
              <div className="space-y-3 p-6 bg-card rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <Truck className="text-primary flex-shrink-0 mt-1" size={24} />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Series 1</p>
                      <p className="font-semibold">Uploaded from {formatDate(series.seriesDates?.series1UploadDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="text-primary flex-shrink-0 mt-1" size={24} />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Series 2</p>
                      <p className="font-semibold">Uploaded from {formatDate(series.seriesDates?.series2UploadDate)}</p>
                    </div>
                  </div>
                  {seriesCount >= 3 && (
                    <div className="flex items-start gap-3">
                      <Truck className="text-primary flex-shrink-0 mt-1" size={24} />
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Series 3</p>
                        <p className="font-semibold">Uploaded from {formatDate(series.seriesDates?.series3UploadDate)}</p>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 mt-3 flex items-start gap-3">
                    <Clock className="text-primary flex-shrink-0 mt-1" size={24} />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Submission Deadline</p>
                      <p className="font-semibold">
                        Group 1: {formatDate(series.seriesDates?.group1SubmissionDate)} <br /> Group 2: {formatDate(series.seriesDates?.group2SubmissionDate)}
                      </p>
                    </div>
                  </div>
              </div>
            </div>
          )}

          {/* 3. Test Series Schedule - Subject-wise Dates Table */}
          {baseSeries.seriesType === 'S1' && ( (series?.subjectDateSchedule && series.subjectDateSchedule.length > 0) || (baseSeries.subjects && baseSeries.subjects.length > 0) ) && (
            <div className="mb-8 rounded-xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-2xl">📅</span>
                Test Series Schedule
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3 text-left font-semibold">Subject</th>
                      <th className="px-4 py-3 text-left font-semibold">Series 1</th>
                      <th className="px-4 py-3 text-left font-semibold">Series 2</th>
                      {seriesCount >= 3 && <th className="px-4 py-3 text-left font-semibold">Series 3</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-slate-950 text-white">
                    {(() => {
                      const availableSubjects = baseSeries.subjects || [];
                      const schedule = series.subjectDateSchedule && series.subjectDateSchedule.length > 0 ? series.subjectDateSchedule : [];
                      const merged = availableSubjects.map((sub) => {
                        const found = schedule.find((r: any) => r.subject === sub);
                        return found || { subject: sub, series1Date: '', series2Date: '', series3Date: '' };
                      });
                      return merged.map((row: any, index: number) => (
                        <tr key={index} className="border-t border-white/10">
                          <td className="px-4 py-3 font-semibold">{row.subject || '-'}</td>
                          <td className="px-4 py-3">{formatDate(row.series1Date)}</td>
                          <td className="px-4 py-3">{formatDate(row.series2Date)}</td>
                          {seriesCount >= 3 && <td className="px-4 py-3">{formatDate(row.series3Date)}</td>}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {baseSeries.seriesType !== 'S1' && series?.seriesDates && (
              <div className="mb-8 rounded-xl border border-border bg-card p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  Test Series Details
                </h2>
                <p className="text-muted-foreground mb-4">
                  The test series will be uploaded from{" "}
                  <span className="font-semibold text-foreground">
                    {formatDate(series.seriesDates?.series1UploadDate)}
                  </span>
                  .
                </p>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground font-medium">Submission Deadline</p>
                <p className="font-semibold text-foreground">
                  Group 1 : {formatDate(series.seriesDates?.group1SubmissionDate)} <br /> Group 2 : {formatDate(series.seriesDates?.group2SubmissionDate)}
                </p>
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
                  {series?.disclaimer ? (
                    typeof series.disclaimer === 'string' ? (
                      <div className="whitespace-pre-wrap">{series.disclaimer}</div>
                    ) : (
                      <div className="whitespace-pre-wrap">{String(series.disclaimer)}</div>
                    )
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {SERIES_DISCLAIMERS[series?.seriesType] || `This test series is designed for competitive exam preparation.

Access to the test series will be provided as per the schedule and plan selected at the time of enrollment.

All enrollments are confirmed upon purchase and are non-refundable.

Technical assistance will be available during standard business hours to ensure a smooth experience.

By enrolling in the test series, students are agree to our terms and conditions.`}
                    </div>
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
