import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Edit,
  Trash2,
  Save,
  AlertCircle,
  Play,
  Loader,
  Upload,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { FIXED_TEST_SERIES_INTER } from "@/data/fixedTestSeries";
import { testSeriesAPI } from "@/lib/api";

// Subject name mapping
const subjectNames: Record<string, string> = {
  'Advance accounting': 'Advance Accounting',
  'Corporate law': 'Corporate Law',
  'Taxation': 'Taxation',
  'Costing': 'Costing',
  'FM SM': 'Financial Management & Strategic Management'
};

// Get only CA Inter fixed series
const getAllSeries = () => [...FIXED_TEST_SERIES_INTER];

interface SeriesData {
  [seriesId: string]: any;
}

interface SeriesCard {
  _id: string;
  title: string;
  type: string;
  price: number;
  status: "active" | "draft";
  thumbnail?: string;
  description?: string;
}

interface Paper {
  _id: string;
  testSeriesId: string;
  group: string;
  subject: string;
  paperType: 'question' | 'suggested' | 'evaluated';
  paperNumber: number;
  syllabusPercentage: '100%' | '50%' | '30%';
  series?: string;
  fileName: string;
  publicFileUrl?: string;
  availabilityDate?: string;
  isAvailable: boolean;
  createdAt?: string;
}

