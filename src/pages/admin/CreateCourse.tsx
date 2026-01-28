import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { coursesAPI, resourcesAPI } from "@/lib/api";
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
import { toast } from "sonner";

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videoResources, setVideoResources] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    instructor: "",
    price: 0,
    duration: "",
    level: "beginner",
    content: "",
    videoUrl: "",
  });

  // Load video resources for selection
  useState(() => {
    const loadResources = async () => {
      try {
        const res = await resourcesAPI.getByUser({ type: "video", limit: 100 });
        setVideoResources(res.resources || []);
      } catch (err) {
        console.error("Failed to load video resources", err);
      }
    };
    loadResources();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await coursesAPI.create({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        instructor: formData.instructor,
        price: formData.price,
        duration: formData.duration,
        level: formData.level,
        content: formData.content,
        videoUrl: formData.videoUrl,
      });

      toast.success("Course created successfully!");
      navigate("/admin/courses");
    } catch (err: any) {
      console.error("Create course error", err);
      toast.error(err.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-primary-foreground">Create New Course</h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl border border-border space-y-6">
            <div>
              <Label>Course Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter course title"
                required
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Course description"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ca-foundation">CA Foundation</SelectItem>
                    <SelectItem value="ca-intermediate">CA Intermediate</SelectItem>
                    <SelectItem value="ca-final">CA Final</SelectItem>
                    <SelectItem value="cs-foundation">CS Foundation</SelectItem>
                    <SelectItem value="cs-executive">CS Executive</SelectItem>
                    <SelectItem value="cs-professional">CS Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Instructor</Label>
                <Input
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  placeholder="Instructor name"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label>Duration</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 30 days"
                />
              </div>

              <div>
                <Label>Level</Label>
                <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Course Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Detailed course content, syllabus, etc."
                rows={5}
              />
            </div>

            <div>
              <Label>Lecture Video</Label>
              <Select value={formData.videoUrl} onValueChange={(value) => setFormData({ ...formData, videoUrl: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a video resource (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No video</SelectItem>
                  {videoResources.map((resource) => (
                    <SelectItem key={resource._id} value={resource.url}>
                      {resource.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Select from uploaded video resources, or leave empty if no video yet.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate("/admin/courses")}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
};

export default CreateCourse;
