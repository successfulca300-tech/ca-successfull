import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { testSeriesAPI, enrollmentsAPI, filesAPI, testSeriesAnswerAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, Award, Users, FileText, Clock, Upload, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";

// CourseDocument component for displaying documents inline
const CourseDocument = ({ src, testSeriesId, title, isVisible }: { src: string; testSeriesId?: string; title: string; isVisible: boolean }) => {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await filesAPI.getViewUrl(src, { testSeriesId });
        if (mounted) setDocUrl((res?.url || null) + '#toolbar=0');
      } catch (e) {
        console.error('document load error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [src, testSeriesId, isVisible]);

  if (!isVisible) return null;
  if (loading) return <div className="w-full h-full flex items-center justify-center"><Skeleton className="h-12 w-full"/></div>;
  if (!docUrl) return <div className="text-center text-muted-foreground">Unable to load document.</div>;
  return (
    <div className="w-full h-full relative">
      <iframe
        ref={iframeRef}
        src={docUrl}
        title={title}
        className="w-full h-full border-0"
      />
    </div>
  );
};

// Subject name mapping
const subjectNames: Record<string, string> = {
  'FR': 'Financial Reporting',
  'AFM': 'Advanced Financial Management',
  'Audit': 'Audit and Assurance',
  'DT': 'Direct Tax',
  'IDT': 'Indirect Tax'
};

// Subject display order
const subjectOrder = ['FR', 'AFM', 'Audit', 'DT', 'IDT'];

// Series name mapping
const seriesNames: Record<string, string> = {
  'series1': 'Series 1',
  'series2': 'Series 2',
  'series3': 'Series 3'
};

const TestSeriesContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [purchasedSubjects, setPurchasedSubjects] = useState<string[]>([]);
  const [papers, setPapers] = useState<any>({});
  const [myAnswers, setMyAnswers] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [selectedPdfData, setSelectedPdfData] = useState<{ src: string; title: string } | null>(null);
  const [suggestedAnswerWarning, setSuggestedAnswerWarning] = useState<{ url: string; title: string; paperId: string } | null>(null);
  const [suggestedAnswersViewed, setSuggestedAnswersViewed] = useState<Set<string>>(new Set());

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // Check enrollment
        let enrollment = null;
        try {
          const check = await enrollmentsAPI.checkEnrollment({ testSeriesId: id });
          console.log('[TestSeriesContent] checkEnrollment response:', check);
          enrollment = check?.enrollment || null;
          setEnrolled(!!enrollment);
          // Store purchased subjects if available
          if (enrollment?.purchasedSubjects && enrollment.purchasedSubjects.length > 0) {
            console.log('[TestSeriesContent] Setting purchasedSubjects:', enrollment.purchasedSubjects);
            setPurchasedSubjects(enrollment.purchasedSubjects);
          } else {
            console.log('[TestSeriesContent] No purchasedSubjects found in enrollment');
          }
        } catch (err) {
          console.log('[TestSeriesContent] checkEnrollment error:', err);
          setEnrolled(false);
        }

        if (!enrollment) {
          setLoading(false);
          return;
        }

        // Fetch test series
        try {
          const res: any = await testSeriesAPI.getById(id);
          setSeries(res.testSeries || res);
        } catch (err: any) {
          console.error('Error fetching test series:', err);
          // If test series not found, try to use fixed test series data
          const { FIXED_TEST_SERIES } = await import('@/data/fixedTestSeries');
          const fixedSeries = FIXED_TEST_SERIES.find(s => s._id === id.toLowerCase());
          if (fixedSeries) {
            setSeries(fixedSeries);
          } else {
            throw err;
          }
        }

        // Fetch papers grouped by subject
        const papersRes: any = await testSeriesAPI.getPapersGroupedBySubject(id);
        if (papersRes.papers) {
          setPapers(papersRes.papers);
          // Expand all subjects by default
          setExpandedSubjects(new Set(Object.keys(papersRes.papers)));
        }

        // Fetch my answers
        try {
          const answersRes: any = await testSeriesAnswerAPI.getMyAnswers(id);
          if (answersRes.answers) {
            setMyAnswers(answersRes.answers);
          }
        } catch (err) {
          console.error('Error fetching answers:', err);
        }

        // Fetch statistics for each question paper
        const stats: any = {};
        if (papersRes.papers) {
          for (const subject of Object.keys(papersRes.papers)) {
            for (const paper of papersRes.papers[subject]) {
              // Only fetch statistics for question papers
              if (paper.paperType === 'question') {
                try {
                  const statRes: any = await testSeriesAnswerAPI.getPaperStatistics(paper._id);
                  if (statRes.statistics) {
                    stats[paper._id] = statRes.statistics;
                  }
                } catch (err) {
                  console.error('Error fetching statistics:', err);
                }
              }
            }
          }
        }
        setStatistics(stats);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load test series');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleUploadClick = (paper: any) => {
    // Check if suggested answer was viewed for this paper
    if (suggestedAnswersViewed.has(paper._id)) {
      toast.error('You cannot upload answer sheet after viewing the suggested answer for this question.');
      return;
    }
    setSelectedPaper(paper);
    setUploadFile(null);
    setUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedPaper || !uploadFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('answerSheet', uploadFile);
      formData.append('paperId', selectedPaper._id);
      formData.append('testSeriesId', id!);

      const token = localStorage.getItem('token');
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '') + '/api';
      
      const response = await fetch(`${API_URL}/testseries/answers/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload answer sheet');
      }

      const result = await response.json();
      toast.success('Answer sheet uploaded successfully');
      setUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedPaper(null);

      // Refresh answers
      const answersRes: any = await testSeriesAnswerAPI.getMyAnswers(id!);
      if (answersRes.answers) {
        setMyAnswers(answersRes.answers);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload answer sheet');
    } finally {
      setUploading(false);
    }
  };

  const handleViewFile = async (fileOrId: string, title: string) => {
    try {
      // Use filesAPI to get secure view URL
      const viewUrlRes: any = await filesAPI.getViewUrl(fileOrId, { testSeriesId: id });
      setSelectedPdfData({ src: viewUrlRes.url || fileOrId, title });
      setIsPdfDialogOpen(true);
    } catch (err: any) {
      console.error('Error loading file:', err);
      toast.error(err.message || 'Failed to load file');
    }
  };

  const getMyAnswer = (paperId: string) => {
    return myAnswers.find(a => a.paperId?._id === paperId);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}, ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const getPaperIdentifier = (paper: any) => {
    const subjectCode = paper.subject;
    const seriesCode = paper.series ? seriesNames[paper.series]?.replace('Series ', '') : '';
    const date = new Date(paper.availabilityDate || paper.createdAt);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    return `${subjectCode} ${seriesCode ? seriesCode + ' ' : ''}${day} ${month} ${year}`;
  };

  const getQuestionPaper = (papers: any[], subject: string, series?: string) => {
    return papers.find(p => p.paperType === 'question' && p.subject === subject && (!series || p.series === series));
  };

  const getSuggestedAnswer = (papers: any[], subject: string, series?: string) => {
    return papers.find(p => p.paperType === 'suggested' && p.subject === subject && (!series || p.series === series));
  };

  const getHighestScorerSheet = (papers: any[], subject: string, series?: string) => {
    // For now, return suggested answer as highest scorer sheet
    // In future, this could be the actual highest scorer's evaluated sheet
    return papers.find(p => p.paperType === 'suggested' && p.subject === subject && (!series || p.series === series));
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </Layout>
  );

  if (!series) return null;

  if (!enrolled) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">You are not enrolled</h2>
          <p className="text-muted-foreground mb-6">Please purchase or enroll to access tests and materials.</p>
          <div className="max-w-xs mx-auto">
            <Button onClick={() => navigate(`/testseries/${id}/enroll`)} className="w-full btn-primary">Purchase / Attempt</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Your Papers</h1>
        </div>

        {/* Papers grouped by subject */}
        {Object.keys(papers).length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <FileText className="mx-auto mb-4" size={48} />
            <p>No papers available for this test series yet.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
            {Object.entries(papers).sort(([a], [b]) => subjectOrder.indexOf(a) - subjectOrder.indexOf(b)).filter(([subject]) => {
              // CRITICAL: Only show subjects that were explicitly purchased
              // Never show subjects just because papers exist in the database
              // For backward compatibility, if no purchasedSubjects set, show all subjects
              return purchasedSubjects.length === 0 || purchasedSubjects.includes(subject) || purchasedSubjects.some(ps => ps.endsWith(`-${subject}`));
            }).map(([subject, subjectPapers]: [string, any]) => {
              const subjectName = subjectNames[subject] || subject;
              const isExpanded = expandedSubjects.has(subject);
              
              // Group papers by series for S1, or just show all for S2/S3/S4
              const isS1 = series.seriesType === 'S1';
              const seriesGroups: any = {};
              
              if (isS1) {
                subjectPapers.forEach((paper: any) => {
                  const seriesKey = paper.series || 'no-series';
                  if (!seriesGroups[seriesKey]) {
                    seriesGroups[seriesKey] = [];
                  }
                  seriesGroups[seriesKey].push(paper);
                });
              } else {
                seriesGroups['all'] = subjectPapers;
              }

              return (
                <div key={subject} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* Subject Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSubject(subject)}
                  >
                    <h2 className="text-xl font-semibold">{subjectName}</h2>
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  </div>

                  {/* Papers List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {Object.entries(seriesGroups).filter(([seriesKey]) => {
                        // For S1, only show series that were purchased for this subject
                        if (series.seriesType === 'S1') {
                          return purchasedSubjects.includes(`${seriesKey}-${subject}`) || purchasedSubjects.includes(subject);
                        }
                        return true; // For non-S1, show all
                      }).map(([seriesKey, seriesPapers]: [string, any]) => {
                        const isS1 = series.seriesType === 'S1';
                        const seriesHeader = isS1 && seriesKey !== 'no-series' ? seriesNames[seriesKey] : null;
                        
                        return (
                          <div key={`${subject}-${seriesKey}`}>
                            {/* Series header for S1 */}
                            {seriesHeader && (
                              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
                                <h3 className="text-sm font-semibold text-blue-900">{seriesHeader}</h3>
                              </div>
                            )}
                            
                            {/* Papers in this series */}
                            {seriesPapers.map((paper: any) => {
                              const questionPaper = paper.paperType === 'question' ? paper : null;
                              if (!questionPaper) return null;

                              const suggestedAnswer = seriesPapers.find((p: any) => p.paperType === 'suggested');
                              const highestScorerSheet = seriesPapers.find((p: any) => p.paperType === 'suggested');
                              const myAnswer = getMyAnswer(questionPaper._id);
                              const stats = statistics[questionPaper._id];
                              const hasViewedSuggestedAnswer = suggestedAnswersViewed.has(questionPaper._id);

                              const lastSubmissionDate = questionPaper.availabilityDate 
                                ? new Date(new Date(questionPaper.availabilityDate).getTime() + 24 * 60 * 60 * 1000)
                                : null;

                              return (
                                <div key={questionPaper._id} className="p-4 border-b border-gray-100 last:border-b-0">
                                  {/* Paper Info */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm font-medium text-gray-600">{getPaperIdentifier(questionPaper)}</span>
                                        {myAnswer?.isEvaluated && (
                                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                            Status: Evaluated
                                          </span>
                                        )}
                                        {hasViewedSuggestedAnswer && !myAnswer?.answerSheetUrl && (
                                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                            Cannot Upload - Viewed Suggested Answer
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-600 space-y-1">
                                        {lastSubmissionDate && (
                                          <p>Last Date for Submission: {formatDate(lastSubmissionDate)}</p>
                                        )}
                                        {questionPaper.createdAt && (
                                          <p>Uploaded At: {formatDate(questionPaper.createdAt)}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                              <Button
                                variant="outline"
                                onClick={async () => {
                                  if (!questionPaper.appwriteFileId) {
                                    toast.error('Question paper not available');
                                    return;
                                  }

                                  await handleViewFile(questionPaper.appwriteFileId, 'Question Paper');
                                }}
                                disabled={!questionPaper.appwriteFileId}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Question Paper
                              </Button>
                              <Button
                                variant="outline"
                                onClick={async () => {
                                  if (!highestScorerSheet?.appwriteFileId) {
                                    toast.error('Suggested answer not available');
                                    return;
                                  }
                                  
                                  // If already viewed before, show directly without warning
                                  if (suggestedAnswersViewed.has(questionPaper._id)) {
                                    try {
                                      await handleViewFile(highestScorerSheet.appwriteFileId, 'Suggested Answer');
                                    } catch (err) {
                                      console.error('Error viewing suggested answer:', err);
                                      toast.error('Failed to view suggested answer');
                                    }
                                    return;
                                  }
                                  
                                  // If user hasn't submitted answer yet, show warning
                                  if (!myAnswer || !myAnswer.isSubmitted) {
                                    setSuggestedAnswerWarning({
                                      url: highestScorerSheet.appwriteFileId,
                                      title: 'Suggested Answer',
                                      paperId: questionPaper._id
                                    });
                                  } else {
                                    // User has submitted, allow direct access
                                    try {
                                      await handleViewFile(highestScorerSheet.appwriteFileId, 'Suggested Answer');
                                    } catch (err) {
                                      console.error('Error viewing suggested answer:', err);
                                      toast.error('Failed to view suggested answer');
                                    }
                                  }
                                }}
                                disabled={!highestScorerSheet}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Suggested Answer
                              </Button>
                              <Button
                                variant={myAnswer ? "default" : "outline"}
                                className={myAnswer ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                                onClick={() => {
                                  if (myAnswer?.answerSheetUrl) {
                                    handleViewFile(myAnswer.answerSheetUrl, 'My Answersheet');
                                  } else {
                                    handleUploadClick(questionPaper);
                                  }
                                }}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                My Answersheet
                              </Button>
                              <Button
                                variant={myAnswer?.isEvaluated ? "default" : "outline"}
                                className={myAnswer?.isEvaluated ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                                onClick={() => {
                                  if (myAnswer?.isEvaluated && myAnswer.answerSheetUrl) {
                                    handleViewFile(myAnswer.answerSheetUrl, 'Evaluated Sheet');
                                  }
                                }}
                                disabled={!myAnswer?.isEvaluated}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                EVALUATED SHEET
                              </Button>
                            </div>

                            {/* Scores */}
                            {myAnswer?.isEvaluated && (
                              <div className="mb-4 space-y-2">
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-gray-600">Marks Scored: <span className="text-yellow-600 font-semibold">{myAnswer.marksObtained}</span></span>
                                  {stats && (
                                    <span className="text-sm text-gray-600">
                                      Highest Score: {stats.highestScore || 0} | Avg Marks: {(stats.averageScore || 0).toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                {myAnswer.evaluatorComments && (
                                  <p className="text-sm text-gray-700 italic">{myAnswer.evaluatorComments}</p>
                                )}
                                {myAnswer.isEvaluated && (
                                  <p className="text-sm text-blue-600 font-medium">Check your evaluated sheet.</p>
                                )}
                              </div>
                            )}

                            {/* Upload Button if not submitted */}
                            {!myAnswer && !localStorage.getItem(`viewed_suggested_${questionPaper._id}`) && (
                              <Button
                                onClick={() => handleUploadClick(questionPaper)}
                                className="w-full bg-primary hover:bg-primary/90"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Answer Sheet
                              </Button>
                            )}
                            
                            {/* Warning if user viewed suggested answer before uploading */}
                            {!myAnswer && localStorage.getItem(`viewed_suggested_${questionPaper._id}`) && (
                              <div className="w-full p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                You have already viewed the suggested answer. You cannot upload your answer sheet for evaluation.
                              </div>
                            )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Answer Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select PDF File</label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suggested Answer Warning Dialog */}
      <Dialog open={!!suggestedAnswerWarning} onOpenChange={() => setSuggestedAnswerWarning(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Warning</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              <strong>If you view the suggested answer before uploading your own answer sheet, you will NOT be able to upload your answer sheet later.</strong>
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                Make sure you have completed and uploaded your answer sheet before viewing the suggested answer.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setSuggestedAnswerWarning(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (suggestedAnswerWarning) {
                    try {
                      // Mark this paper as having its suggested answer viewed
                      setSuggestedAnswersViewed(prev => new Set([...prev, suggestedAnswerWarning.paperId]));
                      await handleViewFile(suggestedAnswerWarning.url, suggestedAnswerWarning.title);
                      setSuggestedAnswerWarning(null);
                      toast.info('You will no longer be able to upload your answer sheet for this question.');
                    } catch (err) {
                      console.error('Error viewing suggested answer:', err);
                      toast.error('Failed to view suggested answer');
                    }
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                OK, I Understand. Show Me
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      {isPdfDialogOpen && selectedPdfData && (
        <div className="fixed inset-0 z-50 bg-black">
          <CourseDocument
            src={selectedPdfData.src}
            testSeriesId={id}
            title={selectedPdfData.title}
            isVisible={isPdfDialogOpen}
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white border-none"
            onClick={() => setIsPdfDialogOpen(false)}
          >
            ✕
          </Button>
        </div>
      )}
    </Layout>
  );
};

export default TestSeriesContent;
