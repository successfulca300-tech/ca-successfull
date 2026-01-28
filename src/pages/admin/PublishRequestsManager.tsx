import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { publishRequestAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PublishRequestsManager = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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
    fetchRequests();
  }, [navigate]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await publishRequestAPI.getAll({ limit: 100 });
      setRequests(res.requests || []);
    } catch (err) {
      console.error("Error fetching publish requests:", err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id);
      await publishRequestAPI.moderate(id, { action: "approve" });
      setRequests(requests.filter(r => r._id !== id));
      toast.success("Request approved!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejection (optional):") || "";
    if (reason === null) return;
    
    try {
      setRejectingId(id);
      await publishRequestAPI.moderate(id, { action: "reject", rejectionReason: reason });
      setRequests(requests.filter(r => r._id !== id));
      toast.success("Request rejected!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reject");
    } finally {
      setRejectingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete request permanently?")) return;
    try {
      await publishRequestAPI.delete(id);
      setRequests(requests.filter(r => r._id !== id));
      toast.success("Request deleted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="bg-primary py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary-foreground">Publish Requests</h1>
        </div>
      </div>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 mb-4" />)}
            </>
          ) : requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-card border border-border">
                    <th className="p-3 text-left font-semibold">Requested By</th>
                    <th className="p-3 text-left font-semibold">Content Title</th>
                    <th className="p-3 text-left font-semibold">Content Type</th>
                    <th className="p-3 text-left font-semibold">Status</th>
                    <th className="p-3 text-left font-semibold">Submitted</th>
                    <th className="p-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id} className="border border-border hover:bg-card/50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{r.requestedBy?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{r.requestedBy?.email || ''}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{r.contentTitle || r.content?.title || 'Unknown'}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-sm capitalize text-muted-foreground">{r.contentType}</span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {r.status === 'pending' && (
                            <>
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleApprove(r._id)}
                                disabled={approvingId === r._id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check size={14} className="mr-1" />
                                {approvingId === r._id ? 'Approving...' : 'Approve'}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleReject(r._id)}
                                disabled={rejectingId === r._id}
                              >
                                <X size={14} className="mr-1" />
                                {rejectingId === r._id ? 'Rejecting...' : 'Reject'}
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(r._id)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">No requests found.</div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default PublishRequestsManager;
