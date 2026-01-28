import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { settingsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await settingsAPI.get();
        const s = (res as any).settings || {};
        setSiteName(s.siteName || '');
        setContactEmail(s.contactEmail || '');
        setContactPhone(s.contactPhone || '');
        setAddress(s.address || '');
        setHeroImage(s.heroImage || '');
      } catch (err) {
        console.error('Failed to load settings', err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await settingsAPI.update({ siteName, contactEmail, contactPhone, address, image: imageFile });
      const s = (res as any).settings || {};
      setHeroImage(s.heroImage || '');
      toast.success('Settings updated');
    } catch (err: any) {
      console.error('Update settings error', err);
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">Site Settings</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Site Name</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="w-full p-3 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Email</label>
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full p-3 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full p-3 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-3 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Image (Landing)</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            {heroImage && (
              <div className="mt-3">
                <img src={heroImage} alt="Hero" className="w-48 h-48 object-contain rounded" />
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex gap-3">
            <Button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AdminSettings;
