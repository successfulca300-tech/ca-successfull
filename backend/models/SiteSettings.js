import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'CA Successful' },
  contactEmail: { type: String, default: 'SuccessfulCa300@gmail.com' },
  contactPhone: { type: String, default: '+91 91096 47073' },
  address: { type: String, default: '' },
  heroImage: { type: String, default: '' }, // URL to Appwrite or external
  updatedAt: { type: Date, default: Date.now },
});

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
export default SiteSettings;
