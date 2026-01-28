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
  Plus,
  Edit2,
  Trash2,
  Save,
  Download,
  AlertCircle,
  Loader,
  CheckCircle,
  Clock,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { testSeriesAPI } from "@/lib/api";

interface TestSeries {
  _id: string;
  title: string;
  description: string;
  seriesType: 'S1' | 'S2' | 'S3' | 'S4';
  seriesTypeLabel: string;
  pricing: any;
  discountCodes?: any[];
  subjects?: string[];
  highlights?: string[];
  syllabusBreakdown?: string;
  testSchedule?: any[];
  instructions?: string;
  sampleAnswerSheets?: any[];
  papersPerSubject?: { [key: string]: number };
  seriesDates?: any;
  publishStatus: 'draft' | 'published' | 'rejected';
  isActive: boolean;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
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

const SubAdminTestSeriesNew = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [seriesList, setSeriesList] = useState<TestSeries[]>([]);
  const [activeTab, setActiveTab] = useState('my-series');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    seriesType: 'S1' as 'S1' | 'S2' | 'S3' | 'S4',
    highlights: [] as string[],
    syllabusBreakdown: '',
    instructions: '',
    discountCodes: [] as any[],
    pricing: {
      subjectPrice: 450,
      comboPrice: 1200,
      allSubjectsPrice: 2000,
      allSeriesAllSubjectsPrice: 6000,
      paperPrice: 400,
    },
    seriesDates: {
      series1UploadDate: '',
      series2UploadDate: '',
      series3UploadDate: '',
      group1SubmissionDate: '',
      group2SubmissionDate: '',
    },
  });

  // Paper upload state
  const [paperData, setPaperData] = useState({
    testSeriesId: '',
    group: 'Group 1',
    subject: 'FR',
    paperType: 'question' as 'question' | 'suggested' | 'evaluated',
    paperNumber: 1,
    syllabusPercentage: '100%' as '100%' | '50%' | '30%',
    series: 'series1',
    fileName: '',
    availabilityDate: new Date().toISOString().split('T')[0],
  });

  const [papers, setPapers] = useState<Paper[]>([]);
  const [uploadingPaper, setUploadingPaper] = useState(false);

  // Check auth
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    if (userData.role !== 'subadmin' && userData.role !== 'admin') {
      toast.error('Only admins and subadmins can access this page');
      navigate('/dashboard');
      return;
    }
  }, [navigate]);

  // Load user's test series
  useEffect(() => {
    if (!user) return;
    fetchMyTestSeries();
  }, [user]);

  const fetchMyTestSeries = async () => {
    try {
      setLoading(true);
      const response = await testSeriesAPI.getMyTestSeries() as any;
      if (response.success) {
        setSeriesList(response.testSeries || []);
      } else {
        toast.error(response.message || 'Failed to fetch series');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to fetch series');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeries = async () => {
    try {
      if (!formData.title || !formData.description) {
        toast.error('Title and description are required');
        return;
      }

      setLoading(true);
      const payload: any = {
        title: formData.title,
        description: formData.description,
        seriesType: formData.seriesType,
        category: 'test-series', // default category
        pricing: formData.pricing,
        discountCodes: formData.discountCodes,
        highlights: formData.highlights,
        syllabusBreakdown: formData.syllabusBreakdown,
        instructions: formData.instructions,
        subjects: ['FR', 'AFM', 'Audit', 'DT', 'IDT'],
        papersPerSubject: {
          'FR': formData.seriesType === 'S1' ? 5 : formData.seriesType === 'S2' ? 2 : formData.seriesType === 'S3' ? 3 : 6,
          'AFM': formData.seriesType === 'S1' ? 5 : formData.seriesType === 'S2' ? 2 : formData.seriesType === 'S3' ? 3 : 6,
          'Audit': formData.seriesType === 'S1' ? 5 : formData.seriesType === 'S2' ? 2 : formData.seriesType === 'S3' ? 3 : 6,
          'DT': formData.seriesType === 'S1' ? 5 : formData.seriesType === 'S2' ? 2 : formData.seriesType === 'S3' ? 3 : 6,
          'IDT': formData.seriesType === 'S1' ? 5 : formData.seriesType === 'S2' ? 2 : formData.seriesType === 'S3' ? 3 : 6,
        },
        seriesDates: formData.seriesDates,
      };

      if (editingId) {
        const response = await testSeriesAPI.update(editingId, payload) as any;
        if (response.success) {
          toast.success('Series updated successfully');
          setEditingId(null);
        } else {
          toast.error(response.message || 'Failed to update series');
        }
      } else {
        const response = await testSeriesAPI.create(payload) as any;
        if (response.success) {
          toast.success('Series created successfully');
          setShowCreateForm(false);
        } else {
          toast.error(response.message || 'Failed to create series');
        }
      }

      // Reset form and reload
      setFormData({
        title: '',
        description: '',
        seriesType: 'S1',
        highlights: [],
        syllabusBreakdown: '',
        instructions: '',
        discountCodes: [],
        pricing: {
          subjectPrice: 450,
          comboPrice: 1200,
          allSubjectsPrice: 2000,
          allSeriesAllSubjectsPrice: 6000,
          paperPrice: 400,
        },
        seriesDates: {
          series1UploadDate: '',
          series2UploadDate: '',
          series3UploadDate: '',
          group1SubmissionDate: '',
          group2SubmissionDate: '',
        },
      });
      await fetchMyTestSeries();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save series');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeries = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this series?')) return;

    try {
      setLoading(true);
      const response = await testSeriesAPI.delete(id) as any;
      if (response.success) {
        toast.success('Series deleted successfully');
        await fetchMyTestSeries();
      } else {
        toast.error(response.message || 'Failed to delete series');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete series');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishSeries = async (id: string) => {
    try {
      setLoading(true);
      const response = await testSeriesAPI.publish(id, 'approve') as any;
      if (response.success) {
        toast.success('Series submitted for approval');
        await fetchMyTestSeries();
      } else {
        toast.error(response.message || 'Failed to publish series');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish series');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPaper = async () => {
    try {
      if (!paperData.testSeriesId || !paperData.fileName) {
        toast.error('Please fill all paper details');
        return;
      }

      setUploadingPaper(true);
      const payload = {
        ...paperData,
        appwriteFileId: 'temp-file-id', // Will be replaced with actual upload
        appwriteBucketId: 'test-papers',
        publicFileUrl: '/papers/' + paperData.fileName,
        fileSizeBytes: 0,
      };

      const response = await testSeriesAPI.uploadPaper(paperData.testSeriesId, payload) as any;
      if (response.success) {
        toast.success('Paper uploaded successfully');
        await loadPapersForSeries(paperData.testSeriesId);
        // Reset form
        setPaperData({
          testSeriesId: paperData.testSeriesId,
          group: 'Group 1',
          subject: 'FR',
          paperType: 'question',
          paperNumber: 1,
          syllabusPercentage: '100%',
          series: 'series1',
          fileName: '',
          availabilityDate: new Date().toISOString().split('T')[0],
        });
      } else {
        toast.error(response.message || 'Failed to upload paper');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload paper');
    } finally {
      setUploadingPaper(false);
    }
  };

  const loadPapersForSeries = async (seriesId: string) => {
    try {
      const response = await testSeriesAPI.getPapers(seriesId) as any;
      if (response.success) {
        setPapers(response.papers || []);
      }
    } catch (error) {
      console.error('Failed to load papers:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Series Management</h1>
          <p className="text-gray-600 mt-2">Manage your test series and upload papers</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-series">My Test Series</TabsTrigger>
            <TabsTrigger value="upload-papers">Upload Papers</TabsTrigger>
            <TabsTrigger value="manage-papers">Manage Papers</TabsTrigger>
          </TabsList>

          {/* My Test Series Tab */}
          <TabsContent value="my-series" className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Test Series</h2>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Series
              </Button>
            </div>

            {showCreateForm && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{editingId ? 'Edit Series' : 'Create New Test Series'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Series title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Series Type</label>
                      <select
                        value={formData.seriesType}
                        onChange={(e) => setFormData({ ...formData, seriesType: e.target.value as any })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="S1">S1 - Full Syllabus</option>
                        <option value="S2">S2 - 50% Syllabus</option>
                        <option value="S3">S3 - 30% Syllabus</option>
                        <option value="S4">S4 - CA Successful Specials</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Series description"
                      className="h-24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Syllabus Breakdown</label>
                    <Textarea
                      value={formData.syllabusBreakdown}
                      onChange={(e) => setFormData({ ...formData, syllabusBreakdown: e.target.value })}
                      placeholder="Detailed syllabus breakdown"
                      className="h-24"
                    />
                  </div>

                  {formData.seriesType === 'S1' && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Series 1 Upload Date</label>
                          <Input
                            type="date"
                            value={formData.seriesDates.series1UploadDate}
                            onChange={(e) => setFormData({
                              ...formData,
                              seriesDates: { ...formData.seriesDates, series1UploadDate: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Series 2 Upload Date</label>
                          <Input
                            type="date"
                            value={formData.seriesDates.series2UploadDate}
                            onChange={(e) => setFormData({
                              ...formData,
                              seriesDates: { ...formData.seriesDates, series2UploadDate: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Series 3 Upload Date</label>
                          <Input
                            type="date"
                            value={formData.seriesDates.series3UploadDate}
                            onChange={(e) => setFormData({
                              ...formData,
                              seriesDates: { ...formData.seriesDates, series3UploadDate: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Group 1 Submission Date</label>
                      <Input
                        type="date"
                        value={formData.seriesDates.group1SubmissionDate}
                        onChange={(e) => setFormData({
                          ...formData,
                          seriesDates: { ...formData.seriesDates, group1SubmissionDate: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Group 2 Submission Date</label>
                      <Input
                        type="date"
                        value={formData.seriesDates.group2SubmissionDate}
                        onChange={(e) => setFormData({
                          ...formData,
                          seriesDates: { ...formData.seriesDates, group2SubmissionDate: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCreateSeries}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      {editingId ? 'Update' : 'Create'} Series
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingId(null);
                        setFormData({
                          title: '',
                          description: '',
                          seriesType: 'S1',
                          highlights: [],
                          syllabusBreakdown: '',
                          instructions: '',
                          discountCodes: [],
                          pricing: {
                            subjectPrice: 450,
                            comboPrice: 1200,
                            allSubjectsPrice: 2000,
                            allSeriesAllSubjectsPrice: 6000,
                            paperPrice: 400,
                          },
                          seriesDates: {
                            series1UploadDate: '',
                            series2UploadDate: '',
                            series3UploadDate: '',
                            group1SubmissionDate: '',
                            group2SubmissionDate: '',
                          },
                        });
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading && !seriesList.length ? (
              <div className="text-center py-12">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading series...</p>
              </div>
            ) : seriesList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No test series created yet. Create your first series!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {seriesList.map((series) => (
                  <Card key={series._id} className="hover:shadow-lg transition">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{series.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{series.description}</p>
                          <div className="flex gap-4 mt-3 text-sm">
                            <span className="badge bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {series.seriesTypeLabel}
                            </span>
                            <span className={`badge px-2 py-1 rounded ${
                              series.publishStatus === 'published' ? 'bg-green-100 text-green-800' :
                              series.publishStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {series.publishStatus === 'draft' ? (
                                <><Clock className="w-3 h-3 inline mr-1" />Draft</>
                              ) : series.publishStatus === 'published' ? (
                                <><CheckCircle className="w-3 h-3 inline mr-1" />Published</>
                              ) : (
                                'Rejected'
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {series.publishStatus === 'draft' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingId(series._id);
                                  setFormData({
                                    title: series.title,
                                    description: series.description,
                                    seriesType: series.seriesType,
                                    highlights: series.highlights || [],
                                    syllabusBreakdown: series.syllabusBreakdown || '',
                                    instructions: series.instructions || '',
                                    discountCodes: series.discountCodes || [],
                                    pricing: series.pricing,
                                    seriesDates: series.seriesDates || {},
                                  });
                                  setShowCreateForm(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handlePublishSeries(series._id)}
                                disabled={loading}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Publish
                              </Button>
                            </>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSeries(series._id)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upload Papers Tab */}
          <TabsContent value="upload-papers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Test Paper</CardTitle>
                <CardDescription>Upload individual test papers with metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Test Series</label>
                  <select
                    value={paperData.testSeriesId}
                    onChange={(e) => setPaperData({ ...paperData, testSeriesId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">-- Select Series --</option>
                    {seriesList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.title} ({s.seriesType})
                      </option>
                    ))}
                  </select>
                </div>

                {paperData.testSeriesId && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Group</label>
                        <select
                          value={paperData.group}
                          onChange={(e) => setPaperData({ ...paperData, group: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="Group 1">Group 1 (FR/AFM/Audit)</option>
                          <option value="Group 2">Group 2 (DT/IDT)</option>
                          <option value="Both">Both Groups</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Subject</label>
                        <select
                          value={paperData.subject}
                          onChange={(e) => setPaperData({ ...paperData, subject: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="FR">FR</option>
                          <option value="AFM">AFM</option>
                          <option value="Audit">Audit</option>
                          <option value="DT">DT</option>
                          <option value="IDT">IDT</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Paper Type</label>
                        <select
                          value={paperData.paperType}
                          onChange={(e) => setPaperData({ ...paperData, paperType: e.target.value as any })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="question">Question Paper</option>
                          <option value="suggested">Suggested Answers</option>
                          <option value="evaluated">Evaluated Sheet</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Paper Number</label>
                        <Input
                          type="number"
                          min="1"
                          value={paperData.paperNumber}
                          onChange={(e) => setPaperData({ ...paperData, paperNumber: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Syllabus %</label>
                        <select
                          value={paperData.syllabusPercentage}
                          onChange={(e) => setPaperData({ ...paperData, syllabusPercentage: e.target.value as any })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="100%">100% (Full)</option>
                          <option value="50%">50% (Half)</option>
                          <option value="30%">30% (Quick)</option>
                        </select>
                      </div>
                    </div>

                    {seriesList.find(s => s._id === paperData.testSeriesId)?.seriesType === 'S1' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Series (S1 only)</label>
                        <select
                          value={paperData.series}
                          onChange={(e) => setPaperData({ ...paperData, series: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="series1">Series 1</option>
                          <option value="series2">Series 2</option>
                          <option value="series3">Series 3</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">File Name</label>
                      <Input
                        value={paperData.fileName}
                        onChange={(e) => setPaperData({ ...paperData, fileName: e.target.value })}
                        placeholder="e.g., FR_Series1_Paper1.pdf"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Availability Date</label>
                      <Input
                        type="date"
                        value={paperData.availabilityDate}
                        onChange={(e) => setPaperData({ ...paperData, availabilityDate: e.target.value })}
                      />
                    </div>

                    <Button
                      onClick={handleUploadPaper}
                      disabled={uploadingPaper}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {uploadingPaper ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload Paper
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Papers Tab */}
          <TabsContent value="manage-papers" className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Series to View Papers</label>
              <select
                onChange={(e) => {
                  if (e.target.value) loadPapersForSeries(e.target.value);
                  else setPapers([]);
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">-- Select Series --</option>
                {seriesList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title} ({s.seriesType})
                  </option>
                ))}
              </select>
            </div>

            {papers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No papers uploaded yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {papers.map((paper) => (
                  <Card key={paper._id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {paper.subject} - {paper.group} - Paper {paper.paperNumber}
                        </p>
                        <p className="text-sm text-gray-600">
                          {paper.paperType === 'question' ? 'Question Paper' : paper.paperType === 'suggested' ? 'Suggested Answers' : 'Evaluated Sheet'} - {paper.syllabusPercentage}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (window.confirm('Delete this paper?')) {
                            try {
                              await testSeriesAPI.deletePaper(paper._id);
                              toast.success('Paper deleted');
                              loadPapersForSeries(paper.testSeriesId);
                            } catch (error) {
                              toast.error('Failed to delete paper');
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SubAdminTestSeriesNew;
