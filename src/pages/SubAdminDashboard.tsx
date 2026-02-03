import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Clock,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Image,
  Video,
  BookOpen,
  File,
  X,
  FolderPlus,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { categories as defaultCategories, resourceTypes } from "@/data/mockData";
import { resourcesAPI, publishRequestAPI, categoriesAPI, coursesAPI, uploadAPI, testSeriesAnswerAPI } from "@/lib/api";

const menuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "resources", label: "My Resources", icon: FileText },
  { id: "upload", label: "Upload Resource", icon: Upload },
  { id: "content", label: "Course Content", icon: BookOpen },
  { id: "categories", label: "Manage Categories", icon: FolderPlus },
  { id: "requests", label: "My Requests", icon: Clock },
  { id: "test-series", label: "Test Series Management", icon: FileText, navigate: true },
  { id: "answersheets", label: "Users Answersheets", icon: FileText },
];

// Types
interface Resource {
  _id: string;
  title: string;
  type: string;
  resourceCategory?: string;
  category: string;
  status: string;
  createdAt: string;
  thumbnail?: string;
  fileUrl?: string;
  description: string;
}

interface PublishRequest {
  _id: string;
  title: string;
  contentId: string;
  requestedOn: string;
  status: string;
  adminComment?: string;
  thumbnail?: string;
}

interface Category {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
}

const SubAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<PublishRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  
  // Category management
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "" });
  
  const [stats, setStats] = useState({
    totalResources: 0,
    published: 0,
    pending: 0,
    drafts: 0,
  });

  // Filter state for resources
  const [selectedFilterType, setSelectedFilterType] = useState("all");

  // Course content management (subadmin)
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseChapters, setCourseChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDescription, setNewChapterDescription] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);
  const [addingItemForChapter, setAddingItemForChapter] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState('video');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  const [newItemDuration, setNewItemDuration] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterDescription, setEditChapterDescription] = useState('');
  const [editItemTitle, setEditItemTitle] = useState('');
  const [editItemType, setEditItemType] = useState('video');
  const [editItemUrl, setEditItemUrl] = useState('');
  const [editItemDuration, setEditItemDuration] = useState('');
  const [editItemFile, setEditItemFile] = useState<File | null>(null);

  // Edit dialogs
  const [editChapterDialogOpen, setEditChapterDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);

  // Users Answersheets state
  const [answerSheets, setAnswerSheets] = useState<any[]>([]);
  const [loadingAnswerSheets, setLoadingAnswerSheets] = useState(false);
  const [evaluateDialogOpen, setEvaluateDialogOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [evaluatedFile, setEvaluatedFile] = useState<File | null>(null);
  const [evaluationData, setEvaluationData] = useState({
    marksObtained: '',
    maxMarks: '100',
    evaluatorComments: ''
  });
  const [uploadingEvaluation, setUploadingEvaluation] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "",
    type: "",
    price: 0,
    file: null as File | null,
    thumbnail: null as File | null,
    thumbnailPreview: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Check if user is subadmin
  useEffect(() => {
    if (loading) return; // Wait for auth to load
    if (userRole !== 'subadmin' && userRole !== 'admin') {
      toast.error("Access denied. Sub-Admin only.");
      navigate("/");
    }
  }, [userRole, navigate, loading]);

  // Initialize selected course from localStorage so selection persists across refresh
  useEffect(() => {
    try {
      const stored = localStorage.getItem('subadmin_selected_course');
      if (stored) setSelectedCourseId(stored);
    } catch (e) { /* ignore */ }
  }, []);

  // Fetch resources, categories and requests on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user's resources - get all resources with high limit
        const resourcesData = await resourcesAPI.getByUser({ limit: 10000 });
        if (resourcesData.resources) {
          setResources(resourcesData.resources);
          
          // Update stats
          const published = resourcesData.resources.filter((r: Resource) => r.status === 'published').length;
          const pending = resourcesData.resources.filter((r: Resource) => r.status === 'pending').length;
          const drafts = resourcesData.resources.filter((r: Resource) => r.status === 'draft').length;
          
          setStats({
            totalResources: resourcesData.resources.length,
            published,
            pending,
            drafts,
          });
        }

        // Fetch categories (public)
        try {
          const categoriesData = await categoriesAPI.getAll();
          if (categoriesData && categoriesData.categories) {
            setCategories(categoriesData.categories);
          }
        } catch (err) {
          // non-fatal: keep defaultCategories if categories API fails
          console.warn('Failed to load categories from API', err);
        }

        // Fetch publish requests for current user
        const requestsData = await publishRequestAPI.getForUser({});
        if (requestsData && requestsData.requests) {
          // Enrich requests with content title from resources
          const enrichedRequests = requestsData.requests.map((req: any) => {
            const resource = resourcesData?.resources?.find((r: Resource) => r._id === req.contentId);
            return {
              ...req,
              title: req.content?.title || resource?.title || 'Unknown',
              thumbnail: resource?.thumbnail,
              requestedOn: req.createdAt,
            };
          });
          setRequests(enrichedRequests);
          // Fetch courses for course content tab
          try {
            const coursesData = await coursesAPI.getAll({ limit: 100 });
            if (coursesData && (coursesData.courses || coursesData.courses === undefined)) {
              // API returns `{ courses }` or directly array depending on backend; normalize
              const list = coursesData.courses || coursesData;
              setCourses(list || []);
            }
          } catch (err) {
            console.warn('Failed to load courses for subadmin content tab', err);
          }
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch answer sheets when answersheets tab is active
  useEffect(() => {
    if (activeTab === 'answersheets') {
      fetchAnswerSheets();
    }
  }, [activeTab]);

  const fetchAnswerSheets = async () => {
    setLoadingAnswerSheets(true);
    try {
      const res: any = await testSeriesAnswerAPI.getAllAnswerSheets();
      if (res.answers) {
        setAnswerSheets(res.answers);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load answer sheets');
    } finally {
      setLoadingAnswerSheets(false);
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

  const handleUploadEvaluation = async () => {
    if (!selectedAnswer || !evaluatedFile) {
      toast.error('Please select an evaluated sheet file');
      return;
    }

    if (!evaluationData.marksObtained) {
      toast.error('Please enter marks obtained');
      return;
    }

    try {
      setUploadingEvaluation(true);
      await testSeriesAnswerAPI.uploadEvaluatedSheet(
        selectedAnswer._id,
        evaluatedFile,
        parseFloat(evaluationData.marksObtained),
        parseFloat(evaluationData.maxMarks),
        evaluationData.evaluatorComments
      );
      toast.success('Evaluated sheet uploaded successfully');
      setEvaluateDialogOpen(false);
      setSelectedAnswer(null);
      setEvaluatedFile(null);
      setEvaluationData({ marksObtained: '', maxMarks: '100', evaluatorComments: '' });
      fetchAnswerSheets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload evaluated sheet');
    } finally {
      setUploadingEvaluation(false);
    }
  };

  // Reusable load function for chapters
  const loadChapters = async (courseId?: string) => {
    const idToLoad = courseId || selectedCourseId;
    if (!idToLoad) return;
    setLoadingChapters(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      console.log('loadChapters token:', !!token, token && token.slice ? token.slice(0,16) + '...' : token);
      const resp = await fetch(`${API_URL}/courses/${idToLoad}`, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      const text = await resp.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch (e) { data = text; }
      console.log('loadChapters response status', resp.status, data);
      const course = (data && (data.course || data)) || null;
      setCourseChapters(course?.chapters || []);
      try { localStorage.setItem('subadmin_selected_course', idToLoad); } catch (e) {}
    } catch (err: any) {
      console.error('Failed to load course (auto)', err);
      toast.error(err?.message || 'Failed to load chapters');
    } finally { setLoadingChapters(false); }
  };

  // Auto-load when selectedCourseId changes
  useEffect(() => { if (selectedCourseId) loadChapters(selectedCourseId); }, [selectedCourseId]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // Chapter management handlers
  const handleEditChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setEditChapterTitle(chapter.title);
    setEditChapterDescription(chapter.description || '');
    setEditChapterDialogOpen(true);
  };

  const handleUpdateChapter = async () => {
    if (!selectedCourseId || !editingChapter) return;
    try {
      await coursesAPI.updateChapter(selectedCourseId, editingChapter._id, {
        title: editChapterTitle,
        description: editChapterDescription,
      });
      await loadChapters(selectedCourseId);
      setEditingChapter(null);
      setEditChapterTitle('');
      setEditChapterDescription('');
      setEditChapterDialogOpen(false);
      toast.success('Chapter updated successfully');
    } catch (err: any) {
      console.error('Update chapter failed', err);
      toast.error(err.message || 'Failed to update chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!selectedCourseId) return;
    if (!confirm('Are you sure you want to delete this chapter? This will also delete all items in it.')) return;
    try {
      await coursesAPI.deleteChapter(selectedCourseId, chapterId);
      await loadChapters(selectedCourseId);
      toast.success('Chapter deleted successfully');
    } catch (err: any) {
      console.error('Delete chapter failed', err);
      toast.error(err.message || 'Failed to delete chapter');
    }
  };

  // Item management handlers
  const handleEditItem = (item: any, chapterId: string) => {
    setEditingItem({ ...item, chapterId }); // Include chapterId in editingItem
    setEditItemTitle(item.title);
    setEditItemType(item.type || 'video');
    setEditItemUrl(item.url || '');
    setEditItemDuration(item.duration || '');
    setEditItemFile(null); // Reset file on edit
    setEditItemDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedCourseId || !editingItem) return;
    try {
      if (editItemFile) {
        // Upload new file
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('token');
        const fd = new FormData();
        fd.append('file', editItemFile);
        fd.append('title', editItemTitle);
        fd.append('type', editItemType);
        if (editItemDuration) fd.append('duration', editItemDuration);

        const resp = await fetch(`${API_URL}/courses/${selectedCourseId}/chapters/${editingItem.chapterId}/items/${editingItem._id}`, {
          method: 'PUT',
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
          body: fd,
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Update failed: ${resp.status}`);
        }

        const data = await resp.json();
        console.log('Update with file response:', data);
      } else {
        // Update without file
        await coursesAPI.updateChapterItem(selectedCourseId, editingItem.chapterId, editingItem._id, {
          title: editItemTitle,
          type: editItemType,
          url: editItemUrl,
          duration: editItemDuration,
        });
      }
      await loadChapters(selectedCourseId);
      setEditingItem(null);
      setEditItemTitle('');
      setEditItemType('video');
      setEditItemUrl('');
      setEditItemDuration('');
      setEditItemFile(null);
      setEditItemDialogOpen(false);
      toast.success('Item updated successfully');
    } catch (err: any) {
      console.error('Update item failed', err);
      toast.error(err.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (chapterId: string, itemId: string) => {
    if (!selectedCourseId) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await coursesAPI.deleteChapterItem(selectedCourseId, chapterId, itemId);
      await loadChapters(selectedCourseId);
      toast.success('Item deleted successfully');
    } catch (err: any) {
      console.error('Delete item failed', err);
      toast.error(err.message || 'Failed to delete item');
    }
  };

  // Helper function to get category name from ID
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => 
      cat._id === categoryId || cat.id === categoryId || cat.name === categoryId
    );
    return category?.name || categoryId || "Uncategorized";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm({ 
          ...uploadForm, 
          thumbnail: file,
          thumbnailPreview: reader.result as string 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setUploadForm({ 
      ...uploadForm, 
      thumbnail: null,
      thumbnailPreview: "" 
    });
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const handleUploadResource = async () => {
    if (!uploadForm.title || !uploadForm.title.trim()) {
      toast.error("Please enter a resource title");
      return;
    }

    if (!uploadForm.category) {
      toast.error("Please select a category");
      return;
    }

    if (!uploadForm.type) {
      toast.error("Please select a resource type");
      return;
    }

    // If not editing, file is required. If editing, file is optional
    if (!editingResourceId && !uploadForm.file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!uploadForm.thumbnailPreview) {
      toast.error("Please upload a thumbnail/cover image");
      return;
    }

    setUploading(true);
    try {
      const isEditing = !!editingResourceId;
      
      console.log('Starting resource', isEditing ? 'update' : 'upload', 'with data:', {
        title: uploadForm.title,
        category: uploadForm.category,
        resourceCategory: uploadForm.type,
        description: uploadForm.description,
        fileSize: uploadForm.file?.size,
        hasThumb: !!uploadForm.thumbnail,
      });

      // Call typed-resources endpoint
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description || "No description provided");
      formData.append('category', uploadForm.category);
      formData.append('resourceCategory', uploadForm.type); // This is the key: video, book, test, notes
      formData.append('price', String(uploadForm.price || 0));
      if (uploadForm.file) formData.append('file', uploadForm.file);
      if (uploadForm.thumbnail) formData.append('thumbnail', uploadForm.thumbnail);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Use update endpoint if editing, create endpoint if new
      const endpoint = isEditing 
        ? `${API_URL}/resources/${editingResourceId}`
        : `${API_URL}/typed-resources/create-typed`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      }).then(async (res) => {
        console.log('Response status:', res.status);
        console.log('Response headers:', res.headers);
        
        const contentType = res.headers.get('content-type');
        const text = await res.text();
        
        console.log('Response text:', text);
        console.log('Content-Type:', contentType);
        
        if (!res.ok) {
          try {
            const err = JSON.parse(text);
            throw new Error(err.message || `Operation failed with status ${res.status}`);
          } catch (e) {
            throw new Error(`Operation failed: ${text || 'Unknown error'}`);
          }
        }
        
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('JSON Parse Error:', e);
          throw new Error(`Invalid response format: ${e.message}`);
        }
      });

      console.log('Response:', response);

      const newResource = (response && (response.resource || response)) || response;

      if (isEditing) {
        // Update the resource in the list
        setResources(resources.map(r => 
          r._id === editingResourceId ? newResource : r
        ));
        toast.success("Resource updated successfully!");
        setEditingResourceId(null);
      } else {
        // Add new resource to the list
        setResources([newResource, ...resources]);
        setStats({
          ...stats,
          totalResources: (stats.totalResources || 0) + 1,
          drafts: (stats.drafts || 0) + 1,
        });
        toast.success("Resource uploaded successfully!");
      }

      // Reset form
      setUploadForm({
        title: "",
        description: "",
        category: "",
        type: "",
        price: 0,
        file: null,
        thumbnail: null,
        thumbnailPreview: "",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";

      setActiveTab("resources");
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error message:', error.message);
      toast.error(error.message || "Failed to process resource. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendPublishRequest = async (resourceId: string) => {
    try {
      const resource = resources.find(r => r._id === resourceId);
      if (!resource) {
        toast.error("Resource not found");
        return;
      }

      // Create a publish request
      await publishRequestAPI.create({
        contentType: 'resource',
        contentId: resourceId,
        notes: `Request to publish: ${resource.title}`,
      });

      // Update resource status locally
      setResources(resources.map(r => 
        r._id === resourceId ? { ...r, status: "pending" } : r
      ));

      // Update stats
      setStats({
        ...stats,
        pending: stats.pending + 1,
        drafts: stats.drafts - 1,
      });

      toast.success("Publish request sent to admin!");
    } catch (error: any) {
      console.error('Error sending publish request:', error);
      toast.error(error.message || "Failed to send publish request");
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await resourcesAPI.delete(id);
      const resource = resources.find(r => r._id === id);
      if (resource) {
        setResources(resources.filter(r => r._id !== id));
        setStats({
          ...stats,
          totalResources: stats.totalResources - 1,
          [resource.status as 'published' | 'pending' | 'drafts']: 
            stats[resource.status as 'published' | 'pending' | 'drafts'] - 1,
        });
        toast.success("Resource deleted");
      }
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast.error(error.message || "Failed to delete resource");
    }
  };

  const handleEditResource = (resourceId: string) => {
    const resource = resources.find(r => r._id === resourceId);
    if (resource) {
      // Fill upload form with existing data
      setUploadForm({
        title: resource.title,
        description: resource.description,
        category: resource.category,
        type: resource.type,
        price: resource.price || 0,
        file: null,
        thumbnail: null,
        thumbnailPreview: resource.thumbnail || "",
      });
      setEditingResourceId(resourceId);
      setActiveTab("upload");
      toast.info("Edit mode: Update the details and click Upload");
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({ name: category.name, slug: category.slug });
    setCategoryDialogOpen(true);
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast.error("Please enter category name");
      return;
    }
    const slug = newCategory.slug || newCategory.name.toLowerCase().replace(/\s+/g, '-');

    if (userRole !== 'admin' && userRole !== 'subadmin') {
      toast.error('Only admins and subadmins can create categories');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        await categoriesAPI.update(editingCategory._id || editingCategory.id || '', {
          name: newCategory.name,
          description: "",
        });
        setCategories(categories.map(c =>
          (c._id || c.id) === (editingCategory._id || editingCategory.id)
            ? { ...c, name: newCategory.name, slug: slug }
            : c
        ));
        toast.success("Category updated successfully!");
      } else {
        // Create new category
        const newCat = await categoriesAPI.create({
          name: newCategory.name,
          description: "",
        });
        setCategories([...categories, {
          id: newCat._id,
          _id: newCat._id,
          name: newCat.name,
          slug: slug,
        }]);
        toast.success("Category added successfully!");
      }

      setNewCategory({ name: "", slug: "" });
      setEditingCategory(null);
      setCategoryDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === "all") {
      toast.error("Cannot delete default category");
      return;
    }
    if (userRole !== 'admin' && userRole !== 'subadmin') {
      toast.error('Only admins and subadmins can delete categories');
      return;
    }

    try {
      await categoriesAPI.delete(id);
      setCategories(categories.filter(c => (c._id || c.id) !== id));
      toast.success("Category deleted");
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || "Failed to delete category");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "published":
        return <CheckCircle className="text-green" size={16} />;
      case "rejected":
        return <XCircle className="text-destructive" size={16} />;
      case "pending":
        return <AlertCircle className="text-amber-500" size={16} />;
      default:
        return null;
    }
  };

  const getStatusClass = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "approved":
      case "published":
        return "bg-card/90 backdrop-blur-sm text-foreground";
      case "rejected":
        return "bg-destructive/20 text-destructive";
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "draft":
        return "bg-secondary text-foreground";
      default:
        return "bg-secondary text-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "pdf":
        return <FileText size={20} className="text-red-500" />;
      case "video":
        return <Video size={20} className="text-blue" />;
      case "book":
        return <BookOpen size={20} className="text-green" />;
      default:
        return <File size={20} className="text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="bg-gradient-to-r from-accent to-slate-dark py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome, {user?.name || 'Sub-Admin'}
          </h1>
          <p className="text-white/80 mt-2">Manage and upload resources</p>
        </div>
      </div>

      <section className="py-8 bg-background min-h-screen">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden sticky top-4">
                {menuItems.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.navigate) {
                        navigate('/subadmin/test-series');
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 text-sm ${
                      activeTab === item.id
                        ? "bg-accent text-white"
                        : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-destructive/10 text-destructive text-sm transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-4">
              {/* Overview */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Resources", value: stats.totalResources.toString(), color: "from-blue to-blue-light", icon: FileText },
                      { label: "Published", value: stats.published.toString(), color: "from-green to-success", icon: CheckCircle },
                      { label: "Pending Approval", value: stats.pending.toString(), color: "from-amber-500 to-amber-400", icon: Clock },
                      { label: "Drafts", value: stats.drafts.toString(), color: "from-secondary to-muted", icon: Edit },
                    ].map((stat, i) => (
                      <div key={i} className={`bg-gradient-to-br ${stat.color} p-6 rounded-xl shadow-lg ${i === 3 ? 'text-foreground' : 'text-white'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`${i === 3 ? 'text-muted-foreground' : 'text-white/80'} text-sm`}>{stat.label}</p>
                            <p className="text-3xl font-bold mt-2">{stat.value}</p>
                          </div>
                          <stat.icon size={40} className={`${i === 3 ? 'text-muted-foreground/30' : 'text-white/30'}`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-accent" />
                        All Uploads
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {resources.map((resource) => (
                          <div key={resource._id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                            <img 
                              src={resource.thumbnail || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=50&h=50&fit=crop"} 
                              alt={resource.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{resource.title}</p>
                              <p className="text-xs text-muted-foreground">{resource.category}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${getStatusClass(resource.status)}`}>
                              {resource.status?.charAt(0).toUpperCase()}{resource.status?.slice(1)}
                            </span>
                          </div>
                        ))}
                        {resources.length === 0 && (
                          <p className="text-sm text-muted-foreground">No resources yet</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Upload size={20} className="text-green" />
                        Quick Actions
                      </h3>
                      <div className="space-y-3">
                        <Button className="w-full justify-start bg-primary hover:bg-primary/90" onClick={() => setActiveTab("upload")}>
                          <Upload size={18} className="mr-2" /> Upload New Resource
                        </Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setActiveTab("requests")}>
                          <Clock size={18} className="mr-2" /> View My Requests
                        </Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setActiveTab("resources")}>
                          <FileText size={18} className="mr-2" /> Manage Resources
                        </Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setActiveTab("content") }>
                          <BookOpen size={18} className="mr-2" /> Course Content
                        </Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => navigate('/subadmin/test-series')}>
                          <FileText size={18} className="mr-2" /> Test Series Management
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* My Resources */}
              {activeTab === "resources" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">My Resources</h2>
                      <p className="text-muted-foreground text-sm mt-1">Manage your uploaded content</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Filter by Resource Type:</Label>
                        <Select value={selectedFilterType} onValueChange={setSelectedFilterType}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="video">🎥 Video</SelectItem>
                            <SelectItem value="book">📚 Book</SelectItem>
                            <SelectItem value="test">📝 Test</SelectItem>
                            <SelectItem value="notes">📄 Notes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="btn-primary" onClick={() => setActiveTab("upload")}>
                        <Plus size={18} className="mr-2" /> Upload New
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      // Debug: Log resource types to console
                      console.log('Available resource types:', resources.map(r => r.type));
                      console.log('Selected filter:', selectedFilterType);

                      const filtered = resources.filter((resource) =>
                        selectedFilterType === "all" ||
                        (resource.resourceCategory || resource.type)?.toLowerCase().trim() === selectedFilterType.toLowerCase().trim()
                      );

                      console.log('Filtered resources count:', filtered.length);
                      return filtered;
                    })().map((resource) => (
                      <div key={resource._id} className="bg-secondary/30 rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative">
                          {
                            (() => {
                              const BACKEND_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                              const thumb = resource.thumbnail || '';
                              const src = thumb.startsWith('/api/') ? `${BACKEND_BASE}${thumb}` : (thumb || '/placeholder.svg');
                              return (
                                <img
                                  src={src}
                                  alt={resource.title}
                                  className="w-full h-40 object-cover bg-muted"
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    img.onerror = null;
                                    img.src = '/placeholder.svg';
                                  }}
                                />
                              );
                            })()
                          }
                          <div className="absolute top-2 left-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(resource.status)}`}>
                              {resource.status}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-card/90 backdrop-blur-sm">
                              {resource.type}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold truncate">{resource.title}</h4>
                          <p className="text-sm font-medium text-primary">
                            {resource.price ? `₨ ${resource.price.toLocaleString()}` : "Free"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(resource.createdAt).toLocaleDateString()}
                          </p>
                          
                          <div className="flex gap-2 mt-4 flex-wrap">
                            <Button 
                              size="sm" 
                              className="flex-1 bg-primary hover:bg-primary/90 text-xs"
                              onClick={() => handleSendPublishRequest(resource._id)}
                              disabled={resource.status !== "draft"}
                            >
                              <Send size={14} className="mr-1" /> Publish Request
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={() => handleEditResource(resource._id)}
                            >
                              <Edit size={14} className="mr-1" /> Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10 px-2"
                              onClick={() => handleDeleteResource(resource._id)}
                              title="Delete resource"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {resources.length === 0 && (
                      <div className="col-span-full text-center py-12">
                        <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No resources yet. Upload your first resource!</p>
                        <Button className="btn-primary mt-4" onClick={() => setActiveTab("upload")}>
                          <Plus size={18} className="mr-2" /> Upload Resource
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Resource */}
              {activeTab === "upload" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <h2 className="text-xl font-semibold mb-2">Upload New Resource</h2>
                  <p className="text-muted-foreground text-sm mb-6">Upload PDF, video, book or other educational content</p>
                  
                  {uploading && (
                    <div className="mb-6 p-4 bg-blue/10 border border-blue/20 rounded-lg flex items-center gap-3">
                      <Loader2 size={20} className="animate-spin text-blue" />
                      <p className="text-sm text-blue">Uploading your resource to Appwrite...</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form */}
                    <div className="space-y-5">
                      <div>
                        <Label>Resource Title *</Label>
                        <Input 
                          placeholder="e.g., FR Chapter 1 Notes" 
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea 
                          placeholder="Brief description of the resource..." 
                          rows={3}
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          className="mt-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Resource Type *</Label>
                          <Select 
                            value={uploadForm.type}
                            onValueChange={(value) => setUploadForm({ ...uploadForm, type: value })}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">🎥 Video (Courses)</SelectItem>
                              <SelectItem value="book">📚 Book</SelectItem>
                              <SelectItem value="test">📝 Test/Quiz (Test Series)</SelectItem>
                              <SelectItem value="notes">📄 Notes/PDF (Free Resource)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Category *</Label>
                          <Select 
                            value={uploadForm.category}
                            onValueChange={(value) => setUploadForm({ ...uploadForm, category: value })}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.filter(c => (c._id || c.id) !== "all").map((cat) => (
                                <SelectItem key={cat._id || cat.id} value={cat._id || cat.id || cat.name}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Price (PKR) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="Enter price (0 for free)"
                            value={uploadForm.price}
                            onChange={(e) => setUploadForm({ ...uploadForm, price: Number(e.target.value) || 0 })}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Upload File</Label>
                        <div 
                          className="mt-2 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.mp4,.mov,.doc,.docx,.ppt,.pptx"
                          />
                          {uploadForm.file ? (
                            <div className="flex items-center justify-center gap-2">
                              {getTypeIcon(uploadForm.type)}
                              <span className="font-medium">{uploadForm.file.name}</span>
                            </div>
                          ) : (
                            <>
                              <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PDF, Video, Word, PowerPoint (Max 100MB)
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Preview */}
                    <div>
                      <Label>Cover Image / Thumbnail *</Label>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        This image will be shown as the resource thumbnail
                      </p>
                      
                      <div 
                        className="border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors relative"
                        onClick={() => thumbnailInputRef.current?.click()}
                      >
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleThumbnailSelect}
                          accept="image/*"
                        />
                        {uploadForm.thumbnailPreview ? (
                          <div className="relative">
                            <img 
                              src={uploadForm.thumbnailPreview} 
                              alt="Thumbnail preview"
                              className="w-full h-64 object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveThumbnail(); }}
                              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="h-64 flex flex-col items-center justify-center">
                            <Image size={48} className="text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">Click to upload thumbnail</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG (Recommended: 400x300)</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Preview Card</h4>
                        <div className="bg-card rounded-lg border border-border overflow-hidden">
                          <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            {uploadForm.thumbnailPreview ? (
                              <img 
                                src={uploadForm.thumbnailPreview} 
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image size={32} className="text-muted-foreground" />
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-medium text-sm truncate">
                              {uploadForm.title || "Resource Title"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {uploadForm.category || "Category"} • {uploadForm.type || "Type"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                    <Button variant="secondary" onClick={() => {
                      setActiveTab("resources");
                      setEditingResourceId(null);
                    }} disabled={uploading}>
                      Cancel
                    </Button>
                    <Button className="btn-primary" onClick={handleUploadResource} disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" /> {editingResourceId ? "Updating..." : "Uploading..."}
                        </>
                      ) : (
                        <>
                          <Upload size={18} className="mr-2" /> {editingResourceId ? "Update Resource" : "Upload Resource"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Course Content Management (SubAdmin) */}
              {activeTab === "content" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Course Content</h2>
                      <p className="text-muted-foreground text-sm mt-1">Select a course to manage chapters and items</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">Select Course</label>
                      <select className="w-full mt-2 p-2 border rounded" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                        <option value="">-- Select a course --</option>
                        {courses.map((c) => (
                          <option key={c._id || c.id} value={c._id || c.id}>{c.title || c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={async () => {
                        if (!selectedCourseId) { toast.error('Select a course first'); return; }
                        setLoadingChapters(true);
                        try {
                          const res: any = await coursesAPI.getById(selectedCourseId);
                          const course = res.course || res;
                          setCourseChapters(course.chapters || []);
                          toast.success('Loaded course chapters');
                        } catch (err: any) {
                          console.error('Failed to load course', err);
                          toast.error(err.message || 'Failed to load course');
                        } finally { setLoadingChapters(false); }
                      }}>Load Chapters</Button>
                    </div>
                  </div>

                  {/* Add Chapter Form */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Add New Chapter</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input placeholder="Chapter title" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} />
                      <Input placeholder="Short description" value={newChapterDescription} onChange={(e) => setNewChapterDescription(e.target.value)} />
                      <div className="flex items-center gap-2">
                        <Button className="btn-primary w-full" onClick={async () => {
                          if (!selectedCourseId) { toast.error('Select a course first'); return; }
                          if (!newChapterTitle) { toast.error('Provide chapter title'); return; }
                          setAddingChapter(true);
                          try {
                            await coursesAPI.addChapter(selectedCourseId, { title: newChapterTitle, description: newChapterDescription });
                            // Re-fetch chapters to ensure consistency
                            await loadChapters(selectedCourseId);
                            setNewChapterTitle(''); setNewChapterDescription('');
                            toast.success('Chapter added');
                          } catch (err: any) {
                            console.error('Add chapter failed', err);
                            toast.error(err.message || 'Failed to add chapter');
                          } finally { setAddingChapter(false); }
                        }} disabled={addingChapter}>{addingChapter ? 'Adding...' : 'Add Chapter'}</Button>
                      </div>
                    </div>
                  </div>

                  {/* Chapters List */}
                  <div className="space-y-4">
                    {loadingChapters && <p className="text-sm text-muted-foreground">Loading chapters...</p>}
                    {(!loadingChapters && (!courseChapters || courseChapters.length === 0)) && <p className="text-sm text-muted-foreground">No chapters for selected course.</p>}
                    {courseChapters.map((ch: any) => (
                      <div key={ch._id || ch.title} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{ch.title}</p>
                            {ch.description && <p className="text-sm text-muted-foreground">{ch.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{(ch.items||[]).length} items</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/10"
                              onClick={() => handleEditChapter(ch)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteChapter(ch._id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <details>
                            <summary className="cursor-pointer text-sm text-primary">Add Item to this chapter</summary>
                            <div className="mt-3 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Input placeholder="Item title" value={addingItemForChapter === ch._id ? newItemTitle : ''} onChange={(e) => { setAddingItemForChapter(ch._id); setNewItemTitle(e.target.value); }} />
                                <select className="p-2 border rounded" value={addingItemForChapter === ch._id ? newItemType : 'video'} onChange={(e) => { setAddingItemForChapter(ch._id); setNewItemType(e.target.value); }}>
                                  <option value="video">Video</option>
                                  <option value="pdf">PDF</option>
                                </select>
                                <Input placeholder="Duration (optional)" value={addingItemForChapter === ch._id ? newItemDuration : ''} onChange={(e) => { setAddingItemForChapter(ch._id); setNewItemDuration(e.target.value); }} />
                              </div>

                              {/* File Upload Section */}
                              <div className="border-2 border-dashed border-border rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    {addingItemForChapter === ch._id && newItemFile ? (
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          {newItemType === 'video' ? (
                                            <Video size={20} className="text-blue-500" />
                                          ) : (
                                            <File size={20} className="text-red-500" />
                                          )}
                                          <div>
                                            <p className="font-medium text-sm">{newItemFile.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {(newItemFile.size / (1024 * 1024)).toFixed(2)} MB • {newItemType.toUpperCase()}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-4">
                                        <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">No file selected</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="file"
                                      accept={newItemType === 'video' ? 'video/*' : 'application/pdf'}
                                      className="hidden"
                                      id={`chapter-file-${ch._id}`}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        setAddingItemForChapter(ch._id);
                                        setNewItemFile(f);
                                      }}
                                    />
                                    <label
                                      htmlFor={`chapter-file-${ch._id}`}
                                      className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm cursor-pointer hover:bg-primary/90"
                                    >
                                      {addingItemForChapter === ch._id && newItemFile ? 'Change File' : 'Choose File'}
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  className="btn-primary"
                                  onClick={async () => {
                                    if (!selectedCourseId) { toast.error('Select a course first'); return; }
                                    const trimmedTitle = newItemTitle.trim();
                                    if (!trimmedTitle) { toast.error('Item title required'); return; }
                                    if (!newItemFile) { toast.error('Select a file to upload'); return; }
                                    setAddingItem(true);
                                    try {
                                      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                                      const token = localStorage.getItem('token');
                                      const fd = new FormData();
                                      fd.append('file', newItemFile as File);
                                      fd.append('title', trimmedTitle);
                                      fd.append('type', newItemType || 'video');
                                      if (newItemDuration) fd.append('duration', newItemDuration);

                                      const resp = await fetch(`${API_URL}/courses/${selectedCourseId}/chapters/${ch._id}/items/upload`, {
                                        method: 'POST',
                                        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                                        body: fd,
                                      });

                                      if (!resp.ok) {
                                        const text = await resp.text();
                                        throw new Error(text || `Upload failed: ${resp.status}`);
                                      }

                                      const data = await resp.json();
                                      const addedItem = data?.item || data?.item || null;
                                      if (addedItem) {
                                        // Re-fetch chapters to reflect persisted state
                                        await loadChapters(selectedCourseId);
                                        setAddingItemForChapter(null);
                                        setNewItemTitle('');
                                        setNewItemUrl('');
                                        setNewItemFile(null);
                                        setNewItemType('video');
                                        setNewItemDuration('');
                                        toast.success('File uploaded and attached to chapter');
                                      } else {
                                        throw new Error('Invalid server response');
                                      }
                                    } catch (err: any) {
                                      console.error('Upload+attach failed', err);
                                      toast.error(err.message || 'Failed to upload and attach file');
                                    } finally { setAddingItem(false); }
                                  }}
                                  disabled={addingItem}
                                >
                                  {addingItem ? 'Uploading...' : 'Upload & Attach'}
                                </Button>
                              </div>
                            </div>
                          </details>

                          {/* Existing items */}
                          {(ch.items || []).length > 0 && (
                            <div className="mt-4 space-y-2">
                              {(ch.items || []).map((it: any, idx: number) => (
                                <div key={it._id || idx} className="flex items-center justify-between p-2 border rounded">
                                  <div>
                                    <p className="font-medium">{it.title}</p>
                                    <p className="text-xs text-muted-foreground">{it.type}{it.duration ? ` • ${it.duration}` : ''}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">{it.url ? 'Has URL' : 'No URL'}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-primary hover:bg-primary/10"
                                      onClick={() => handleEditItem(it, ch._id)}
                                    >
                                      <Edit size={12} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteItem(ch._id, it._id)}
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manage Categories */}
              {activeTab === "categories" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Manage Categories</h2>
                      <p className="text-muted-foreground text-sm mt-1">Add or manage content categories</p>
                    </div>
                    <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                      <Button className="btn-primary" onClick={() => setCategoryDialogOpen(true)}>
                        <Plus size={18} className="mr-2" /> Add Category
                      </Button>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Category</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Category Name *</Label>
                            <Input 
                              placeholder="e.g., CA Foundation" 
                              value={newCategory.name}
                              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>URL Slug (optional)</Label>
                            <Input 
                              placeholder="e.g., ca-foundation" 
                              value={newCategory.slug}
                              onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate from name</p>
                          </div>
                          <div className="flex gap-4 mt-6">
                            <Button variant="secondary" onClick={() => { setCategoryDialogOpen(false); setEditingCategory(null); }}>Cancel</Button>
                            <Button className="btn-primary" onClick={handleAddCategory}>
                              {editingCategory ? 'Update Category' : 'Add Category'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <div key={category._id || category.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                            <Tag size={20} className="text-accent" />
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-xs text-muted-foreground">{category.slug}</p>
                          </div>
                        </div>
                        {(category._id || category.id) !== "all" && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/10"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCategory(category._id || category.id || '')}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* My Requests */}
              {activeTab === "requests" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <h2 className="text-xl font-semibold mb-2">My Publish Requests</h2>
                  <p className="text-muted-foreground text-sm mb-6">Track the status of your publish requests</p>

                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div 
                        key={request._id} 
                        className={`flex items-center gap-4 p-4 rounded-xl border ${
                          request.status === "pending" 
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" 
                            : request.status === "approved"
                            ? "bg-green/5 border-green/20"
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                      >
                        <img 
                          src={request.thumbnail || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=56&h=56&fit=crop"} 
                          alt={request.title}
                          className="w-14 h-14 rounded-lg object-cover border border-border"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold">{request.title}</h4>
                          <p className="text-sm text-muted-foreground">Requested on {new Date(request.requestedOn).toLocaleDateString()}</p>
                          {request.adminComment && (
                            <p className="text-sm mt-1 italic">Admin: "{request.adminComment}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span className={`px-3 py-1.5 rounded text-sm font-medium ${getStatusClass(request.status)}`}>
                            {request.status?.charAt(0).toUpperCase()}{request.status?.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {requests.length === 0 && (
                      <div className="text-center py-12">
                        <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No publish requests yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Users Answersheets */}
              {activeTab === "answersheets" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Users Answersheets</h2>
                      <p className="text-muted-foreground text-sm mt-1">View and evaluate user answer sheets</p>
                    </div>
                    <Button onClick={fetchAnswerSheets} variant="outline">
                      Refresh
                    </Button>
                  </div>

                  {loadingAnswerSheets ? (
                    <div className="text-center py-12">
                      <Loader2 className="mx-auto animate-spin text-muted-foreground mb-4" size={48} />
                      <p className="text-muted-foreground">Loading answer sheets...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {answerSheets.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No answer sheets submitted yet</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Paper</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Submitted</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Marks</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {answerSheets.map((answer: any) => (
                              <TableRow key={answer._id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{answer.userId?.name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{answer.userId?.email || ''}</p>
                                    {answer.userId?.phone && (
                                      <p className="text-xs text-muted-foreground">{answer.userId.phone}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{answer.paperId?.fileName || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {answer.paperId?.testSeriesId?.title || 'N/A'}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                    {answer.paperId?.subject || 'N/A'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {answer.submissionDate
                                    ? new Date(answer.submissionDate).toLocaleDateString()
                                    : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {answer.isEvaluated ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                      Evaluated
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm">
                                      Pending
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {answer.isEvaluated ? (
                                    <div>
                                      <p className="font-medium">{answer.marksObtained}/{answer.maxMarks}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {answer.percentage.toFixed(1)}%
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {answer.answerSheetUrl && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(answer.answerSheetUrl, '_blank')}
                                      >
                                        <Eye size={14} className="mr-1" />
                                        View
                                      </Button>
                                    )}
                                    {!answer.isEvaluated && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleEvaluateClick(answer)}
                                      >
                                        <Upload size={14} className="mr-1" />
                                        Evaluate
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Evaluate Answer Sheet Dialog */}
      <Dialog open={evaluateDialogOpen} onOpenChange={setEvaluateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evaluate Answer Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedAnswer && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <p className="text-sm font-medium">User: {selectedAnswer.userId?.name}</p>
                <p className="text-sm text-muted-foreground">Paper: {selectedAnswer.paperId?.fileName}</p>
                <p className="text-sm text-muted-foreground">Subject: {selectedAnswer.paperId?.subject}</p>
              </div>
            )}
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
                placeholder="100"
              />
            </div>
            <div>
              <Label>Evaluator Comments</Label>
              <Textarea
                value={evaluationData.evaluatorComments}
                onChange={(e) => setEvaluationData({ ...evaluationData, evaluatorComments: e.target.value })}
                className="mt-2"
                rows={3}
                placeholder="Enter feedback/comments"
              />
            </div>
            <div>
              <Label>Upload Evaluated Sheet (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setEvaluatedFile(file);
                }}
                className="mt-2"
              />
              {evaluatedFile && (
                <p className="text-sm text-muted-foreground mt-2">Selected: {evaluatedFile.name}</p>
              )}
            </div>
            <div className="flex gap-4 mt-6">
              <Button variant="secondary" onClick={() => setEvaluateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="btn-primary"
                onClick={handleUploadEvaluation}
                disabled={!evaluatedFile || !evaluationData.marksObtained || uploadingEvaluation}
              >
                {uploadingEvaluation ? 'Uploading...' : 'Upload Evaluated Sheet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Chapter Dialog */}
      <Dialog open={editChapterDialogOpen} onOpenChange={setEditChapterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Chapter Title</Label>
              <Input
                value={editChapterTitle}
                onChange={(e) => setEditChapterTitle(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editChapterDescription}
                onChange={(e) => setEditChapterDescription(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex gap-4 mt-6">
              <Button variant="secondary" onClick={() => setEditChapterDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="btn-primary" onClick={() => {
                handleUpdateChapter();
                setEditChapterDialogOpen(false);
              }}>
                Update Chapter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Item Title</Label>
              <Input
                value={editItemTitle}
                onChange={(e) => setEditItemTitle(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full mt-2 p-2 border rounded"
                value={editItemType}
                onChange={(e) => setEditItemType(e.target.value)}
              >
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={editItemUrl}
                onChange={(e) => setEditItemUrl(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Input
                value={editItemDuration}
                onChange={(e) => setEditItemDuration(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* File Upload Section */}
            <div>
              <Label>Replace File (Optional)</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Upload a new file to replace the current one
              </p>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editItemFile ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {editItemType === 'video' ? (
                            <Video size={20} className="text-blue-500" />
                          ) : (
                            <File size={20} className="text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{editItemFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(editItemFile.size / (1024 * 1024)).toFixed(2)} MB • {editItemType.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No new file selected</p>
                        <p className="text-xs text-muted-foreground mt-1">Current file will be kept</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept={editItemType === 'video' ? 'video/*' : 'application/pdf'}
                      className="hidden"
                      id="edit-item-file"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setEditItemFile(f);
                      }}
                    />
                    <label
                      htmlFor="edit-item-file"
                      className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm cursor-pointer hover:bg-primary/90"
                    >
                      {editItemFile ? 'Change File' : 'Choose New File'}
                    </label>
                    {editItemFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditItemFile(null)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button variant="secondary" onClick={() => setEditItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="btn-primary" onClick={() => {
                handleUpdateItem();
                setEditItemDialogOpen(false);
              }}>
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </Layout>
  );
};

export default SubAdminDashboard;
