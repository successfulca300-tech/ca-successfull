import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { categoriesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const CategoriesManager = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      navigate("/");
      return;
    }
    fetchCategories();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoriesAPI.getAll();
      setCategories(res.categories || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return toast.error("Enter category name");
    try {
      const res = await categoriesAPI.create({ name });
      toast.success("Category created");
      setName("");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Create failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete category?")) return;
    try {
      await categoriesAPI.delete(id);
      toast.success("Category deleted");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary-foreground">Categories</h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex gap-4">
            <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button className="btn-primary" onClick={handleCreate}>Create</Button>
          </div>

          {loading ? (
            <>
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 mb-3" />)}
            </>
          ) : categories.length > 0 ? (
            <div className="grid gap-3">
              {categories.map((c) => (
                <div key={c._id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.description || ''}</p>
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(c._id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No categories found.</p>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default CategoriesManager;
