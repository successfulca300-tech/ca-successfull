import SiteSettings from '../models/SiteSettings.js';
import fs from 'fs';
import path from 'path';

// GET /api/settings - public
export const getSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne({}).lean();
    if (!settings) {
      // create default
      settings = await SiteSettings.create({});
    }
    res.json({ settings });
  } catch (err) {
    console.error('getSettings error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/settings - admin only
export const updateSettings = async (req, res) => {
  try {
    const { siteName, contactEmail, contactPhone, address } = req.body || {};

    let settings = await SiteSettings.findOne({});
    if (!settings) {
      settings = new SiteSettings();
    }

    if (siteName !== undefined) settings.siteName = siteName;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (address !== undefined) settings.address = address;

    // Handle uploaded image via express-fileupload (req.files.image)
    if (req.files && req.files.image) {
      const image = req.files.image;
      const tempPath = image.tempFilePath || image.tempFiles?.[0]?.tempFilePath || image.path;

      if (tempPath && fs.existsSync(tempPath)) {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const ext = path.extname(image.name || 'hero.jpg') || '.jpg';
        const filename = `hero_${Date.now()}${ext}`;
        const finalPath = path.join(uploadsDir, filename);

        // Move file to uploads directory
        try {
          fs.renameSync(tempPath, finalPath);
          // Store relative path that can be served via static middleware
          settings.heroImage = `/uploads/${filename}`;
          console.log('Image saved locally:', settings.heroImage);
        } catch (moveError) {
          console.error('Failed to move image file:', moveError);
          // Fallback to data URI
          try {
            const data = fs.readFileSync(tempPath);
            const mime = image.mimetype || 'image/jpeg';
            settings.heroImage = `data:${mime};base64,${data.toString('base64')}`;
            console.log('Fallback to data URI');
          } catch (fallbackError) {
            console.error('Data URI fallback failed:', fallbackError);
          }
        }
      }
    }

    settings.updatedAt = new Date();
    await settings.save();

    res.json({ settings });
  } catch (err) {
    console.error('updateSettings error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
