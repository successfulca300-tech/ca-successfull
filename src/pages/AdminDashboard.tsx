import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { dashboardAPI, offersAPI, categoriesAPI, coursesAPI, resourcesAPI, publishRequestAPI, usersAPI, testimonialsAPI, settingsAPI } from "@/lib/api";
import { toast } from "sonner";
import { LayoutDashboard, Megaphone, FolderPlus, BookOpen, Users, FileCheck, MessageSquare, Settings, LogOut, Plus, Trash2, Edit, Eye, Check, X, File, Video, CheckCircle, XCircle, AlertCircle, Send, Upload, FileText, IndianRupee, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const validatePhone = (phone: string) => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[+\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  };
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [publishRequests, setPublishRequests] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // dialogs / forms
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [newOffer, setNewOffer] = useState({ title: "", code: "", discountType: "percentage", discountValue: 0, startDate: "", endDate: "" });
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user", phone: "" });
  const [testimonialDialogOpen, setTestimonialDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [newTestimonial, setNewTestimonial] = useState({ userName: "", courseTitle: "", rating: 5, comment: "", featured: false });
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState<any>({
    title: "",
    description: "",
    category: "",
    price: 0,
    duration: 0,
    type: 'video',
    file: null,
    thumbnail: null,
    tags: [] as string[],
    isPublic: true,
  });
  const [editingResource, setEditingResource] = useState<any>(null);
  const [showUploadInCourses, setShowUploadInCourses] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [viewResourceDialogOpen, setViewResourceDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "offers", label: "Manage Offers", icon: Megaphone },
    { id: "categories", label: "Manage Categories", icon: FolderPlus },
    { id: "courses", label: "Manage Resources", icon: BookOpen },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "user-list", label: "User Status", icon: Users },
    { id: "publish-requests", label: "Publish Requests", icon: FileCheck },
    { id: "testimonials", label: "Testimonials", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);

      const [statsRes, pendingReqsRes, offersRes, categoriesRes, coursesRes, usersRes, tRes] = await Promise.all([
        dashboardAPI.getStats().catch(err => {
          console.error('Stats error:', err);
          return { stats: {} };
        }),
        dashboardAPI.getPendingPublishRequests().catch(err => {
          console.error('Publish requests error:', err);
          return { requests: [] };
        }),
        offersAPI.getAllAdmin().catch(err => {
          console.error('Offers error:', err);
          return { offers: [] };
        }),
        categoriesAPI.getAll().catch(err => {
          console.error('Categories error:', err);
          return { categories: [] };
        }),
        resourcesAPI.getAll({ limit: 200 }).catch(err => {
          console.error('Resources error:', err);
          return { resources: [] };
        }),
        usersAPI.getAll({ limit: 200 }).catch(err => {
          console.error('Users error:', err);
          return { users: [] };
        }),
        testimonialsAPI.getAll({ limit: 200 }).catch(err => {
          console.error('Testimonials error:', err);
          return { testimonials: [] };
        }),
      ]);

      // Set actual stats from API
      const actualStats = statsRes?.stats || {};
      setStats({
        totalUsers: actualStats.totalUsers || 0,
        totalResources: actualStats.totalResources || 0,
        activeOffers: actualStats.activeOffers || 0,
        pendingPublishRequests: actualStats.pendingPublishRequests || 0,
        totalEnrolledUsers: actualStats.totalEnrolledUsers || 0,
        totalRevenue: actualStats.totalRevenue || 0,
      });

      const reqs = pendingReqsRes?.requests || [];
      console.log('Publish requests from API:', reqs);
      setPublishRequests(reqs);
      setOffers(offersRes?.offers || []);
      setCategories(categoriesRes?.categories || []);
      setResources(coursesRes?.resources || []);
      setUsers(usersRes?.users || []);
      // testimonials API returns paginated response: { testimonials, page, pages, total }
      const testArray = tRes?.testimonials ? tRes.testimonials : (Array.isArray(tRes) ? tRes : []);
      setTestimonials(testArray);
    } catch (err: any) {
      console.error("Admin fetch error", err);
      toast.error(err?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await settingsAPI.get();
      setSettings(response.settings || {});
    } catch (err: any) {
      console.error('Settings fetch error:', err);
      toast.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") {
      fetchSettings();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out");
    navigate("/");
  };

  const toggleOfferStatus = async (id: string) => {
    try {
      const o = offers.find((x) => x._id === id || x.id === id);
      const current = o?.isActive ?? false;
      await offersAPI.update(id, { isActive: !current });
      toast.success("Offer updated");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update offer");
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      await publishRequestAPI.moderate(id, { action: "approved" });
      toast.success("Approved");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve");
    }
  };

  const handleRejectRequest = async (id: string) => {
    const reason = window.prompt("Reason for rejection (optional):") || "";
    try {
      await publishRequestAPI.moderate(id, { action: "rejected", rejectionReason: reason });
      toast.success("Rejected");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject");
    }
  };

  const handleDeletePublishRequest = async (id: string) => {
    if (!confirm("Delete request?")) return;
    try {
      await publishRequestAPI.delete(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleEditTestimonial = (t: any) => {
    setEditingTestimonial(t);
    setNewTestimonial({ userName: t.userName || t.name || "", courseTitle: t.courseTitle || t.exam || "", rating: t.rating || 5, comment: t.comment || "", featured: t.featured || t.isFeatured || false });
    setTestimonialDialogOpen(true);
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm("Delete testimonial?")) return;
    try {
      await testimonialsAPI.delete(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleToggleFeatured = async (testimonial: any) => {
    try {
      const currentFeatured = !!(testimonial.featured || testimonial.isFeatured);
      await testimonialsAPI.update(testimonial._id || testimonial.id, {
        rating: testimonial.rating,
        comment: testimonial.comment,
        userName: testimonial.userName,
        courseTitle: testimonial.courseTitle,
        featured: !currentFeatured
      });
      toast.success(`Testimonial ${!currentFeatured ? 'featured' : 'unfeatured'}`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update featured status");
    }
  };

  const handleSaveTestimonial = async () => {
    try {
      if (!newTestimonial.comment || !newTestimonial.rating) {
        toast.error("Comment and rating are required");
        return;
      }
      if (editingTestimonial) {
        await testimonialsAPI.update(editingTestimonial._id || editingTestimonial.id, { rating: newTestimonial.rating, comment: newTestimonial.comment, userName: newTestimonial.userName, courseTitle: newTestimonial.courseTitle });
        toast.success("Updated");
      } else {
        await testimonialsAPI.create({ rating: newTestimonial.rating, comment: newTestimonial.comment, courseTitle: newTestimonial.courseTitle, userName: newTestimonial.userName });
        toast.success("Created");
      }
      setTestimonialDialogOpen(false);
      setEditingTestimonial(null);
      setNewTestimonial({ userName: "", courseTitle: "", rating: 5, comment: "", featured: false });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    }
  };

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setNewUser({ name: u.name || "", email: u.email || "", password: "", role: u.role || "user", phone: u.phone || "" });
    setUserDialogOpen(true);
  };

  const handleCreateUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password) {
        toast.error("Name, email, and password are required");
        return;
      }

      if (!validatePhone(newUser.phone)) {
        toast.error("Please enter a valid phone number");
        return;
      }

      await usersAPI.create(newUser);

      toast.success("User created successfully");
      setUserDialogOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "user", phone: "" });
      fetchData();
    } catch (err: any) {
      console.error("Create user error:", err);
      toast.error(err.message || "Failed to create user");
    }
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return;
      await usersAPI.update(editingUser._id || editingUser.id, {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
      });
      toast.success("User updated");
      setUserDialogOpen(false);
      setEditingUser(null);
      setNewUser({ name: "", email: "", password: "", role: "user", phone: "" });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Update user failed");
    }
  };

  const handleAddCategory = async () => {
    try {
      if (!newCategory.name) {
        toast.error("Enter name");
        return;
      }
      if (editingCategory) {
        await categoriesAPI.update(editingCategory._id || editingCategory.id, { name: newCategory.name, description: newCategory.description });
        toast.success("Category updated");
        setEditingCategory(null);
      } else {
        await categoriesAPI.create(newCategory);
        toast.success("Category added");
      }
      setCategoryDialogOpen(false);
      setNewCategory({ name: "", description: "" });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Add failed");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete category?")) return;
    try {
      await categoriesAPI.delete(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleAddOffer = async () => {
    try {
      if (!newOffer.title || !newOffer.discountValue || !newOffer.startDate || !newOffer.endDate) {
        toast.error("Fill all required fields");
        return;
      }
      const offerPayload = {
        ...newOffer,
        discountType: newOffer.discountType as 'percentage' | 'fixed',
      };
      if (editingOffer) {
        await offersAPI.update(editingOffer._id || editingOffer.id, offerPayload);
        toast.success("Offer updated");
      } else {
        await offersAPI.create(offerPayload);
        toast.success("Offer created");
      }
      setOfferDialogOpen(false);
      setEditingOffer(null);
      setNewOffer({ title: "", code: "", discountType: "percentage", discountValue: 0, startDate: "", endDate: "" });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save offer");
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Delete offer?")) return;
    try {
      await offersAPI.delete(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleAddResource = async () => {
    try {
      if (!newResource.title) {
        toast.error("Enter resource title");
        return;
      }

      const payload: any = {
        title: newResource.title,
        description: newResource.description,
        category: newResource.category,
        type: newResource.type,
        price: newResource.price,
        duration: newResource.duration,
        tags: newResource.tags,
        isPublic: newResource.isPublic,
      };

      if (editingResource) {
        // Update existing resource (no file re-upload here)
        await resourcesAPI.update(editingResource._id || editingResource.id, payload);
        toast.success("Resource updated");
        setEditingResource(null);
      } else {
        // Create new resource with files
        setUploading(true);
        try {
          await resourcesAPI.createWithFiles({
            ...payload,
            file: newResource.file || undefined,
            thumbnail: newResource.thumbnail || undefined,
          });
          toast.success("Resource added");
        } finally {
          setUploading(false);
        }
      }

      setActiveTab('courses');
      setShowUploadInCourses(false);
      setNewResource({ title: "", description: "", category: "", price: 0, duration: 0, type: 'pdf', file: null, thumbnail: null, tags: [], isPublic: true });
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Add failed");
    }
  };

  const handleFileSelect = (e: any) => {
    const f = e.target.files?.[0] || null;
    setNewResource({ ...newResource, file: f });
  };

  const handleThumbnailSelect = (e: any) => {
    const f = e.target.files?.[0] || null;
    setNewResource({ ...newResource, thumbnail: f });
    if (f) {
      try { setThumbnailPreview(URL.createObjectURL(f)); } catch (e) { setThumbnailPreview(null); }
    } else {
      setThumbnailPreview(null);
    }
  };

  const handleRemoveThumbnail = () => {
    setNewResource({ ...newResource, thumbnail: null });
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Collect text settings
      const siteNameInput = document.querySelector('input[placeholder="CA Successful"]') as HTMLInputElement;
      const contactEmailInput = document.querySelector('input[type="email"][placeholder="SuccessfulCa300@gmail.com"]') as HTMLInputElement;
      const contactPhoneInput = document.querySelector('input[placeholder="+91 91096 47073"]') as HTMLInputElement;
      const addressInput = document.querySelector('input[placeholder="123 Education Street, Knowledge City, India - 110001"]') as HTMLInputElement;

      const updateData: any = {};
      if (siteNameInput?.value) updateData.siteName = siteNameInput.value;
      if (contactEmailInput?.value) updateData.contactEmail = contactEmailInput.value;
      if (contactPhoneInput?.value) updateData.contactPhone = contactPhoneInput.value;
      if (addressInput?.value) updateData.address = addressInput.value;

      // Add image if selected
      if (selectedImage) {
        updateData.image = selectedImage;
      }

      await settingsAPI.update(updateData);
      toast.success('Settings saved successfully');
      fetchSettings(); // Refresh settings
    } catch (err: any) {
      console.error('Settings save error:', err);
      toast.error(err?.message || 'Failed to save settings');
    }
  };

  const handleEditResource = (r: any) => {
    setEditingResource(r);
    setNewResource({
      title: r.title || "",
      description: r.description || "",
      category: r.category?._id || r.category || "",
      price: r.price || 0,
      duration: r.duration || 0,
      type: r.type || 'video',
      file: null,
      thumbnail: null,
      tags: r.tags || [],
      isPublic: r.isPublic ?? true,
    });
    setThumbnailPreview(r.thumbnail && typeof r.thumbnail === 'string' ? r.thumbnail : null);
    setResourceDialogOpen(true);
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete resource?")) return;
    try {
      await resourcesAPI.delete(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete user?")) return;
    try {
      await usersAPI.delete(id);
      toast.success("Deleted");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleExportUsers = () => {
    try {
      // Prepare data for export
      const exportData = users.map((user) => ({
        Name: user.name || '',
        Email: user.email || '',
        'Phone Number': user.phone || '',
        'Enrollment Status': user.isEnrolled ? 'Enrolled' : 'Not Enrolled in any course',
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');

      // Generate filename
      const filename = `User Enrollment Status.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);

      toast.success("Excel file downloaded successfully");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export users data");
    }
  };

  const getStatusClass = (status: string) => {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'approved':
      case 'published':
        return 'bg-card/90 backdrop-blur-sm text-foreground';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      case 'pending':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'draft':
        return 'bg-secondary text-foreground';
      default:
        return 'bg-secondary text-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'pdf':
      case 'document':
        return <FileText size={20} className="text-red-500" />;
      case 'video':
        return <Video size={20} className="text-blue" />;
      case 'book':
        return <BookOpen size={20} className="text-green" />;
      default:
        return <File size={20} className="text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="bg-gradient-to-r from-primary to-navy py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">
            Welcome, {user?.name || 'Admin'}
          </h1>
          <p className="text-primary-foreground/80 mt-2">Manage your platform content and users</p>
        </div>
      </div>

      <section className="py-8 bg-background min-h-screen">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden sticky top-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 text-sm ${
                      activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-destructive/10 text-destructive text-sm transition-colors">
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
                  <div className="space-y-4">
                    {/* First Row - Original 4 Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Total Users", value: (stats?.totalUsers ?? 0).toLocaleString?.() ?? 0, color: "from-blue to-blue-light", icon: Users },
                        { label: "Total Resources", value: (stats?.totalResources ?? 0).toLocaleString?.() ?? 0, color: "from-green to-success", icon: BookOpen },
                        { label: "Active Offers", value: String(stats?.activeOffers ?? 0), color: "from-accent to-slate-dark", icon: Megaphone },
                        { label: "Pending Requests", value: String(stats?.pendingPublishRequests ?? stats?.pendingRequests ?? 0), color: "from-destructive to-destructive/70", icon: FileCheck },
                      ].map((stat, i) => (
                        <div key={i} className={`bg-gradient-to-br ${stat.color} p-6 rounded-xl shadow-lg text-white`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white/80 text-sm">{stat.label}</p>
                              <p className="text-3xl font-bold mt-2">{stat.value}</p>
                            </div>
                            <stat.icon size={40} className="text-white/30" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Second Row - New 2 Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Enrolled Users", value: (stats?.totalEnrolledUsers ?? 0).toLocaleString?.() ?? 0, color: "from-purple-500 to-pink-500", icon: Users },
                        { label: "Total Revenue", value: `₨ ${(stats?.totalRevenue ?? 0).toLocaleString?.() ?? 0}`, color: "from-emerald-500 to-teal-500", icon: IndianRupee },
                      ].map((stat, i) => (
                        <div key={i} className={`bg-gradient-to-br ${stat.color} p-6 rounded-xl shadow-lg text-white`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white/80 text-sm">{stat.label}</p>
                              <p className="text-3xl font-bold mt-2">{stat.value}</p>
                            </div>
                            <stat.icon size={40} className="text-white/30" />
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
              </div>
              )}
              
              {/* Offers */}
              {activeTab === "offers" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Manage Offers</h3>
                    <Button onClick={() => { setEditingOffer(null); setOfferDialogOpen(true); }}><Plus size={16} /> Add Offer</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Valid Till</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((offer) => (
                        <TableRow key={offer._id || offer.id}>
                          <TableCell>{offer.title}</TableCell>
                          <TableCell>{offer.code || 'N/A'}</TableCell>
                          <TableCell>{offer.discountValue}%</TableCell>
                          <TableCell>{offer.endDate}</TableCell>
                          <TableCell>
                            <Switch checked={!!offer.isActive} onCheckedChange={() => toggleOfferStatus(offer._id || offer.id)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => { setNewOffer({ title: offer.title, code: offer.code || "", discountType: offer.discountType || "percentage", discountValue: offer.discountValue || 0, startDate: offer.startDate || "", endDate: offer.endDate || "" }); setEditingOffer(offer); setOfferDialogOpen(true); }}><Edit size={16} /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteOffer(offer._id || offer.id)}><Trash2 size={16} /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Categories */}
              {activeTab === "categories" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Manage Categories</h3>
                    <Button onClick={() => { setEditingCategory(null); setNewCategory({ name: "", description: "" }); setCategoryDialogOpen(true); }}><Plus size={16} /> Add Category</Button>
                  </div>
                  <div className="space-y-3">
                    {categories.map((c) => (
                      <div key={c._id || c.id} className="flex items-center justify-between p-3 bg-muted rounded">
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-muted-foreground">{c.description || 'No description'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(c); setNewCategory({ name: c.name || '', description: c.description || '' }); setCategoryDialogOpen(true); }}><Edit size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(c._id || c.id)}><Trash2 size={14} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manage Resources */}
              {activeTab === "courses" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Manage Resources</h2>
                      <p className="text-muted-foreground text-sm mt-1">Manage all uploaded resources</p>
                    </div>
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium">Filter by Resource Type:</Label>
      <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
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
  </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      // Debug: Log resource types to console
                      console.log('Available resource types:', resources.map(r => r.type));
                      console.log('Selected filter:', resourceTypeFilter);

                      const filtered = resources.filter((resource) =>
                        resource.status === 'published' &&
                        (resourceTypeFilter === "all" ||
                        (resource.resourceCategory || resource.type)?.toLowerCase().trim() === resourceTypeFilter.toLowerCase().trim())
                      );

                      console.log('Filtered resources count:', filtered.length);
                      return filtered;
                    })().map((resource) => (
                      <div key={resource._id || resource.id} className="bg-secondary/30 rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
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
                            {resource.price ? `₨ ${Number(resource.price).toLocaleString()}` : "Free"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {resource.category?.name || resource.category}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : ''}
                          </p>
                          <div className="flex gap-2 mt-4 flex-wrap">
                            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-xs" onClick={() => { setSelectedResource(resource); setViewResourceDialogOpen(true); }}>
                              <Eye size={14} className="mr-1" /> View
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 px-2" onClick={() => handleDeleteResource(resource._id || resource.id)} title="Delete resource">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {resources.length === 0 && (
                      <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-muted-foreground">No resources found</div>
                    )}
                  </div>
                </div>
              )}

              {/* Manage Users */}
              {activeTab === "users" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Manage Users</h2>
                    <Button onClick={() => { setEditingUser(null); setNewUser({ name: "", email: "", password: "", role: "user", phone: "" }); setUserDialogOpen(true); }}><Plus size={16} /> Add User</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ph.No</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u._id || u.id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.phone || 'N/A'}</TableCell>
                          <TableCell>{u.role}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)}><Edit size={16} /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(u._id || u.id)}><Trash2 size={16} /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* User Status */}
              {activeTab === "user-list" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">User Status</h2>
                    <Button onClick={handleExportUsers} variant="outline" className="flex items-center gap-2">
                      <Download size={16} />
                      Export to Excel
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Enrollment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(u => u.role !== 'admin' && u.role !== 'subadmin').map((u) => (
                        <TableRow key={u._id || u.id}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              u.isEnrolled ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                              {u.isEnrolled ? 'Enrolled' : 'Not Enrolled in any course'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Publish Requests */}
              {activeTab === "publish-requests" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <h2 className="text-xl font-semibold mb-4">Publish Requests</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {publishRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No publish requests found</TableCell>
                        </TableRow>
                      ) : (
                        publishRequests.map((req) => {
                          console.log('Request object:', req); // Debug log
                          return (
                            <TableRow key={req.id || req._id}>
                              <TableCell className="font-medium">{req.contentTitle || 'Unknown'}</TableCell>
                              <TableCell className="text-sm">{req.contentType || 'Resource'}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{req.requestedBy?.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{req.requestedBy?.email || ''}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${
                                  req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {req.status || 'unknown'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {req.status === 'pending' ? (
                                  <div className="flex gap-2">
                                    <Button variant="default" size="sm" className="btn-primary flex items-center gap-1 shadow-md" onClick={() => handleApproveRequest(req.id || req._id)}>
                                      <Check size={16} /> Approve
                                    </Button>
                                    <Button variant="default" size="sm" className="bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-1 shadow-md" onClick={() => handleRejectRequest(req.id || req._id)}>
                                      <X size={16} /> Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-1" onClick={() => handleDeletePublishRequest(req.id || req._id)}>
                                    <Trash2 size={14} /> Delete
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Testimonials */}
              {activeTab === "testimonials" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Testimonials</h2>
                    <div className="flex gap-2">
                      <Button onClick={() => setTestimonialDialogOpen(true)}><Plus size={16} /> Add</Button>
                      <Button variant="outline" onClick={() => fetchData()}>Refresh</Button>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testimonials.map((t) => (
                        <TableRow key={t._id || t.id}>
                          <TableCell>{t.userName || t.name}</TableCell>
                          <TableCell>{t.courseTitle || t.exam}</TableCell>
                          <TableCell>⭐ {t.rating || 5}</TableCell>
                          <TableCell><Switch checked={!!(t.featured || t.isFeatured)} onCheckedChange={() => handleToggleFeatured(t)} /></TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditTestimonial(t)}><Edit size={16} /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteTestimonial(t._id || t.id)}><Trash2 size={16} /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Settings */}
              {activeTab === "settings" && (
                <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
                  <h2 className="text-xl font-semibold mb-6">Settings</h2>
                  {settingsLoading ? (
                    <div className="text-center py-8">Loading settings...</div>
                  ) : (
                    <div className="space-y-8 max-w-2xl">
                      {/* Photo Upload Section */}
                      <div>
                        <Label className="text-base font-medium">Site Hero Image</Label>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                          Upload a hero image for your site's homepage. This will be displayed prominently.
                        </p>

                        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors relative" onClick={() => imageInputRef.current?.click()}>
                          <input
                            ref={imageInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleImageSelect}
                            accept="image/*"
                          />
                          {imagePreview || settings.heroImage ? (
                            <div className="relative">
                              <img
                                src={imagePreview || settings.heroImage}
                                alt="Hero image preview"
                                className="w-full h-64 object-contain"
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="h-64 flex flex-col items-center justify-center">
                              <Upload size={48} className="text-muted-foreground mb-3" />
                              <p className="text-sm text-muted-foreground">Click to upload hero image</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG (Recommended: 1200x600)</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Text Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Site Name</Label>
                          <Input
                            placeholder="CA Successful"
                            defaultValue={settings.siteName || "CA Successful"}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Contact Email</Label>
                          <Input
                            type="email"
                            placeholder="SuccessfulCa300@gmail.com"
                            defaultValue={settings.contactEmail || "SuccessfulCa300@gmail.com"}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Contact Phone</Label>
                          <Input
                            placeholder="+91 91096 47073"
                            defaultValue={settings.contactPhone || "+91 91096 47073"}
                            className="mt-2"
                          /> 
                        </div>
                        <div>
                          <Label>Address</Label>
                          <Input
                            placeholder="123 Education Street, Knowledge City, India - 110001"
                            defaultValue={settings.address || "123 Education Street, Knowledge City, India - 110001"}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button onClick={handleSaveSettings} className="btn-primary">
                          Save Settings
                        </Button>
                        <Button variant="outline" onClick={() => fetchSettings()}>
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* dialogs moved to bottom for clarity */}
      {/* Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Edit Offer" : "Add New Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Offer Title</Label>
              <Input 
                placeholder="e.g., New Year Sale" 
                value={newOffer.title} 
                onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                className="mt-2" 
              />
            </div>
            <div>
              <Label>Coupon Code</Label>
              <Input 
                placeholder="e.g., NY2025" 
                value={newOffer.code}
                onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value })}
                className="mt-2" 
              />
            </div>
            <div>
              <Label>Discount Type</Label>
              <select 
                value={newOffer.discountType}
                onChange={(e) => setNewOffer({ ...newOffer, discountType: e.target.value })}
                className="mt-2 block w-full p-2 border rounded"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <Label>Discount Value</Label>
              <Input 
                type="number" 
                placeholder="25" 
                value={newOffer.discountValue}
                onChange={(e) => setNewOffer({ ...newOffer, discountValue: Number(e.target.value) })}
                className="mt-2" 
              />
            </div>
            <div>
              <Label>Valid From <span className="text-xs text-muted-foreground">(offer shows from this date)</span></Label>
              <Input 
                type="date"
                value={newOffer.startDate}
                onChange={(e) => setNewOffer({ ...newOffer, startDate: e.target.value })}
                className="mt-2" 
              />
            </div>
            <div>
              <Label>Valid Till <span className="text-xs text-muted-foreground">(offer shows until this date)</span></Label>
              <Input 
                type="date"
                value={newOffer.endDate}
                onChange={(e) => setNewOffer({ ...newOffer, endDate: e.target.value })}
                className="mt-2" 
              />
            </div>
            <div className="flex gap-4 mt-6">
              <Button variant="secondary" onClick={() => { setOfferDialogOpen(false); setEditingOffer(null); setNewOffer({ title: "", code: "", discountType: "percentage", discountValue: 0, startDate: "", endDate: "" }); }}>Cancel</Button>
              <Button className="btn-primary" onClick={handleAddOffer}>
                {editingOffer ? "Update Offer" : "Create Offer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Category Name</Label>
              <Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="e.g., CA Final" className="mt-2" />
            </div>
            <div>
              <Label>Category Description</Label>
              <Textarea value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="Short description" className="mt-2" />
            </div>
            <div className="flex gap-4 justify-end mt-4">
              <Button variant="secondary" onClick={() => { setCategoryDialogOpen(false); setEditingCategory(null); }}>Cancel</Button>
              <Button onClick={handleAddCategory} className="btn-primary">{editingCategory ? 'Update Category' : 'Add Category'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      <Dialog open={testimonialDialogOpen} onOpenChange={setTestimonialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Student Name</Label>
              <Input value={newTestimonial.userName} onChange={(e) => setNewTestimonial({ ...newTestimonial, userName: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label>Course</Label>
              <select
                value={newTestimonial.courseTitle}
                onChange={(e) => setNewTestimonial({ ...newTestimonial, courseTitle: e.target.value })}
                className="mt-2 block w-full p-2 border rounded"
              >
                <option value="">Select Course</option>
                {resources.map((resource) => (
                  <option key={resource._id || resource.id} value={resource.title}>
                    {resource.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Rating</Label>
              <Input type="number" value={newTestimonial.rating} onChange={(e) => setNewTestimonial({ ...newTestimonial, rating: Number(e.target.value) })} className="mt-2" />
            </div>
            <div>
              <Label>Comment</Label>
              <Textarea value={newTestimonial.comment} onChange={(e) => setNewTestimonial({ ...newTestimonial, comment: e.target.value })} className="mt-2" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={newTestimonial.featured} onCheckedChange={(v) => setNewTestimonial({ ...newTestimonial, featured: !!v })} />
              <span className="text-sm">Feature this testimonial</span>
            </div>
            <div className="flex gap-4 justify-end mt-4">
              <Button variant="secondary" onClick={() => { setTestimonialDialogOpen(false); setEditingTestimonial(null); }}>Cancel</Button>
              <Button onClick={handleSaveTestimonial} className="btn-primary">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User / Sub-Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Name</Label>
              <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="mt-2" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="mt-2" />
            </div>
            {!editingUser && (
              <div>
                <Label>Password</Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="mt-2" />
              </div>
            )}
            <div>
              <Label>Role</Label>
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="mt-2 block w-full p-2 border rounded">
                <option value="user">User</option>
                <option value="subadmin">Sub-Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-4 justify-end mt-4">
              <Button variant="secondary" onClick={() => { setUserDialogOpen(false); setEditingUser(null); setNewUser({ name: "", email: "", password: "", role: "user", phone: "" }); }}>Cancel</Button>
              <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="btn-primary">
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resource Upload Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Upload New Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {uploading && (
              <div className="p-3 bg-blue/10 border border-blue/20 rounded">Uploading resource...</div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <Label>Resource Title *</Label>
                  <Input value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} placeholder="e.g., FR Chapter 1 Notes" className="mt-2" />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={newResource.description} onChange={(e) => setNewResource({ ...newResource, description: e.target.value })} placeholder="Brief description..." rows={4} className="mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Resource Type *</Label>
                    <select value={newResource.type} onChange={(e) => setNewResource({ ...newResource, type: e.target.value })} className="mt-2 block w-full p-2 border rounded">
                      <option value="video">Course/Video</option>
                      <option value="test">Test Series</option>
                      <option value="book">Books</option>
                      <option value="pdf">Notes/PDF Document</option>
                    </select>
                  </div>

                  <div>
                    <Label>Category *</Label>
                    <select value={newResource.category} onChange={(e) => setNewResource({ ...newResource, category: e.target.value })} className="mt-2 block w-full p-2 border rounded">
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Price (PKR)</Label>
                  <Input type="number" value={newResource.price} onChange={(e) => setNewResource({ ...newResource, price: Number(e.target.value) })} placeholder="0" className="mt-2" />
                </div>

                <div>
                  <Label>Upload File</Label>
                  <div className="mt-2 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.mp4,.mov,.doc,.docx,.ppt,.pptx" />
                    {newResource.file ? (
                      <div className="flex items-center justify-center gap-2">
                        <File size={18} />
                        <span className="font-medium">{newResource.file.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag and drop (PDF/Video)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Cover Image / Thumbnail</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">This image will be shown as the resource thumbnail</p>
                <div className="border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors relative" onClick={() => thumbnailInputRef.current?.click()}>
                  <input ref={thumbnailInputRef} type="file" className="hidden" onChange={handleThumbnailSelect} accept="image/*" />
                  {thumbnailPreview ? (
                    <div className="relative">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-64 object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveThumbnail(); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center"> <X size={16} /></button>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center">
                      <File size={48} className="text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">Click to upload thumbnail</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG (Recommended: 400x300)</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Preview Card</h4>
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      {thumbnailPreview ? <img src={thumbnailPreview} alt="thumb" className="h-full object-cover" /> : <div className="text-muted-foreground">Preview</div>}
                    </div>
                    <div className="p-3">
                      <div className="font-semibold truncate">{newResource.title || 'Resource title'}</div>
                      <div className="text-xs text-muted-foreground mt-1">{newResource.price ? `₨ ${newResource.price}` : 'Free'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-end mt-6">
                  <Button variant="secondary" onClick={() => { setResourceDialogOpen(false); setEditingResource(null); setNewResource({ title: "", description: "", category: "", price: 0, duration: 0, type: 'video', file: null, thumbnail: null, tags: [], isPublic: true }); }}>Cancel</Button>
                  <Button className="btn-primary" onClick={handleAddResource} disabled={uploading}>{editingResource ? 'Update Resource' : 'Upload Resource'}</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Resource Dialog */}
      <Dialog open={viewResourceDialogOpen} onOpenChange={setViewResourceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Resource Details</DialogTitle>
          </DialogHeader>
          {selectedResource && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedResource.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedResource.description}</p>
                </div>
                {selectedResource.thumbnail && (
                  <img
                    src={selectedResource.thumbnail.startsWith('/api/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${selectedResource.thumbnail}` : selectedResource.thumbnail}
                    alt={selectedResource.title}
                    className="w-20 h-20 object-cover rounded"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = '/placeholder.svg';
                    }}
                  />
                )}
              </div>

              {/* Content Preview Section */}
              {(selectedResource.fileUrl || selectedResource.file) && (
                <div className="border-t pt-6">
                  <Label className="text-base font-medium mb-4 block">Resource Content</Label>
                  <div className="bg-secondary/30 rounded-lg p-4">
                    {(() => {
                      const fileUrl = selectedResource.fileUrl || selectedResource.file;
                      const resourceType = selectedResource.resourceCategory || selectedResource.type;
                      const fileName = selectedResource.fileName || 'resource';

                      // For videos
                      if (resourceType === 'video' || fileName.toLowerCase().includes('.mp4') || fileName.toLowerCase().includes('.mov') || fileName.toLowerCase().includes('.avi')) {
                        return (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Video Preview:</p>
                            <video
                              controls
                              className="w-full max-h-96 rounded-lg"
                              preload="metadata"
                            >
                              <source src={fileUrl.startsWith('/api/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${fileUrl}` : fileUrl} type="video/mp4" />
                              <source src={fileUrl.startsWith('/api/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${fileUrl}` : fileUrl} type="video/quicktime" />
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        );
                      }

                      // For PDFs and documents
                      if (resourceType === 'notes' || fileName.toLowerCase().includes('.pdf') || fileName.toLowerCase().includes('.doc') || fileName.toLowerCase().includes('.docx') || fileName.toLowerCase().includes('.ppt') || fileName.toLowerCase().includes('.pptx')) {
                        const viewUrl = fileUrl.startsWith('/api/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${fileUrl}` : fileUrl;
                        return (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Document Preview:</p>
                            <iframe
                              src={viewUrl}
                              className="w-full h-96 border rounded-lg"
                              title="Document Preview"
                              onError={(e) => {
                                const iframe = e.currentTarget as HTMLIFrameElement;
                                iframe.style.display = 'none';
                                const container = iframe.parentElement;
                                if (container) {
                                  container.innerHTML = `
                                    <p class="text-sm text-muted-foreground">Preview not available. <a href="${viewUrl}" target="_blank" class="text-primary hover:underline">Click here to download</a></p>
                                  `;
                                }
                              }}
                            />
                          </div>
                        );
                      }

                      // For other files, show download link
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">File:</p>
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-muted-foreground" />
                            <span className="text-sm">{fileName}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = fileUrl.startsWith('/api/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${fileUrl}` : fileUrl;
                                link.target = '_blank';
                                link.download = fileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download size={14} className="mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm">{selectedResource.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm">{selectedResource.category?.name || selectedResource.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Price</Label>
                  <p className="text-sm">{selectedResource.price ? `₨ ${Number(selectedResource.price).toLocaleString()}` : "Free"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm capitalize">{selectedResource.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <p className="text-sm">{selectedResource.duration ? `${selectedResource.duration} minutes` : "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created At</Label>
                  <p className="text-sm">{selectedResource.createdAt ? new Date(selectedResource.createdAt).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
              {selectedResource.tags && selectedResource.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedResource.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedResource.createdBy && (
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p className="text-sm">{selectedResource.createdBy.name} ({selectedResource.createdBy.email})</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminDashboard;
