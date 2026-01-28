import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { offersAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, Tag, Calendar } from "lucide-react";
import { toast } from "sonner";

const OffersManager = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Check admin access
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
    fetchOffers();
  }, [navigate]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await offersAPI.getAllAdmin();
      setOffers(res.offers || []);
    } catch (err) {
      console.error("Error fetching offers:", err);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await offersAPI.delete(id);
      setOffers(offers.filter((o) => o._id !== id));
      toast.success("Offer deleted successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete offer");
    }
  };

  const toggleOfferStatus = async (id: string) => {
    try {
      const offer = offers.find((o) => o._id === id);
      if (offer) {
        await offersAPI.toggleStatus(id, !offer.isActive);
        toast.success(`Offer ${!offer.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchOffers();
      }
    } catch (err: any) {
      console.error("Error toggling offer:", err);
      toast.error("Failed to update offer status");
    }
  };

  const filteredOffers = offers.filter((offer) =>
    offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (offer.code && offer.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary-foreground">Offers Manager</h1>
            <Button onClick={() => navigate("/admin/offers/create")} className="btn-primary">
              <Plus size={18} className="mr-2" /> New Offer
            </Button>
          </div>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Input
              placeholder="Search offers by title or coupon code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid gap-6">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </>
            ) : filteredOffers.length > 0 ? (
              filteredOffers.map((offer) => {
                const now = new Date();
                const startDate = new Date(offer.startDate);
                const endDate = new Date(offer.endDate);
                const isExpired = startDate > now || endDate < now;

                return (
                  <div key={offer._id} className="bg-card p-6 rounded-xl border border-border flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{offer.title}</h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          offer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isExpired && (
                          <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                            Expired
                          </span>
                        )}
                      </div>
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Tag size={14} /> {offer.code || 'N/A'}
                        </span>
                        <span>
                          {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`} OFF
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} /> {new Date(offer.endDate).toLocaleDateString()}
                        </span>
                        <span>Used: {offer.currentUsageCount || 0}/{offer.maxUsageCount || 'Unlimited'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs text-muted-foreground">Display</span>
                        <Switch 
                          checked={offer.isActive}
                          onCheckedChange={() => toggleOfferStatus(offer._id)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/admin/offers/edit/${offer._id}`)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(offer._id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-12">No offers found.</p>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default OffersManager;
