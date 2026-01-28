import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

interface Resource {
  _id: string;
  title: string;
  description: string;
  resourceCategory: 'video' | 'book' | 'test' | 'notes';
  price?: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'published' | 'rejected';
  createdAt: string;
  courseId?: any;
  bookId?: any;
  testSeriesId?: any;
  freeResourceId?: any;
}

interface DashboardStats {
  pending: number;
  published: number;
  rejected: number;
}

export default function ResourcesManager() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    published: 0,
    rejected: 0,
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ [key: string]: boolean }>({});
  const [editValues, setEditValues] = useState<{ [key: string]: { title?: string; description?: string } }>({});

  const fetchResources = async (status: string = 'pending') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/typed-resources/pending?status=${status}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch resources');

      const data = await response.json();
      setResources(data.resources || []);

      // Update stats
      const allResources = await fetch('/api/typed-resources/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(res => res.json());

      setStats({
        pending: allResources.resources?.filter((r: Resource) => r.status === 'pending').length || 0,
        published: allResources.resources?.filter((r: Resource) => r.status === 'published').length || 0,
        rejected: allResources.resources?.filter((r: Resource) => r.status === 'rejected').length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(activeTab);
  }, [activeTab]);

  const handleApprove = async (resourceId: string) => {
    setActionLoading(prev => ({ ...prev, [resourceId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/typed-resources/${resourceId}/approve`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to approve resource');

      setMessage('Resource approved successfully');
      fetchResources(activeTab);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  const handleReject = async (resourceId: string) => {
    if (!rejectReason[resourceId]?.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setActionLoading(prev => ({ ...prev, [resourceId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/typed-resources/${resourceId}/reject`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: rejectReason[resourceId] }),
        }
      );

      if (!response.ok) throw new Error('Failed to reject resource');

      setMessage('Resource rejected successfully');
      setRejectReason(prev => {
        const newReasons = { ...prev };
        delete newReasons[resourceId];
        return newReasons;
      });
      fetchResources(activeTab);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  const getResourceCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      video: 'Video Course',
      book: 'Book',
      test: 'Test/Quiz',
      notes: 'Notes/PDF',
    };
    return labels[category] || category;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const handleView = (resourceId: string) => {
    navigate(`/resource/${resourceId}`);
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    setActionLoading(prev => ({ ...prev, [resourceId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete resource');
      setMessage('Resource deleted');
      fetchResources(activeTab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  const startEdit = (resource: Resource) => {
    setEditing(prev => ({ ...prev, [resource._id]: true }));
    setEditValues(prev => ({ ...prev, [resource._id]: { title: resource.title, description: resource.description } }));
  };

  const cancelEdit = (resourceId: string) => {
    setEditing(prev => ({ ...prev, [resourceId]: false }));
  };

  const saveEdit = async (resourceId: string) => {
    setActionLoading(prev => ({ ...prev, [resourceId]: true }));
    try {
      const token = localStorage.getItem('token');
      const vals = editValues[resourceId] || {};
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: vals.title, description: vals.description }),
      });
      if (!res.ok) throw new Error('Failed to update resource');
      setMessage('Resource updated');
      setEditing(prev => ({ ...prev, [resourceId]: false }));
      fetchResources(activeTab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Resources</h1>
        <p className="text-gray-600">Approve or reject published resources</p>
      </div>

      {message && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Published Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-gray-600 mt-1">Active & published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejected Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-gray-600 mt-1">Rejected items</p>
          </CardContent>
        </Card>
      </div>

      {/* Resources Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-gray-600" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No {activeTab} resources found</p>
          </div>
        ) : (
          <TabsContent value={activeTab} className="space-y-4">
            {resources.map(resource => (
              <Card key={resource._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(resource.status)}
                        <CardTitle className="text-lg">{resource.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {getResourceCategoryLabel(resource.resourceCategory)}
                      </CardDescription>
                      <div className="text-xs text-gray-500 mt-2">
                        By: {resource.createdBy.name} ({resource.createdBy.email})
                      </div>
                    </div>
                      <div className="text-xs text-gray-500">
                        {new Date(resource.createdAt).toLocaleDateString()}
                      </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {editing[resource._id] ? (
                    <div>
                      <input className="w-full p-2 border rounded mb-2" value={editValues[resource._id]?.title || ''} onChange={(e) => setEditValues(prev => ({ ...prev, [resource._id]: { ...(prev[resource._id]||{}), title: e.target.value } }))} />
                      <textarea className="w-full p-2 border rounded" rows={3} value={editValues[resource._id]?.description || ''} onChange={(e) => setEditValues(prev => ({ ...prev, [resource._id]: { ...(prev[resource._id]||{}), description: e.target.value } }))} />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">{resource.description}</p>
                  )}

                  {/* Price Display */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Price</p>
                    <p className="text-lg font-bold text-primary">
                      {resource.price && resource.price > 0 ? `₨${resource.price.toLocaleString()}` : 'Free'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    {activeTab === 'pending' && (
                      <div>
                        <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                        <textarea
                          className="w-full mt-2 p-2 border rounded text-sm"
                          rows={3}
                          placeholder="Enter reason for rejection (optional)"
                          value={rejectReason[resource._id] || ''}
                          onChange={(e) =>
                            setRejectReason(prev => ({
                              ...prev,
                              [resource._id]: e.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => handleApprove(resource._id)}
                            disabled={actionLoading[resource._id]}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading[resource._id] ? (
                              <Loader className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(resource._id)}
                            disabled={actionLoading[resource._id]}
                            variant="destructive"
                            className="flex-1"
                          >
                            {actionLoading[resource._id] ? (
                              <Loader className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Common admin actions: View / Edit / Delete */}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleView(resource._id)} className="flex-1">View</Button>
                      {!editing[resource._id] && (
                        <Button onClick={() => startEdit(resource)} variant="outline" className="flex-1">Edit</Button>
                      )}
                      {editing[resource._id] && (
                        <>
                          <Button onClick={() => saveEdit(resource._id)} className="flex-1">Save</Button>
                          <Button onClick={() => cancelEdit(resource._id)} variant="ghost" className="flex-1">Cancel</Button>
                        </>
                      )}
                      <Button onClick={() => handleDeleteResource(resource._id)} variant="destructive" className="flex-1">Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
