import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  FileText,
  Upload,
  LogOut,
  Eye,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Copy,
  Star,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { testSeriesAnswerAPI, copyRequestAPI } from "@/lib/api";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [assignedAnswers, setAssignedAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnswerId, setExpandedAnswerId] = useState<string | null>(null);
  
  // Copy request state
  const [copiesRequested, setCopiesRequested] = useState('');
  const [copyRequestReason, setCopyRequestReason] = useState('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestingCopies, setRequestingCopies] = useState(false);
  const [teacherFeedback, setTeacherFeedback] = useState<any>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // Evaluation dialog state
  const [evaluateDialogOpen, setEvaluateDialogOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [evaluatedFile, setEvaluatedFile] = useState<File | null>(null);
  const [evaluationData, setEvaluationData] = useState({
    marksObtained: '',
    maxMarks: '100',
    evaluatorComments: ''
  });
  const [uploadingEvaluation, setUploadingEvaluation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth and fetch data
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    
    const userData = JSON.parse(userStr);
    if (userData.role !== 'teacher') {
      toast.error('Only teachers can access this page');
      navigate('/login');
      return;
    }
    
    setUser(userData);
    fetchAssignedAnswers();
    fetchTeacherFeedback();
  }, [navigate]);

  const fetchAssignedAnswers = async () => {
    setLoading(true);
    try {
      const res: any = await testSeriesAnswerAPI.getTeacherAssignedAnswers();
      if (res.answers) {
        setAssignedAnswers(res.answers);
      }
    } catch (err: any) {
      console.error('Error fetching assigned answers:', err);
      toast.error(err.message || 'Failed to load assigned answers');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherFeedback = async () => {
    setFeedbackLoading(true);
    try {
      console.log('Fetching teacher feedback...');
      const res: any = await copyRequestAPI.getTeacherFeedback();
      console.log('Feedback response:', res);
      
      if (res && (res.success === undefined || res.success === true)) {
        // Extract feedback data from response (it's on the root level, not under data key)
        const feedbackData = {
          feedback: res.feedback,
          feedbackUpdatedAt: res.feedbackUpdatedAt,
          warnings: res.warnings || [],
          rating: res.rating || 0,
          stats: res.stats || { totalRequested: 0, totalApproved: 0, totalEvaluated: 0, avgEvalTime: 0 },
        };
        console.log('Setting feedback:', feedbackData);
        setTeacherFeedback(feedbackData);
      } else {
        console.warn('No feedback data returned');
      }
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRequestMoreCopies = async () => {
    if (!copiesRequested || parseInt(copiesRequested) < 1) {
      toast.error('Please enter a valid number of copies');
      return;
    }

    setRequestingCopies(true);
    try {
      console.log('Requesting more copies:', copiesRequested);
      const res: any = await copyRequestAPI.requestMoreCopies(
        parseInt(copiesRequested),
        copyRequestReason
      );
      console.log('Request response:', res);
      
      if (res && (res.success === undefined || res.success === true)) {
        toast.success('Copy request submitted successfully');
        setCopiesRequested('');
        setCopyRequestReason('');
        setRequestDialogOpen(false);
        fetchTeacherFeedback();
      } else {
        toast.error(res?.message || 'Failed to request copies');
      }
    } catch (err: any) {
      console.error('Error requesting copies:', err);
      toast.error(err.message || 'Failed to request copies');
    } finally {
      setRequestingCopies(false);
    }
  };

  const handleEvaluateClick = (answer: any) => {
    setSelectedAnswer(answer);
    setEvaluationData({
      marksObtained: answer.marksObtained?.toString() || '',
      maxMarks: answer.maxMarks?.toString() || '100',
      evaluatorComments: answer.evaluatorComments || ''
    });
    setEvaluatedFile(null);
    setEvaluateDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      setEvaluatedFile(file);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedAnswer) return;
    if (!evaluatedFile) {
      toast.error('Please select a PDF file');
      return;
    }
    if (!evaluationData.marksObtained) {
      toast.error('Please enter marks obtained');
      return;
    }

    setUploadingEvaluation(true);
    try {
      await testSeriesAnswerAPI.uploadTeacherEvaluatedSheet(
        selectedAnswer._id,
        evaluatedFile,
        parseFloat(evaluationData.marksObtained) || 0,
        parseFloat(evaluationData.maxMarks) || 100,
        evaluationData.evaluatorComments
      );
      toast.success('Evaluation uploaded successfully');
      setEvaluateDialogOpen(false);
      setEvaluatedFile(null);
      fetchAssignedAnswers();
    } catch (err: any) {
      console.error('Evaluation error:', err);
      toast.error(err.message || 'Failed to upload evaluation');
    } finally {
      setUploadingEvaluation(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-primary py-6">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground">
                Teacher Dashboard
              </h1>
              <p className="text-primary-foreground/80 mt-2">
                Welcome, {user?.name || 'Teacher'}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <section className="py-8 bg-background min-h-screen">
          <div className="container mx-auto px-4 space-y-6">
            {/* Feedback & Rating Section */}
            {!feedbackLoading && teacherFeedback && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <h2 className="text-2xl font-bold mb-4">Admin Feedback & Rating</h2>
                
                {/* Rating */}
                {teacherFeedback.rating > 0 && (
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="text-yellow-500 fill-yellow-500" size={20} />
                      <span className="font-semibold text-lg">{teacherFeedback.rating}/5</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Overall Performance Rating</p>
                  </div>
                )}

                {/* Feedback Text */}
                {teacherFeedback.feedback && (
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={18} className="text-blue-500" />
                      <h3 className="font-semibold">Feedback</h3>
                    </div>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{teacherFeedback.feedback}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(teacherFeedback.feedbackUpdatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}

                {/* Warnings */}
                {teacherFeedback.warnings && teacherFeedback.warnings.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={18} className="text-red-500" />
                      <h3 className="font-semibold text-red-700">Warnings</h3>
                    </div>
                    <div className="space-y-2">
                      {teacherFeedback.warnings.map((warning: any, idx: number) => (
                        <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-red-700 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-red-900 capitalize">{warning.type}</p>
                              <p className="text-sm text-red-800">{warning.message}</p>
                              <p className="text-xs text-red-700 mt-1">
                                {new Date(warning.issuedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {teacherFeedback.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Requested</p>
                      <p className="font-bold text-lg">{teacherFeedback.stats.totalRequested}</p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Approved</p>
                      <p className="font-bold text-lg">{teacherFeedback.stats.totalApproved}</p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Evaluated</p>
                      <p className="font-bold text-lg">{teacherFeedback.stats.totalEvaluated}</p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Avg Eval Time</p>
                      <p className="font-bold text-lg">{teacherFeedback.stats.avgEvalTime}h</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Request More Copies Section */}
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Copy size={24} className="text-blue-500" />
                    Request Additional Copies
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">Request more answer sheets for evaluation</p>
                </div>
                <Button onClick={() => setRequestDialogOpen(true)} className="gap-2">
                  <Copy size={18} />
                  New Request
                </Button>
              </div>
            </div>

            {/* Assigned Answer Sheets Section */}
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Assigned Answer Sheets</h2>
                  <p className="text-muted-foreground text-sm mt-1">View and evaluate students' submissions</p>
                </div>
                <Button onClick={fetchAssignedAnswers} variant="outline">
                  Refresh
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto animate-spin text-muted-foreground mb-4" size={48} />
                  <p className="text-muted-foreground">Loading answer sheets...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedAnswers.length === 0 ? (
                    <div className="text-center py-12 bg-secondary/30 rounded-lg">
                      <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">No answer sheets assigned yet</p>
                      <p className="text-muted-foreground text-sm mt-2">SubAdmin will assign sheets to you for evaluation</p>
                    </div>
                  ) : (
                    assignedAnswers.map((answer: any) => (
                      <div
                        key={answer._id}
                        className="border border-border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
                      >
                        {/* Header - Always Visible */}
                        <div
                          onClick={() =>
                            setExpandedAnswerId(
                              expandedAnswerId === answer._id ? null : answer._id
                            )
                          }
                          className="p-5 cursor-pointer hover:bg-secondary/50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {answer.userId?.name || "Unknown Student"}
                                </h3>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                  {answer.paperId?.subject || "N/A"}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {answer.paperId?.testSeriesId?.title || "Test Series"}
                                {answer.paperId?.paperNumber && ` - Paper ${answer.paperId.paperNumber}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              {answer.isEvaluated ? (
                                <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-lg">
                                  <CheckCircle size={16} className="text-green-700" />
                                  <span className="text-xs font-semibold text-green-700">Evaluated</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-lg">
                                  <AlertCircle size={16} className="text-amber-700" />
                                  <span className="text-xs font-semibold text-amber-700">Pending</span>
                                </div>
                              )}

                              {expandedAnswerId === answer._id ? (
                                <ChevronUp size={20} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={20} className="text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedAnswerId === answer._id && (
                          <div className="border-t border-border p-5 bg-secondary/30">
                            {/* Student Info */}
                            <div className="mb-6 pb-6 border-b border-border">
                              <h4 className="font-semibold mb-2">Student Information</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Name</p>
                                  <p className="font-medium">{answer.userId?.name}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Email</p>
                                  <p className="font-medium">{answer.userId?.email}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Submitted On</p>
                                  <p className="font-medium">
                                    {answer.submissionDate
                                      ? new Date(
                                          answer.submissionDate
                                        ).toLocaleDateString("en-IN", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Series</p>
                                  <p className="font-medium">
                                    {answer.paperId?.testSeriesId?.title}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 4 Main Options */}
                            <div className="mb-6">
                              <h4 className="font-semibold mb-4">Documents</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Question Paper */}
                                <Button
                                  onClick={() => {
                                    if (answer.paperId?.publicFileUrl) {
                                      window.open(answer.paperId.publicFileUrl, "_blank");
                                    } else {
                                      toast.error("Question paper not available");
                                    }
                                  }}
                                  variant="outline"
                                  className="h-auto py-3 flex flex-col items-center gap-2"
                                >
                                  <FileText size={20} />
                                  <span className="text-sm font-medium">Question Paper</span>
                                </Button>

                                {/* Suggested Answer */}
                                <Button
                                  onClick={() => {
                                    if (answer.suggestedAnswerUrl) {
                                      window.open(answer.suggestedAnswerUrl, "_blank");
                                    } else {
                                      toast.info(
                                        "Suggested answer not available yet"
                                      );
                                    }
                                  }}
                                  variant="outline"
                                  className="h-auto py-3 flex flex-col items-center gap-2"
                                >
                                  <BookOpen size={20} />
                                  <span className="text-sm font-medium">Suggested Answer</span>
                                </Button>

                                {/* User Answersheet */}
                                <Button
                                  onClick={() => {
                                    if (answer.answerSheetUrl) {
                                      window.open(answer.answerSheetUrl, "_blank");
                                    } else {
                                      toast.error("Student answer sheet not available");
                                    }
                                  }}
                                  variant="outline"
                                  className="h-auto py-3 flex flex-col items-center gap-2"
                                >
                                  <Eye size={20} />
                                  <span className="text-sm font-medium">User Answersheet</span>
                                </Button>

                                {/* Upload Evaluated Sheet */}
                                <Button
                                  onClick={() => handleEvaluateClick(answer)}
                                  variant={answer.isEvaluated ? "outline" : "default"}
                                  className="h-auto py-3 flex flex-col items-center gap-2"
                                >
                                  <Upload size={20} />
                                  <span className="text-sm font-medium">
                                    {answer.isEvaluated
                                      ? "Re-evaluate"
                                      : "Upload Evaluated Sheet"}
                                  </span>
                                </Button>
                              </div>
                            </div>

                            {/* Evaluation Status */}
                            {answer.isEvaluated && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-green-900 mb-2">
                                  Evaluation Details
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-green-700 text-xs font-semibold uppercase">
                                      Marks Obtained
                                    </p>
                                    <p className="font-bold text-lg text-green-900">
                                      {answer.marksObtained || 0}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-green-700 text-xs font-semibold uppercase">
                                      Max Marks
                                    </p>
                                    <p className="font-bold text-lg text-green-900">
                                      {answer.maxMarks || 0}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-green-700 text-xs font-semibold uppercase">
                                      Percentage
                                    </p>
                                    <p className="font-bold text-lg text-green-900">
                                      {answer.maxMarks
                                        ? Math.round(
                                            (answer.marksObtained /
                                              answer.maxMarks) *
                                              100
                                          )
                                        : 0}
                                      %
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-green-700 text-xs font-semibold uppercase">
                                      Evaluated At
                                    </p>
                                    <p className="font-semibold text-green-900 text-xs">
                                      {answer.evaluatedAt
                                        ? new Date(
                                            answer.evaluatedAt
                                          ).toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                          })
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>
                                {answer.evaluatorComments && (
                                  <div className="mt-3">
                                    <p className="text-green-700 text-xs font-semibold uppercase">
                                      Your Comments
                                    </p>
                                    <p className="text-green-900 text-sm mt-1">
                                      {answer.evaluatorComments}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Evaluate Dialog */}
      <Dialog open={evaluateDialogOpen} onOpenChange={setEvaluateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evaluate Answer Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedAnswer && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <p className="text-sm font-medium">Student: {selectedAnswer.userId?.name}</p>
                <p className="text-sm text-muted-foreground">Email: {selectedAnswer.userId?.email}</p>
                <p className="text-sm text-muted-foreground">Paper: {selectedAnswer.paperId?.fileName}</p>
                <p className="text-sm text-muted-foreground">Subject: {selectedAnswer.paperId?.subject}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Marks Obtained</Label>
                <Input
                  type="number"
                  value={evaluationData.marksObtained}
                  onChange={(e) => setEvaluationData({ ...evaluationData, marksObtained: e.target.value })}
                  className="mt-2"
                  placeholder="Enter marks"
                />
              </div>
              <div>
                <Label>Maximum Marks</Label>
                <Input
                  type="number"
                  value={evaluationData.maxMarks}
                  onChange={(e) => setEvaluationData({ ...evaluationData, maxMarks: e.target.value })}
                  className="mt-2"
                  placeholder="Enter maximum marks"
                />
              </div>
            </div>

            <div>
              <Label>Evaluator Comments</Label>
              <textarea
                value={evaluationData.evaluatorComments}
                onChange={(e) => setEvaluationData({ ...evaluationData, evaluatorComments: e.target.value })}
                className="mt-2 w-full border rounded-md p-2 text-sm min-h-[100px]"
                placeholder="Enter your comments..."
              />
            </div>

            <div>
              <Label>Upload Evaluated Sheet (PDF)</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {evaluatedFile ? `Selected: ${evaluatedFile.name}` : 'Choose File'}
                </Button>
              </div>
            </div>

            <div className="flex gap-4 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEvaluateDialogOpen(false);
                  setEvaluatedFile(null);
                }}
                disabled={uploadingEvaluation}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEvaluate}
                disabled={uploadingEvaluation}
              >
                {uploadingEvaluation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingEvaluation ? 'Uploading...' : 'Upload Evaluated Sheet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request More Copies Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request More Copies</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Number of Copies</Label>
              <Input
                type="number"
                min="1"
                value={copiesRequested}
                onChange={(e) => setCopiesRequested(e.target.value)}
                className="mt-2"
                placeholder="Enter number of copies needed"
              />
            </div>

            <div>
              <Label>Reason (Optional)</Label>
              <textarea
                value={copyRequestReason}
                onChange={(e) => setCopyRequestReason(e.target.value)}
                className="mt-2 w-full border rounded-md p-2 text-sm min-h-[80px]"
                placeholder="Explain why you need more copies..."
              />
            </div>

            <div className="flex gap-4 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setRequestDialogOpen(false);
                  setCopiesRequested('');
                  setCopyRequestReason('');
                }}
                disabled={requestingCopies}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestMoreCopies}
                disabled={requestingCopies}
              >
                {requestingCopies && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {requestingCopies ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TeacherDashboard;