const SubadminTestSeriesInter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [seriesData, setSeriesData] = useState<SeriesData>({});
  const [user, setUser] = useState<any>(null);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("inter-s1");
  const [mediaCache, setMediaCache] = useState<{
    [seriesId: string]: { thumbnail?: string; video?: string }
  }>({});

  // Paper management state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uploadingPaper, setUploadingPaper] = useState(false);
  const [paperForm, setPaperForm] = useState({
    group: 'Group 1',
    subject: 'Advance accounting',
    paperType: 'question' as 'question' | 'suggested' | 'evaluated',
    paperNumber: 1,
    syllabusPercentage: '100%' as '100%' | '50%' | '30%',
    series: 'series1',
    fileName: '',
    availabilityDate: new Date().toISOString().split('T')[0],
  });

  // Check auth and role
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    if (userData.role !== "subadmin" && userData.role !== "admin") {
      toast.error("Only admins and subadmins can access this page");
      navigate("/dashboard");
      return;
    }
  }, [navigate]);

  // Fetch media from database on mount
  const fetchMediaForSeries = async (seriesId: string) => {
    try {
      const response = await testSeriesAPI.getMedia(seriesId);
      if (response.success && response.media) {
        const mediaByType: { [key: string]: string } = {};
        response.media.forEach((media: any) => {
          if (media.mediaType === 'thumbnail' || media.mediaType === 'video') {
            mediaByType[media.mediaType] = media.fileUrl;
          }
        });
        setMediaCache((prev) => ({
          ...prev,
          [seriesId]: mediaByType,
        }));
        return mediaByType;
      }
    } catch (error) {
      console.error(`Failed to fetch media for ${seriesId}:`, error);
    }
    return {};
  };

  // Load series data from localStorage on mount and fetch media
  useEffect(() => {
    const saved = localStorage.getItem("testSeriesManagement_inter");
    if (saved) {
      try {
        setSeriesData(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load saved data:", err);
      }
    }
    // Initialize all inter series with defaults
    const initialized: SeriesData = saved ? JSON.parse(saved) : {};
    getAllSeries().forEach((s) => {
      if (!initialized[s._id]) {
        initialized[s._id] = {
          _id: s._id,
          title: s.title,
          overview: (s as any).overview || s.description || "",
          description: s.description || "",
          highlights: s.highlights || [],
          instructions: s.instructions || "",
          disclaimer: (s as any).disclaimer || "",
          seriesDates: s.seriesDates || {
            series1UploadDate: "",
            series2UploadDate: "",
            series3UploadDate: "",
            series4UploadDate: "",
            group1SubmissionDate: "",
            group2SubmissionDate: "",
          },
          videoType: "EMBED",
          videoUrl: "",
          videoFileId: "",
          isVideoEnabled: true,
          isVideoUploading: false,
          // Listing page fields
          cardTitle: s.title,
          cardDescription: s.description || "",
          cardThumbnail: "",
          isActive: true,
          displayOrder: parseInt(s._id.replace(/[^0-9]/g, '')) || 0,
        };
      }
    });
    setSeriesData(initialized);

    // Fetch existing media for all inter series
    getAllSeries().forEach((s) => {
      fetchMediaForSeries(s._id);
    });
  }, []);

  const currentSeries = seriesData[activeTab];

  const updateField = (field: string, value: any) => {
    setSeriesData((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Save local copy first
      localStorage.setItem("testSeriesManagement_inter", JSON.stringify(seriesData));

      // Only persist the currently active tab/series instead of saving all
      const key = activeTab;
      const payload = seriesData[key];
      if (!payload) {
        toast.success("Nothing to save for the current series");
        return;
      }

      // If it's a fixed series (inter-s1..inter-s4), call upsertFixed
      if (/^inter-s[1-4]$/i.test(key)) {
        try {
          const resp: any = await testSeriesAPI.upsertFixed(key, payload);
          if (resp?.success && resp.testSeries) {
            const updated = resp.testSeries;
            const newSeriesData = { ...seriesData, [key]: { ...(seriesData[key] || {}), ...updated } };
            setSeriesData(newSeriesData);
            localStorage.setItem("testSeriesManagement_inter", JSON.stringify(newSeriesData));
            toast.success(`Saved ${key.toUpperCase()} data to server`);
          } else {
            toast.success(`Saved ${key.toUpperCase()} locally (server did not return managed data)`);
          }
        } catch (err) {
          console.warn(`Failed to save ${key} to server:`, err);
          toast.error(`Saved ${key.toUpperCase()} locally but failed to persist to server`);
        }
      } else if (payload._id) {
        // If it's a managed DB series with an _id, call update
        try {
          const resp: any = await testSeriesAPI.update(payload._id, payload);
          if (resp?.success && resp.testSeries) {
            const updated = resp.testSeries;
            const newSeriesData = { ...seriesData, [key]: { ...(seriesData[key] || {}), ...updated } };
            setSeriesData(newSeriesData);
            localStorage.setItem("testSeriesManagement_inter", JSON.stringify(newSeriesData));
            toast.success(`Saved ${key.toUpperCase()} data to server`);
          } else {
            toast.success(`Saved ${key.toUpperCase()} locally (server did not return updated data)`);
          }
        } catch (err) {
          console.warn(`Failed to update series ${key}:`, err);
          toast.error(`Saved ${key.toUpperCase()} locally but failed to persist to server`);
        }
      } else {
        // Fallback: nothing to persist server-side
        toast.success("Test Series updated locally");
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const getSeriesCards = (): SeriesCard[] => {
    return getAllSeries().map((fixed) => {
      const data = seriesData[fixed._id] || {};
      return {
        _id: fixed._id,
        title: data.cardTitle || fixed.title,
        type: fixed.seriesType || "Group Wise",
        price: fixed.price || 999,
        status: data.isActive ? "active" : "draft",
        thumbnail: data.cardThumbnail || "/placeholder.svg",
        description: data.cardDescription || fixed.description,
      };
    });
  };

  const seriesCards = getSeriesCards();

  // Get available subjects for the currently selected series
  const getAvailableSubjects = () => {
    const series = getAllSeries().find(s => s._id === activeTab);
    return series?.subjects || [];
  };

  const addHighlight = () => {
    const highlights = currentSeries?.highlights || [];
    updateField("highlights", [...highlights, ""]);
  };

  const updateHighlight = (index: number, value: string) => {
    const highlights = [...(currentSeries?.highlights || [])];
    highlights[index] = value;
    updateField("highlights", highlights);
  };

  const deleteHighlight = (index: number) => {
    const highlights = [...(currentSeries?.highlights || [])];
    highlights.splice(index, 1);
    updateField("highlights", highlights);
  };

  // Paper management functions (similar to main SubadminTestSeries)
  const fetchPapersForSeries = async (seriesId: string) => {
    try {
      const response = await testSeriesAPI.getPapers(seriesId) as any;
      if (response.success) {
        setPapers(response.papers || []);
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    }
  };

  const handleUploadPaper = async () => {
    try {
      const fileInput = document.getElementById('paper-file-input') as HTMLInputElement;
      if (!fileInput?.files?.[0]) {
        toast.error('Please select a file to upload');
        return;
      }

      const file = fileInput.files[0];
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }

      const formData = new FormData();
      formData.append('paper', file);
      formData.append('group', paperForm.group);
      formData.append('subject', paperForm.subject);
      formData.append('paperType', paperForm.paperType);
      formData.append('paperNumber', String(paperForm.paperNumber));
      formData.append('syllabusPercentage', paperForm.syllabusPercentage);
      if (activeTab === 'inter-s1') {
        formData.append('series', paperForm.series);
      }
      formData.append('availabilityDate', paperForm.availabilityDate);

      setUploadingPaper(true);

      const response = await testSeriesAPI.uploadPaperWithFile(activeTab, formData) as any;

      if (response.success) {
        toast.success('Paper uploaded successfully');
        await fetchPapersForSeries(activeTab);
        setPaperForm({
          group: 'Group 1',
          subject: 'Advance accounting',
          paperType: 'question',
          paperNumber: 1,
          syllabusPercentage: '100%',
          series: 'series1',
          fileName: '',
          availabilityDate: new Date().toISOString().split('T')[0],
        });
        const fileInputEl = document.getElementById('paper-file-input') as HTMLInputElement;
        if (fileInputEl) fileInputEl.value = '';
      } else {
        toast.error(response.message || 'Failed to upload paper');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload paper');
    } finally {
      setUploadingPaper(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!window.confirm('Are you sure you want to delete this paper?')) return;

    try {
      const response = await testSeriesAPI.deletePaper(paperId) as any;
      if (response.success) {
        toast.success('Paper deleted successfully');
        await fetchPapersForSeries(activeTab);
      } else {
        toast.error(response.message || 'Failed to delete paper');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete paper');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Test Series Management — CA Inter</h1>
          <div>
            <Button onClick={() => navigate('/subadmin')}>Back</Button>
            <Button className="ml-3" onClick={handleSave}>
              {loading ? <Loader size={16} /> : <Save size={16} />}
              <span className="ml-2">Save</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Series</CardTitle>
                <CardDescription>Manage CA Inter series</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(v)=>setActiveTab(v)} orientation="vertical">
                  <TabsList>
                    {getAllSeries().map((s) => (
                      <TabsTrigger key={s._id} value={s._id}>{s.title}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{getAllSeries().find(s=>s._id===activeTab)?.title||'Series'}</CardTitle>
                <CardDescription>Edit listing and content for this CA Inter series</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Simple form: cardTitle, cardDescription, overview, highlights, instructions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium">Card Title</label>
                  <Input value={currentSeries?.cardTitle||''} onChange={(e:any)=>updateField('cardTitle', e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Card Description</label>
                  <Textarea value={currentSeries?.cardDescription||''} onChange={(e:any)=>updateField('cardDescription', e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium">Overview</label>
                  <Textarea value={currentSeries?.overview||''} onChange={(e:any)=>updateField('overview', e.target.value)} />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium">Highlights</label>
                  {(currentSeries?.highlights||[]).map((h:string, idx:number)=> (
                    <div key={idx} className="flex items-center mb-2">
                      <Input value={h} onChange={(e:any)=>updateHighlight(idx, e.target.value)} />
                      <Button variant="ghost" onClick={()=>deleteHighlight(idx)} className="ml-2"><Trash2 size={14} /></Button>
                    </div>
                  ))}
                  <Button variant="outline" className="mt-2" onClick={addHighlight}><Plus size={14} /> Add Highlight</Button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium">Instructions / Disclaimer</label>
                  <Textarea value={currentSeries?.disclaimer||''} onChange={(e:any)=>updateField('disclaimer', e.target.value)} />
                </div>

                {/* Subject-wise Date Schedule for Inter S1 */}
                {activeTab === 'inter-s1' && (
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold mb-2">Subject-wise Date Schedule (Inter)</h4>
                    <p className="text-sm text-muted-foreground mb-6">
                      Add dates for each subject across Series 1 & Series 2 for CA Inter. These dates will be visible to users.
                    </p>
                    <div className="border border-border rounded-lg overflow-hidden bg-white">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-border">
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 w-40">Subject</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-900"><div className="text-center">Series 1 Date</div></th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-900"><div className="text-center">Series 2 Date</div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const availableSubjects = getAvailableSubjects();
                            const defaultSchedule = availableSubjects.map((sub) => ({ subject: sub, series1Date: '', series2Date: '' }));
                            const schedule = currentSeries.subjectDateSchedule && currentSeries.subjectDateSchedule.length > 0 ? currentSeries.subjectDateSchedule : defaultSchedule;
                            const merged = availableSubjects.map((sub) => schedule.find((r: any) => r.subject === sub) || { subject: sub, series1Date: '', series2Date: '' });
                            return merged.map((row: any, idx: number) => (
                              <tr key={idx} className="border-b border-border hover:bg-blue-50/50 transition">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-lg text-white bg-blue-600 px-4 py-3 rounded inline-block min-w-24 text-center">{subjectNames[row.subject] || row.subject}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <Input type="date" value={row.series1Date || ''} onChange={(e)=>{
                                    const newSchedule = merged.map((s:any,i:number)=> i===idx ? { ...s, series1Date: e.target.value } : s);
                                    updateField('subjectDateSchedule', newSchedule);
                                  }} className="text-sm w-full" />
                                </td>
                                <td className="px-6 py-4">
                                  <Input type="date" value={row.series2Date || ''} onChange={(e)=>{
                                    const newSchedule = merged.map((s:any,i:number)=> i===idx ? { ...s, series2Date: e.target.value } : s);
                                    updateField('subjectDateSchedule', newSchedule);
                                  }} className="text-sm w-full" />
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Paper Management</h3>
                  <div className="mb-3">
                    <label className="block text-sm">Subject</label>
                    <select value={paperForm.subject} onChange={(e)=>setPaperForm({...paperForm, subject: e.target.value})} className="border p-2 rounded w-64">
                      {getAvailableSubjects().map((sub:any)=> (
                        <option key={sub} value={sub}>{subjectNames[sub]||sub}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm">Paper File</label>
                    <input id="paper-file-input" type="file" className="mt-2" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUploadPaper} disabled={uploadingPaper}>{uploadingPaper? 'Uploading...' : 'Upload Paper'}</Button>
                    <Button variant="ghost" onClick={()=>fetchPapersForSeries(activeTab)}>Refresh Papers</Button>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium">Existing Papers</h4>
                    {papers.length===0 && <div className="text-sm text-muted-foreground">No papers uploaded yet</div>}
                    {papers.map(p=> (
                      <div key={p._id} className="border rounded p-2 flex items-center justify-between mt-2">
                        <div>
                          <div className="font-medium">{p.subject} - {p.paperNumber}</div>
                          <div className="text-sm text-muted-foreground">{p.fileName}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="destructive" onClick={()=>handleDeletePaper(p._id)}><Trash2 size={14} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SubadminTestSeriesInter;
