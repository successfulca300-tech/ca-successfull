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
import { FIXED_TEST_SERIES } from "@/data/fixedTestSeries";
import { testSeriesAPI } from "@/lib/api";

// Subject name mapping
const subjectNames: Record<string, string> = {
  'FR': 'Financial Reporting',
  'AFM': 'Advanced Financial Management',
  'Audit': 'Audit and Assurance',
  'DT': 'Direct Tax',
  'IDT': 'Indirect Tax'
};

// Subject order for consistent display
const subjectOrder = ['FR', 'AFM', 'Audit', 'DT', 'IDT'];

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

const SubadminTestSeries = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [seriesData, setSeriesData] = useState<SeriesData>({});
  const [user, setUser] = useState<any>(null);
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("s1");
  const [mediaCache, setMediaCache] = useState<{
    [seriesId: string]: { thumbnail?: string; video?: string }
  }>({});

  // Paper management state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uploadingPaper, setUploadingPaper] = useState(false);
  const [paperForm, setPaperForm] = useState({
    group: 'Group 1',
    subject: 'FR',
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
    const saved = localStorage.getItem("testSeriesManagement");
    if (saved) {
      try {
        setSeriesData(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to load saved data:", err);
      }
    }
    // Initialize all series with defaults
    const initialized: SeriesData = saved ? JSON.parse(saved) : {};
    FIXED_TEST_SERIES.forEach((s) => {
      if (!initialized[s._id]) {
        initialized[s._id] = {
          _id: s._id,
          title: s.title,
          description: s.description || "",
          highlights: s.highlights || [],
          instructions: s.instructions || "",
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
          displayOrder: parseInt(s._id.substring(1)) || 0,
        };
      }
    });
    setSeriesData(initialized);

    // Fetch existing media for all series
    FIXED_TEST_SERIES.forEach((s) => {
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

  const handleSave = () => {
    try {
      setLoading(true);
      localStorage.setItem("testSeriesManagement", JSON.stringify(seriesData));
      toast.success("Test Series updated successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const getSeriesCards = (): SeriesCard[] => {
    return FIXED_TEST_SERIES.map((fixed) => {
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

  // Paper management functions
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
      // Get file from input
      const fileInput = document.getElementById('paper-file-input') as HTMLInputElement;
      if (!fileInput?.files?.[0]) {
        toast.error('Please select a file to upload');
        return;
      }

      const file = fileInput.files[0];
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('paper', file);
      formData.append('group', paperForm.group);
      formData.append('subject', paperForm.subject);
      formData.append('paperType', paperForm.paperType);
      formData.append('paperNumber', String(paperForm.paperNumber));
      formData.append('syllabusPercentage', paperForm.syllabusPercentage);
      if (activeTab === 's1') {
        formData.append('series', paperForm.series);
      }
      formData.append('availabilityDate', paperForm.availabilityDate);

      setUploadingPaper(true);

      // Upload using new API method that handles file uploads
      const response = await testSeriesAPI.uploadPaperWithFile(activeTab, formData) as any;
      
      if (response.success) {
        toast.success('Paper uploaded successfully');
        await fetchPapersForSeries(activeTab);
        // Reset form
        setPaperForm({
          group: 'Group 1',
          subject: 'FR',
          paperType: 'question',
          paperNumber: 1,
          syllabusPercentage: '100%',
          series: 'series1',
          fileName: '',
          availabilityDate: new Date().toISOString().split('T')[0],
        });
        // Clear file input
        fileInput.value = '';
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

  // Fetch papers when series changes
  useEffect(() => {
    if (expandedSeries) {
      fetchPapersForSeries(activeTab);
    }
  }, [activeTab, expandedSeries]);

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Test Series Management</h1>
          <p className="text-muted-foreground">
            Manage all test series (S1–S4) content, videos, and settings
          </p>
        </div>

        {/* Test Series Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {seriesCards.map((card) => (
            <Card
              key={card._id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                expandedSeries === card._id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() =>
                setExpandedSeries(expandedSeries === card._id ? null : card._id)
              }
            >
              <CardHeader className="pb-3">
                {/* Thumbnail */}
                <div className="relative w-full h-40 bg-secondary/30 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  {card.thumbnail && card.thumbnail !== "/placeholder.svg" ? (
                    <img
                      src={card.thumbnail}
                      alt={card.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>

                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {card.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Series Type:</span>
                    <span className="font-medium">{card.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">₹{card.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        card.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {card.status === "active" ? "Active" : "Draft"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(card._id);
                      setExpandedSeries(card._id);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info(`View ${card.title} details`);
                    }}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expanded Management Panel */}
        {expandedSeries && currentSeries && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                Manage {currentSeries.cardTitle || FIXED_TEST_SERIES.find(s => s._id === activeTab)?.title}
              </CardTitle>
              <CardDescription>
                Edit details, upload videos, and manage series content
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="listing" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="listing">Listing Display</TabsTrigger>
                  <TabsTrigger value="details">Series Details</TabsTrigger>
                  <TabsTrigger value="video">Explanation Video</TabsTrigger>
                </TabsList>

                {/* Tab 1: Listing Page Display Settings */}
                <TabsContent value="listing" className="space-y-6 mt-6">
                  <h3 className="text-lg font-semibold">Listing Page Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Control how this test series appears on the listing page
                  </p>

                  <div className="space-y-4">
                    {/* Card Title */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Card Title
                      </label>
                      <Input
                        value={currentSeries.cardTitle || ""}
                        onChange={(e) => updateField("cardTitle", e.target.value)}
                        placeholder="Enter display title for listing page"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This title appears on the test series card
                      </p>
                    </div>

                    {/* Card Description */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Card Description
                      </label>
                      <Textarea
                        value={currentSeries.cardDescription || ""}
                        onChange={(e) =>
                          updateField("cardDescription", e.target.value)
                        }
                        placeholder="Brief description for the card (2-3 lines)"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Keep it concise - visible on card
                      </p>
                    </div>

                    {/* Thumbnail Upload */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Card Thumbnail
                      </label>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error("Image too large (max 2MB)");
                                return;
                              }
                              const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                              if (!validTypes.includes(file.type)) {
                                toast.error("Only JPEG, PNG, and WebP images are allowed");
                                return;
                              }
                              try {
                                const response =
                                  await testSeriesAPI.uploadMedia(
                                    file,
                                    "image",
                                    activeTab
                                  );
                                if (response.success) {
                                  updateField("cardThumbnail", response.url);
                                  // Update media cache
                                  setMediaCache((prev) => ({
                                    ...prev,
                                    [activeTab]: {
                                      ...prev[activeTab],
                                      thumbnail: response.url,
                                    },
                                  }));
                                  toast.success("Thumbnail uploaded successfully");
                                }
                              } catch (error) {
                                console.error('Upload error:', error);
                                toast.error("Failed to upload thumbnail");
                              }
                            }
                          }}
                          className="hidden"
                          id={`thumb-${activeTab}`}
                        />
                        <label
                          htmlFor={`thumb-${activeTab}`}
                          className="cursor-pointer"
                        >
                          {currentSeries.cardThumbnail || mediaCache[activeTab]?.thumbnail ? (
                            <>
                              <div className="mb-3 rounded overflow-hidden max-h-40">
                                <img
                                  src={currentSeries.cardThumbnail || mediaCache[activeTab]?.thumbnail}
                                  alt="Thumbnail preview"
                                  className="w-full h-40 object-cover"
                                />
                              </div>
                              <p className="text-sm font-semibold text-green-600">
                                ✓ Thumbnail uploaded
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Click to change thumbnail
                              </p>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm font-semibold">
                                Click to upload thumbnail
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG or JPEG (Max 2MB)
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={currentSeries.isActive !== false}
                          onChange={(e) =>
                            updateField("isActive", e.target.checked)
                          }
                          className="w-5 h-5 rounded border-border"
                        />
                        <span className="text-sm font-semibold">
                          {currentSeries.isActive !== false
                            ? "Active"
                            : "Hidden"}{" "}
                          on Listing Page
                        </span>
                      </label>
                    </div>

                    {/* Display Order */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Display Order
                      </label>
                      <Input
                        type="number"
                        value={currentSeries.displayOrder || 0}
                        onChange={(e) =>
                          updateField("displayOrder", parseInt(e.target.value))
                        }
                        min="0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Lower numbers appear first
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Series Details */}
                <TabsContent value="details" className="space-y-6 mt-6">
                  <h3 className="text-lg font-semibold">Series Details</h3>

                  <div className="space-y-4">
                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Description
                      </label>
                      <Textarea
                        value={currentSeries.description || ""}
                        onChange={(e) =>
                          updateField("description", e.target.value)
                        }
                        placeholder="Enter detailed description"
                        rows={4}
                      />
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Instructions
                      </label>
                      <Textarea
                        value={currentSeries.instructions || ""}
                        onChange={(e) =>
                          updateField("instructions", e.target.value)
                        }
                        placeholder="Enter test instructions for students"
                        rows={3}
                      />
                    </div>

                    {/* Highlights */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Key Highlights
                      </label>
                      <div className="space-y-2">
                        {(currentSeries.highlights || []).map(
                          (highlight: string, index: number) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={highlight}
                                onChange={(e) =>
                                  updateHighlight(index, e.target.value)
                                }
                                placeholder={`Highlight ${index + 1}`}
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteHighlight(index)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addHighlight}
                        className="mt-3"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Highlight
                      </Button>
                    </div>

                    {/* Series Dates for S1 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Series 1 Upload Date
                        </label>
                        <Input
                          type="date"
                          value={/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(currentSeries.seriesDates?.series1UploadDate || '') ? currentSeries.seriesDates?.series1UploadDate : ''}
                          onChange={(e) => {
                            const dates = currentSeries.seriesDates || {};
                            updateField("seriesDates", {
                              ...dates,
                              series1UploadDate: e.target.value,
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Series 2 Upload Date
                        </label>
                        <Input
                          type="date"
                          value={/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(currentSeries.seriesDates?.series2UploadDate || '') ? currentSeries.seriesDates?.series2UploadDate : ''}
                          onChange={(e) => {
                            const dates = currentSeries.seriesDates || {};
                            updateField("seriesDates", {
                              ...dates,
                              series2UploadDate: e.target.value,
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Series 3 Upload Date
                        </label>
                        <Input
                          type="date"
                          value={/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(currentSeries.seriesDates?.series3UploadDate || '') ? currentSeries.seriesDates?.series3UploadDate : ''}
                          onChange={(e) => {
                            const dates = currentSeries.seriesDates || {};
                            updateField("seriesDates", {
                              ...dates,
                              series3UploadDate: e.target.value,
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Subject-wise Date Schedule for All 3 Series */}
                    {activeTab === 's1' && (
                      <div className="border-t pt-6">
                        <h4 className="text-lg font-semibold mb-2">Subject-wise Date Schedule</h4>
                        <p className="text-sm text-muted-foreground mb-6">
                          Add dates for each subject across all 3 series. This schedule will be displayed to users instead of the "How to Use" section.
                        </p>
                        <div className="border border-border rounded-lg overflow-hidden bg-white">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-border">
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 w-40">Subject</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                                  <div className="text-center">Series 1 Date</div>
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                                  <div className="text-center">Series 2 Date</div>
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                                  <div className="text-center">Series 3 Date</div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const defaultSchedule = [
                                  { subject: 'FR', series1Date: '', series2Date: '', series3Date: '' },
                                  { subject: 'AFM', series1Date: '', series2Date: '', series3Date: '' },
                                  { subject: 'Audit', series1Date: '', series2Date: '', series3Date: '' },
                                  { subject: 'DT', series1Date: '', series2Date: '', series3Date: '' },
                                  { subject: 'IDT', series1Date: '', series2Date: '', series3Date: '' },
                                ];
                                
                                // Always ensure we have all 5 subjects
                                let schedule = currentSeries.subjectDateSchedule && currentSeries.subjectDateSchedule.length > 0
                                  ? currentSeries.subjectDateSchedule
                                  : defaultSchedule;

                                // Merge with default to ensure all subjects are present
                                const mergedSchedule = subjectOrder.map(subjectCode => {
                                  const existingRow = schedule.find((s: any) => s.subject === subjectCode);
                                  return existingRow || { subject: subjectCode, series1Date: '', series2Date: '', series3Date: '' };
                                });

                                return mergedSchedule.map((row: any, index: number) => (
                                  <tr key={index} className="border-b border-border hover:bg-blue-50/50 transition">
                                    <td className="px-6 py-4">
                                      <div className="font-bold text-lg text-white bg-blue-600 px-4 py-3 rounded inline-block min-w-24 text-center">
                                        {subjectNames[row.subject] || row.subject}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Input
                                        type="date"
                                        value={row.series1Date || ''}
                                        placeholder="dd-mm-yyyy"
                                        onChange={(e) => {
                                          const newSchedule = mergedSchedule.map((s: any, i: number) => 
                                            i === index ? { ...s, series1Date: e.target.value } : s
                                          );
                                          updateField('subjectDateSchedule', newSchedule);
                                        }}
                                        className="text-sm w-full"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <Input
                                        type="date"
                                        value={row.series2Date || ''}
                                        placeholder="dd-mm-yyyy"
                                        onChange={(e) => {
                                          const newSchedule = mergedSchedule.map((s: any, i: number) => 
                                            i === index ? { ...s, series2Date: e.target.value } : s
                                          );
                                          updateField('subjectDateSchedule', newSchedule);
                                        }}
                                        className="text-sm w-full"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <Input
                                        type="date"
                                        value={row.series3Date || ''}
                                        placeholder="dd-mm-yyyy"
                                        onChange={(e) => {
                                          const newSchedule = mergedSchedule.map((s: any, i: number) => 
                                            i === index ? { ...s, series3Date: e.target.value } : s
                                          );
                                          updateField('subjectDateSchedule', newSchedule);
                                        }}
                                        className="text-sm w-full"
                                      />
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Paper Upload Section - Series Specific */}
                    <div className="space-y-6">
                      {activeTab === 's1' && (
                        <>
                          <div>
                            <h4 className="text-lg font-semibold mb-4">Upload S1 Full Syllabus Test Papers</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              S1 has 3 series, each containing 1 test paper per subject (5 subjects total: FR, AFM, Audit, DT, IDT)
                            </p>
                          </div>

                          {/* S1 Upload Form */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Upload S1 Paper</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Series</label>
                                  <select
                                    value={paperForm.series}
                                    onChange={(e) => setPaperForm({ ...paperForm, series: e.target.value })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="series1">Series 1</option>
                                    <option value="series2">Series 2</option>
                                    <option value="series3">Series 3</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Subject</label>
                                  <select
                                    value={paperForm.subject}
                                    onChange={(e) => setPaperForm({ ...paperForm, subject: e.target.value })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="FR">FR (Financial Reporting)</option>
                                    <option value="AFM">AFM (Advanced Financial Management)</option>
                                    <option value="Audit">Audit (Audit and Assurance)</option>
                                    <option value="DT">DT (Direct Taxation)</option>
                                    <option value="IDT">IDT (Indirect Taxation)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Type</label>
                                  <select
                                    value={paperForm.paperType}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperType: e.target.value as any })}
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
                                    max="1"
                                    value={paperForm.paperNumber}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperNumber: parseInt(e.target.value) })}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">S1: 1 paper per subject per series</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Syllabus Coverage</label>
                                  <select
                                    value={paperForm.syllabusPercentage}
                                    onChange={(e) => setPaperForm({ ...paperForm, syllabusPercentage: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="100%">100% (Full Syllabus)</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Upload Paper File (PDF or Word)</label>
                                <input
                                  id="paper-file-input"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  className="w-full p-2 border rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, Word (.doc, .docx)</p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Availability Date</label>
                                <Input
                                  type="date"
                                  value={paperForm.availabilityDate}
                                  onChange={(e) => setPaperForm({ ...paperForm, availabilityDate: e.target.value })}
                                />
                              </div>

                              <Button
                                onClick={handleUploadPaper}
                                disabled={uploadingPaper}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                {uploadingPaper ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload S1 Paper
                              </Button>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {activeTab === 's2' && (
                        <>
                          <div>
                            <h4 className="text-lg font-semibold mb-4">Upload S2 50% Syllabus Test Papers</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              S2 has 2 test papers per subject (5 subjects total), each covering 50% of the syllabus
                            </p>
                          </div>

                          {/* S2 Upload Form */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Upload S2 Paper</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Subject</label>
                                  <select
                                    value={paperForm.subject}
                                    onChange={(e) => setPaperForm({ ...paperForm, subject: e.target.value })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="FR">FR (Financial Reporting)</option>
                                    <option value="AFM">AFM (Advanced Financial Management)</option>
                                    <option value="Audit">Audit (Audit and Assurance)</option>
                                    <option value="DT">DT (Direct Taxation)</option>
                                    <option value="IDT">IDT (Indirect Taxation)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Number</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="2"
                                    value={paperForm.paperNumber}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperNumber: parseInt(e.target.value) })}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">S2: 2 papers per subject</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Type</label>
                                  <select
                                    value={paperForm.paperType}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperType: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="question">Question Paper</option>
                                    <option value="suggested">Suggested Answers</option>
                                    <option value="evaluated">Evaluated Sheet</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Syllabus Coverage</label>
                                  <select
                                    value={paperForm.syllabusPercentage}
                                    onChange={(e) => setPaperForm({ ...paperForm, syllabusPercentage: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="50%">50% (Half Syllabus)</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Upload Paper File (PDF or Word)</label>
                                <input
                                  id="paper-file-input"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  className="w-full p-2 border rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, Word (.doc, .docx)</p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Availability Date</label>
                                <Input
                                  type="date"
                                  value={paperForm.availabilityDate}
                                  onChange={(e) => setPaperForm({ ...paperForm, availabilityDate: e.target.value })}
                                />
                              </div>

                              <Button
                                onClick={handleUploadPaper}
                                disabled={uploadingPaper}
                                className="w-full bg-green-600 hover:bg-green-700"
                              >
                                {uploadingPaper ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload S2 Paper
                              </Button>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {activeTab === 's3' && (
                        <>
                          <div>
                            <h4 className="text-lg font-semibold mb-4">Upload S3 30% Syllabus Test Papers</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              S3 has 3 test papers per subject (5 subjects total), each covering 30% of the syllabus
                            </p>
                          </div>

                          {/* S3 Upload Form */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Upload S3 Paper</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Subject</label>
                                  <select
                                    value={paperForm.subject}
                                    onChange={(e) => setPaperForm({ ...paperForm, subject: e.target.value })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="FR">FR (Financial Reporting)</option>
                                    <option value="AFM">AFM (Advanced Financial Management)</option>
                                    <option value="Audit">Audit (Audit and Assurance)</option>
                                    <option value="DT">DT (Direct Taxation)</option>
                                    <option value="IDT">IDT (Indirect Taxation)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Number</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="3"
                                    value={paperForm.paperNumber}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperNumber: parseInt(e.target.value) })}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">S3: 3 papers per subject</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Type</label>
                                  <select
                                    value={paperForm.paperType}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperType: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="question">Question Paper</option>
                                    <option value="suggested">Suggested Answers</option>
                                    <option value="evaluated">Evaluated Sheet</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Syllabus Coverage</label>
                                  <select
                                    value={paperForm.syllabusPercentage}
                                    onChange={(e) => setPaperForm({ ...paperForm, syllabusPercentage: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="30%">30% (Quick Revision)</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Upload Paper File (PDF or Word)</label>
                                <input
                                  id="paper-file-input"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  className="w-full p-2 border rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, Word (.doc, .docx)</p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Availability Date</label>
                                <Input
                                  type="date"
                                  value={paperForm.availabilityDate}
                                  onChange={(e) => setPaperForm({ ...paperForm, availabilityDate: e.target.value })}
                                />
                              </div>

                              <Button
                                onClick={handleUploadPaper}
                                disabled={uploadingPaper}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                              >
                                {uploadingPaper ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload S3 Paper
                              </Button>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {activeTab === 's4' && (
                        <>
                          <div>
                            <h4 className="text-lg font-semibold mb-4">Upload S4 CA Successful Specials Test Papers</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              S4 has 6 test papers per subject (5 subjects total): 1 Full (100%) + 2 Half (50%) + 3 Quick (30%)
                            </p>
                          </div>

                          {/* S4 Upload Form */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Upload S4 Paper</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Subject</label>
                                  <select
                                    value={paperForm.subject}
                                    onChange={(e) => setPaperForm({ ...paperForm, subject: e.target.value })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="FR">FR (Financial Reporting)</option>
                                    <option value="AFM">AFM (Advanced Financial Management)</option>
                                    <option value="Audit">Audit (Audit and Assurance)</option>
                                    <option value="DT">DT (Direct Taxation)</option>
                                    <option value="IDT">IDT (Indirect Taxation)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Number</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="6"
                                    value={paperForm.paperNumber}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperNumber: parseInt(e.target.value) })}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">S4: 6 papers per subject</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Paper Type</label>
                                  <select
                                    value={paperForm.paperType}
                                    onChange={(e) => setPaperForm({ ...paperForm, paperType: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="question">Question Paper</option>
                                    <option value="suggested">Suggested Answers</option>
                                    <option value="evaluated">Evaluated Sheet</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-2">Syllabus Coverage</label>
                                  <select
                                    value={paperForm.syllabusPercentage}
                                    onChange={(e) => setPaperForm({ ...paperForm, syllabusPercentage: e.target.value as any })}
                                    className="w-full p-2 border rounded"
                                  >
                                    <option value="100%">100% (Full Syllabus)</option>
                                    <option value="50%">50% (Half Syllabus)</option>
                                    <option value="30%">30% (Quick Revision)</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Upload Paper File (PDF or Word)</label>
                                <input
                                  id="paper-file-input"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  className="w-full p-2 border rounded"
                                />
                                <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, Word (.doc, .docx)</p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">Availability Date</label>
                                <Input
                                  type="date"
                                  value={paperForm.availabilityDate}
                                  onChange={(e) => setPaperForm({ ...paperForm, availabilityDate: e.target.value })}
                                />
                              </div>

                              <Button
                                onClick={handleUploadPaper}
                                disabled={uploadingPaper}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                              >
                                {uploadingPaper ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                Upload S4 Paper
                              </Button>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* Existing Papers */}
                      <div>
                        <h4 className="text-lg font-semibold mb-4">Uploaded Papers</h4>
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
                                      {paper.subject} - Paper {paper.paperNumber}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {paper.paperType === 'question' ? 'Question Paper' : paper.paperType === 'suggested' ? 'Suggested Answers' : 'Evaluated Sheet'} - {paper.syllabusPercentage}
                                    </p>
                                    {paper.series && <p className="text-xs text-gray-500">Series: {paper.series}</p>}
                                  </div>
                                  <div className="flex gap-2">
                                    {paper.publicFileUrl && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(paper.publicFileUrl, '_blank')}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeletePaper(paper._id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Explanation Video */}
                <TabsContent value="video" className="space-y-6 mt-6">
                  <h3 className="text-lg font-semibold">
                    Test Series Explanation Video
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a video file or provide a YouTube/Vimeo link to
                    explain the test series
                  </p>

                  {/* Video Type Selection */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Video Type</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={currentSeries.videoType === "UPLOAD"}
                          onChange={() => updateField("videoType", "UPLOAD")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Upload Video File</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={currentSeries.videoType === "EMBED"}
                          onChange={() => updateField("videoType", "EMBED")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">YouTube / Vimeo Link</span>
                      </label>
                    </div>
                  </div>

                  {/* Upload Video */}
                  {currentSeries.videoType === "UPLOAD" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Upload Video File
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Supported formats: MP4, WebM, MOV (Max 200MB)
                      </p>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition">
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 200 * 1024 * 1024) {
                                toast.error(
                                  "Video file too large. Max 200MB."
                                );
                                return;
                              }
                              const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
                              if (!validTypes.includes(file.type)) {
                                toast.error("Only MP4, WebM, and MOV videos are allowed");
                                return;
                              }
                              try {
                                updateField("isVideoUploading", true);
                                const response =
                                  await testSeriesAPI.uploadMedia(
                                    file,
                                    "video",
                                    activeTab
                                  );
                                if (response.success) {
                                  updateField("videoUrl", response.url);
                                  updateField(
                                    "videoFileId",
                                    response.fileId
                                  );
                                  updateField("videoType", "UPLOAD");
                                  // Update media cache
                                  setMediaCache((prev) => ({
                                    ...prev,
                                    [activeTab]: {
                                      ...prev[activeTab],
                                      video: response.url,
                                    },
                                  }));
                                  updateField("isVideoUploading", false);
                                  toast.success(
                                    `Video uploaded: ${file.name}`
                                  );
                                } else {
                                  throw new Error(
                                    response.message || "Upload failed"
                                  );
                                }
                              } catch (error: any) {
                                updateField("isVideoUploading", false);
                                console.error('Video upload error:', error);
                                toast.error(
                                  error.message || "Failed to upload video"
                                );
                              }
                            }
                          }}
                          className="hidden"
                          id={`video-upload-${activeTab}`}
                          disabled={currentSeries.isVideoUploading}
                        />
                        <label
                          htmlFor={`video-upload-${activeTab}`}
                          className="cursor-pointer block"
                        >
                          {currentSeries.isVideoUploading ? (
                            <>
                              <Loader className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
                              <p className="text-sm font-semibold">
                                Uploading...
                              </p>
                            </>
                          ) : currentSeries.videoUrl &&
                            currentSeries.videoType === "UPLOAD" ? (
                            <>
                              <p className="text-sm font-semibold text-green-600 mb-2">
                                ✓ Video uploaded
                              </p>
                              <div className="mt-4 bg-secondary/30 rounded p-4 flex items-center gap-3">
                                <Play className="w-5 h-5 text-primary flex-shrink-0" />
                                <div className="text-left">
                                  <p className="text-sm font-semibold">
                                    Video uploaded successfully
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Click to change video
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold">
                                📹 Click to upload video file
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                MP4, WebM, or MOV (Max 200MB)
                              </p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Embed Video */}
                  {currentSeries.videoType === "EMBED" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Video URL
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Paste your YouTube or Vimeo video link
                      </p>
                      <Input
                        type="url"
                        value={currentSeries.videoUrl || ""}
                        onChange={(e) =>
                          updateField("videoUrl", e.target.value)
                        }
                        placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                        className="mb-3"
                      />
                      {currentSeries.videoUrl &&
                        currentSeries.videoType === "EMBED" && (
                          <div className="mt-4 p-4 bg-green-600/10 border border-green-600 rounded-lg">
                            <p className="text-sm font-semibold text-green-600">
                              ✓ URL added
                            </p>
                            <p className="text-xs text-green-600/80 mt-1">
                              Video will be embedded on the user page
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Remove Video */}
                  {currentSeries.videoUrl && (
                    <Button
                      onClick={() => {
                        updateField("videoUrl", "");
                        updateField("videoFileId", "");
                        toast.success("Video removed");
                      }}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      Remove Video
                    </Button>
                  )}

                  {/* Video Visibility Toggle */}
                  <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                    <input
                      type="checkbox"
                      id={`isVideoEnabled-${activeTab}`}
                      checked={currentSeries.isVideoEnabled !== false}
                      onChange={(e) =>
                        updateField("isVideoEnabled", e.target.checked)
                      }
                      className="w-5 h-5 rounded border-border"
                    />
                    <label
                      htmlFor={`isVideoEnabled-${activeTab}`}
                      className="cursor-pointer flex items-center gap-2 flex-1"
                    >
                      {currentSeries.isVideoEnabled !== false ? (
                        <Eye size={18} className="text-primary" />
                      ) : (
                        <EyeOff size={18} className="text-muted-foreground" />
                      )}
                      <span className="text-sm font-semibold">
                        {currentSeries.isVideoEnabled !== false
                          ? "Video is visible"
                          : "Video is hidden"}
                      </span>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Button */}
              <div className="flex gap-3 mt-8 pt-6 border-t">
                <Button
                  onClick={handleSave}
                  className="btn-primary gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save All Changes
                </Button>
                <Button
                  onClick={() => setExpandedSeries(null)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SubadminTestSeries;
