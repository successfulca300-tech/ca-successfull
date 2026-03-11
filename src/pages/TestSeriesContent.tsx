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
import { CheckCircle, Award, Users, FileText, Clock, Upload, ExternalLink, ChevronUp, ChevronDown, Loader2, Sparkles } from "lucide-react";

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
  const [questionPaperLoading, setQuestionPaperLoading] = useState<{ paperId: string; stage: 'preparing' | 'downloading' | 'opening' } | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // Check enrollment
        let enrollment = null;
        try {
          const check: any = await enrollmentsAPI.checkEnrollment({ testSeriesId: id });
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

  const getQuestionPaperFileName = (paper: any) => {
    const pieces = [
      paper?.subject,
      paper?.syllabusPercentage,
      paper?.group,
      paper?.paperNumber ? `Paper-${paper.paperNumber}` : null,
    ].filter(Boolean);
    const base = pieces.join('-').replace(/[^a-zA-Z0-9%._-]+/g, '-').replace(/-+/g, '-');
    return `${base || 'Question-Paper'}.pdf`;
  };

  const escapeHtml = (value: string) => {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const renderPreviewTabStatus = (tab: Window | null, title: string, message: string) => {
    if (!tab || tab.closed) return;
    try {
      const safeTitle = escapeHtml(title);
      const safeMessage = escapeHtml(message);
      const normalized = String(title || '').toLowerCase();
      const isError = normalized.includes('unable') || normalized.includes('error') || normalized.includes('failed');
      const isComplete = normalized.includes('completed') || normalized.includes('complete');
      const isOpening = normalized.includes('opening');
      const isDownloading = normalized.includes('download');
      const showSpinner = !isError && !isComplete;
      const progressWidth = isError ? '32%' : isComplete ? '100%' : isOpening ? '84%' : isDownloading ? '62%' : '36%';
      const accent = isError ? '#ef4444' : isComplete ? '#22c55e' : '#2563eb';
      const accentSoft = isError ? 'rgba(239, 68, 68, 0.16)' : isComplete ? 'rgba(34, 197, 94, 0.18)' : 'rgba(37, 99, 235, 0.16)';
      const accentBorder = isError ? 'rgba(239, 68, 68, 0.32)' : isComplete ? 'rgba(34, 197, 94, 0.34)' : 'rgba(37, 99, 235, 0.32)';
      const accentBright = isError ? '#f87171' : isComplete ? '#4ade80' : '#60a5fa';
      const stageTag = isError
        ? 'Attention Needed'
        : isComplete
          ? 'Ready'
          : isOpening
            ? 'Opening Preview'
            : isDownloading
              ? 'Downloading'
              : 'Preparing';
      const iconMarkup = isError
        ? `<svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`
        : isComplete
          ? `<svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="10"/></svg>`
          : `<svg viewBox="0 0 24 24" aria-hidden="true" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><rect x="4" y="19" width="16" height="2" rx="1"/></svg>`;

      tab.document.open();
      tab.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --accent: ${accent};
        --accent-soft: ${accentSoft};
        --accent-border: ${accentBorder};
        --accent-bright: ${accentBright};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        overflow: hidden;
        font-family: "Segoe UI", "Trebuchet MS", Arial, sans-serif;
        background: linear-gradient(125deg, #eef5ff 0%, #f8fbff 42%, #edfaff 100%);
        color: #0f172a;
      }
      .bg-orb {
        position: absolute;
        border-radius: 999px;
        filter: blur(44px);
        opacity: .75;
        animation: float 9s ease-in-out infinite;
      }
      .bg-orb.one {
        width: 220px;
        height: 220px;
        background: rgba(59, 130, 246, .28);
        top: -50px;
        left: -40px;
      }
      .bg-orb.two {
        width: 260px;
        height: 260px;
        background: rgba(14, 165, 233, .24);
        bottom: -80px;
        right: -30px;
        animation-delay: -2.4s;
      }
      .card {
        position: relative;
        z-index: 2;
        width: min(92vw, 620px);
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(148, 163, 184, .28);
        border-radius: 22px;
        padding: 24px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, .12);
        backdrop-filter: blur(8px);
        animation: rise .45s ease;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .03em;
        text-transform: uppercase;
        color: var(--accent);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
      }
      .header-row {
        margin-top: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        color: var(--accent);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        flex: 0 0 auto;
      }
      .title {
        margin: 0;
        font-size: 24px;
        line-height: 1.25;
        letter-spacing: -.02em;
      }
      .message {
        margin: 12px 0 0;
        color: #334155;
        font-size: 15px;
        line-height: 1.65;
      }
      .progress-wrap {
        margin-top: 20px;
      }
      .progress-track {
        width: 100%;
        height: 10px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
        position: relative;
      }
      .progress-bar {
        height: 100%;
        width: ${progressWidth};
        background: linear-gradient(90deg, var(--accent-bright), var(--accent));
        border-radius: inherit;
        transition: width .4s ease;
        animation: pulseBar 1.6s ease-in-out infinite;
      }
      .progress-track::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.38) 38%, transparent 68%);
        transform: translateX(-120%);
        animation: shimmer 1.9s linear infinite;
      }
      .helper {
        margin-top: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #475569;
        font-size: 13px;
      }
      .spinner {
        width: 15px;
        height: 15px;
        border-radius: 999px;
        border: 2px solid rgba(15, 23, 42, .2);
        border-top-color: var(--accent);
        animation: spin .8s linear infinite;
      }
      .chips {
        margin-top: 18px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        padding: 7px 11px;
        border-radius: 10px;
        font-size: 12px;
        color: #0f172a;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
      }
      .chip.active {
        color: var(--accent);
        border-color: var(--accent-border);
        background: var(--accent-soft);
      }
      .footer-note {
        margin-top: 14px;
        font-size: 12px;
        color: #64748b;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes shimmer {
        to { transform: translateX(120%); }
      }
      @keyframes pulseBar {
        0%, 100% { opacity: .95; }
        50% { opacity: .75; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(14px) scale(1.04); }
      }
      @keyframes rise {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  </head>
  <body>
    <div class="bg-orb one"></div>
    <div class="bg-orb two"></div>

    <div class="card">
      <div class="tag">${stageTag}</div>
      <div class="header-row">
        <div class="icon-wrap">${iconMarkup}</div>
        <h1 class="title">${safeTitle}</h1>
      </div>

      <p class="message">${safeMessage}</p>

      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-bar"></div>
        </div>
      </div>

      <div class="helper">
        ${showSpinner ? '<span class="spinner"></span>' : ''}
        <span>${isError ? 'Please retry from the previous tab.' : 'Please keep this tab open for a few seconds.'}</span>
      </div>

      <div class="chips">
        <div class="chip ${!isError && !isComplete ? 'active' : ''}">Preparing</div>
        <div class="chip ${isDownloading ? 'active' : ''}">Downloading</div>
        <div class="chip ${isOpening ? 'active' : ''}">Opening</div>
        <div class="chip ${isComplete ? 'active' : ''}">Completed</div>
      </div>

      <div class="footer-note">Do not close this tab while file processing is in progress.</div>
    </div>
  </body>
</html>`);
      tab.document.close();
    } catch (err) {
      console.error('Preview tab status render failed:', err);
    }
  };

  const getQuestionPaperLoadingLabel = (stage: 'preparing' | 'downloading' | 'opening') => {
    if (stage === 'preparing') return 'Preparing...';
    if (stage === 'downloading') return 'Downloading...';
    return 'Opening...';
  };

  const isMobileDevice = () => {
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  };

  const openPreviewInTab = (previewTab: Window | null, url: string) => {
    if (previewTab && !previewTab.closed) {
      previewTab.location.href = url;
      return true;
    }
    const opened = window.open(url, '_blank');
    return !!opened;
  };

  const triggerDirectDownload = (downloadUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenAndDownloadQuestionPaper = async (paper: any) => {
    if (!paper?.appwriteFileId) {
      toast.error('Question paper not available');
      return;
    }

    setQuestionPaperLoading({ paperId: paper._id, stage: 'preparing' });
    const previewTab = window.open('about:blank', '_blank');
    let downloadUrl = '';
    let secureUrl = '';
    renderPreviewTabStatus(
      previewTab,
      'Question Paper Is Being Prepared',
      'The PDF download has started. Please wait a moment, the PDF will also open online shortly.'
    );

    try {
      toast.info('Question paper download started. Opening online copy in a new tab...');
      const viewUrlRes: any = await filesAPI.getViewUrl(paper.appwriteFileId, { testSeriesId: id });
      secureUrl = viewUrlRes?.url || paper.appwriteFileId;
      const fileName = getQuestionPaperFileName(paper);
      const separator = secureUrl.includes('?') ? '&' : '?';
      downloadUrl = `${secureUrl}${separator}mode=download&filename=${encodeURIComponent(fileName)}`;

      renderPreviewTabStatus(
        previewTab,
        'Downloading Question Paper',
        'Your PDF is downloading. Please wait, online PDF is opening now.'
      );
      setQuestionPaperLoading({ paperId: paper._id, stage: 'downloading' });

      renderPreviewTabStatus(
        previewTab,
        'Download Completed',
        'The PDF has been downloaded. Opening PDF view now.'
      );
      setQuestionPaperLoading({ paperId: paper._id, stage: 'opening' });
      openPreviewInTab(previewTab, secureUrl);

      if (isMobileDevice()) {
        triggerDirectDownload(downloadUrl, fileName);
        toast.success('Download started. PDF is opening online.');
      } else {
        // Desktop: keep blob approach for reliable saved filename
        const downloadRes = await fetch(downloadUrl);
        if (!downloadRes.ok) {
          throw new Error('Failed to download question paper');
        }
        const fileBlob = await downloadRes.blob();
        const blobUrl = URL.createObjectURL(fileBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        toast.success('Question paper downloaded and opened.');
      }
    } catch (err: any) {
      if (previewTab && !previewTab.closed) {
        renderPreviewTabStatus(
          previewTab,
          'Unable To Open PDF',
          'There was a temporary issue while opening the PDF. Please return to the previous tab and try again.'
        );
      }
      if (downloadUrl) {
        try {
          triggerDirectDownload(downloadUrl, getQuestionPaperFileName(paper));
        } catch (fallbackErr) {
          console.error('Question paper fallback download error:', fallbackErr);
        }
      }
      console.error('Question paper open/download error:', err);
      toast.error(err?.message || 'Failed to open question paper');
    } finally {
      setTimeout(() => {
        setQuestionPaperLoading((prev) => (prev?.paperId === paper._id ? null : prev));
      }, 900);
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

  const parseSeriesDate = (value?: string | Date | null) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const d = new Date(value);
      d.setHours(23, 59, 59, 999);
      return d;
    }

    const raw = String(value).trim();
    if (!raw) return null;
    const withoutOrdinal = raw.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
    const extractedDate = withoutOrdinal.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    const parseTarget = extractedDate ? extractedDate[1] : withoutOrdinal;
    const parsed = new Date(parseTarget);

    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(23, 59, 59, 999);
    return parsed;
  };

  const getSubmissionDeadline = (paper: any) => {
    const dates = series?.seriesDates;
    if (!dates) return null;

    const normalizedGroup = String(paper?.group || '').toLowerCase();
    let configuredDeadline = dates?.submissionDeadline;
    if (normalizedGroup.includes('group 1')) {
      configuredDeadline = dates?.group1SubmissionDate || dates?.submissionDeadline;
    } else if (normalizedGroup.includes('group 2')) {
      configuredDeadline = dates?.group2SubmissionDate || dates?.submissionDeadline;
    } else if (normalizedGroup.includes('both')) {
      configuredDeadline = dates?.submissionDeadline || dates?.group2SubmissionDate || dates?.group1SubmissionDate;
    }

    return parseSeriesDate(configuredDeadline);
  };

  const getPaperIdentifier = (paper: any) => {
    const subjectCode = paper.subject;
    const coverageLabel = paper.syllabusPercentage ? String(paper.syllabusPercentage).trim() : '';
    const isInterSeries = (
      String(id || '').toLowerCase().startsWith('inter-') ||
      String(series?.fixedKey || '').toLowerCase().startsWith('inter-') ||
      String(series?.examLevel || '').toLowerCase() === 'inter'
    );
    const displayCoverageLabel =
      isInterSeries && coverageLabel === '30%' ? 'Chapterwise' : coverageLabel;
    const seriesLabel = paper.series ? seriesNames[paper.series] : '';
    const paperNumberLabel = paper.paperNumber ? `Paper ${paper.paperNumber}` : '';
    return [subjectCode, displayCoverageLabel ? `(${displayCoverageLabel})` : '', seriesLabel, paperNumberLabel]
      .filter(Boolean)
      .join(' ');
  };

  const findMappedPaper = (allPapers: any[], questionPaper: any, targetType: 'suggested' | 'evaluated') => {
    const strictMatch = allPapers.find((candidate: any) => {
      if (candidate.paperType !== targetType) return false;
      if (candidate.subject !== questionPaper.subject) return false;
      if ((candidate.series || null) !== (questionPaper.series || null)) return false;
      const samePaperNumber = Number(candidate.paperNumber || 0) === Number(questionPaper.paperNumber || 0);
      const sameSyllabus = String(candidate.syllabusPercentage || '').trim() === String(questionPaper.syllabusPercentage || '').trim();
      return samePaperNumber || sameSyllabus;
    });
    if (strictMatch) return strictMatch;

    return allPapers.find((candidate: any) => candidate.paperType === targetType && candidate.subject === questionPaper.subject);
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading your papers...</span>
          </div>
        </div>
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
      <div className="container mx-auto px-4 py-8 relative">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 -left-12 h-48 w-48 rounded-full bg-blue-100/70 blur-3xl animate-pulse" />
          <div className="absolute top-14 right-0 h-52 w-52 rounded-full bg-cyan-100/70 blur-3xl animate-pulse" />
        </div>

        {/* Header */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-5 py-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <FileText className="w-6 h-6 text-slate-700" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Papers</h1>
              <p className="text-sm text-slate-600">Download, attempt, and track submissions with a cleaner workflow.</p>
            </div>
            <Sparkles className="ml-auto hidden sm:block h-5 w-5 text-amber-500 animate-pulse" />
          </div>
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
                <div key={subject} className="bg-white/95 backdrop-blur rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  {/* Subject Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50"
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

                              const suggestedAnswer = findMappedPaper(seriesPapers, questionPaper, 'suggested');
                              const highestScorerSheet = suggestedAnswer;
                              const myAnswer = getMyAnswer(questionPaper._id);
                              const stats = statistics[questionPaper._id];
                              const hasViewedSuggestedAnswer = suggestedAnswersViewed.has(questionPaper._id);
                              const isQuestionPaperLoading = questionPaperLoading?.paperId === questionPaper._id;

                              const lastSubmissionDate = getSubmissionDeadline(questionPaper);

                              return (
                                <div key={questionPaper._id} className="p-4 border-b border-gray-100 last:border-b-0 transition-colors duration-300 hover:bg-slate-50/70">
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
                                        
                                      </div>
                                    </div>
                                  </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                              <Button
                                variant="outline"
                                onClick={() => handleOpenAndDownloadQuestionPaper(questionPaper)}
                                disabled={!questionPaper.appwriteFileId || isQuestionPaperLoading}
                                className={isQuestionPaperLoading ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
                              >
                                {isQuestionPaperLoading ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                )}
                                {isQuestionPaperLoading
                                  ? getQuestionPaperLoadingLabel(questionPaperLoading?.stage || 'preparing')
                                  : 'Question Paper'}
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

                            {isQuestionPaperLoading && (
                              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 animate-pulse">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>
                                    The PDF is being downloaded. Please wait, online PDF is opening in a moment.
                                  </span>
                                </div>
                              </div>
                            )}

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
