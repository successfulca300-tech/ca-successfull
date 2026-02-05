import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

function htmlPage(title = 'File not available', message = 'The requested file is not available.', detail = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;"><div style="max-width:720px;padding:28px;border-radius:8px;background:#fff;border:1px solid #e6edf3;box-shadow:0 6px 24px rgba(2,6,23,0.04);"><h1 style="margin:0 0 8px;font-size:20px">${title}</h1><p style="margin:0 0 12px;color:#475569">${message}</p>${detail ? `<p style="margin:0;font-size:13px;color:#94a3b8">${detail}</p>` : ''}</div></body></html>`;
}

// Helper function to check if fileId is valid for Appwrite UID requirements
// Max 36 chars, a-z, A-Z, 0-9, underscore, no leading underscore
function isValidFileId(fileId) {
  if (!fileId || typeof fileId !== 'string') return false;
  if (fileId.length > 36) return false;
  if (fileId.startsWith('_')) return false;
  return /^[a-zA-Z0-9_]+$/.test(fileId);
}

// Helper function to sanitize fileId to meet Appwrite UID requirements
// Max 36 chars, a-z, A-Z, 0-9, underscore, no leading underscore
function sanitizeFileId(filename) {
  if (!filename) return `file_${Date.now()}`;
  // Remove extension, replace non-alphanumeric with underscore, limit to 36 chars
  let base = filename.replace(/\.[^/.]+$/, ''); // remove extension
  base = base.replace(/[^a-zA-Z0-9_]/g, '_'); // replace invalid chars with _
  base = base.replace(/^_+/, ''); // remove leading underscores
  if (base.length > 36) base = base.substring(0, 36);
  if (!base) base = `file_${Date.now()}`;
  return base;
}

// POST /api/files/token
// Body: { fileId, courseId?, testSeriesId?, bookId? }
export const generateFileViewToken = async (req, res) => {
  try {
    const { fileId, fileUrl, courseId, testSeriesId, bookId } = req.body || {};
    if (!fileId && !fileUrl) {
      const html = htmlPage('File not available', 'No file specified. Please contact support for assistance.');
      return res.status(400).set('Content-Type', 'text/html').send(html);
    }

    // Ensure user is present (protect middleware should set req.user)
    const user = req.user;
    if (!user) {
      const html = htmlPage('Not authorized', 'You must be logged in to access this file.');
      return res.status(401).set('Content-Type', 'text/html').send(html);
    }

    // If any resource id provided, verify enrollment
    const Enrollment = (await import('../models/Enrollment.js')).default;
    let allowed = false;

    // Helper to build flexible query for testSeries (match ObjectId or shorthand string)
    const buildTestSeriesQuery = async (tsParam) => {
      if (!tsParam) return { testSeriesId: tsParam };
      if (mongoose.Types.ObjectId.isValid(tsParam)) {
        try {
          const oid = new mongoose.mongo.ObjectId(tsParam);
          return { $or: [{ testSeriesId: oid }, { testSeriesId: String(tsParam) }] };
        } catch (e) {
          return { testSeriesId: String(tsParam) };
        }
      }
      const seriesType = String(tsParam || '').toUpperCase();
      if (['S1','S2','S3','S4'].includes(seriesType)) {
        const ts = await (await import('../models/TestSeries.js')).default.findOne({ seriesType });
        const shorthandLower = seriesType.toLowerCase();
        if (ts) return { $or: [{ testSeriesId: ts._id }, { testSeriesId: shorthandLower }] };
        return { testSeriesId: shorthandLower };
      }
      return { testSeriesId: tsParam };
    };

    if (courseId) {
      const e = await Enrollment.findOne({ userId: user._id, courseId, paymentStatus: 'paid' });
      if (e) allowed = true;
    }

    // If a file is a test series paper, enforce purchased-subject level access
    let requiredSubject = null;
    let paperFound = null;
    if (fileId || fileUrl) {
      const TestSeriesPaper = (await import('../models/TestSeriesPaper.js')).default;
      // Try matching by appwriteFileId
      if (fileId) paperFound = await TestSeriesPaper.findOne({ appwriteFileId: fileId });
      // If not found, try matching by publicFileUrl
      if (!paperFound && fileUrl) paperFound = await TestSeriesPaper.findOne({ publicFileUrl: fileUrl });
      // If still not found, try extracting fileId from URL and matching
      if (!paperFound && fileUrl) {
        const match = String(fileUrl).match(/\/files\/([^\/]+)\/view/);
        if (match) {
          const extracted = match[1];
          paperFound = await TestSeriesPaper.findOne({ appwriteFileId: extracted });
        }
      }

      if (paperFound) {
        requiredSubject = paperFound.subject;
        console.log('[FileView] Paper found', { paperId: paperFound._id, subject: requiredSubject, paperTestSeriesId: paperFound.testSeriesId });
        // Resolve the testSeriesId for the paper (use DB id if present)
        const paperTsId = paperFound.testSeriesId;
        const tsQuery = await buildTestSeriesQuery(paperTsId);
        // Find all paid enrollments matching testSeriesId
        const paidEnrollments = await Enrollment.find({ userId: user._id, paymentStatus: 'paid', ...tsQuery });
        console.log('[FileView] Paid enrollments for paper found (count):', paidEnrollments.length, 'ids:', paidEnrollments.map(e => e._id));
        if (paidEnrollments && paidEnrollments.length > 0) {
          // Merge purchasedSubjects
          const allSubjects = new Set();
          for (const en of paidEnrollments) {
            if (en.purchasedSubjects && Array.isArray(en.purchasedSubjects)) {
              en.purchasedSubjects.forEach(s => allSubjects.add(s));
            }
          }
          const merged = Array.from(allSubjects);
          console.log('[FileView] Merged purchasedSubjects for user:', merged);
          // If no purchasedSubjects, treat as full access
          if (merged.length === 0) {
            allowed = true;
          } else {
            // purchasedSubjects entries might be like 'series1-FR'
            const subjectAllowed = merged.some(ps => ps === requiredSubject || ps.endsWith('-' + requiredSubject));
            console.log('[FileView] subjectAllowed?', subjectAllowed);
            if (subjectAllowed) allowed = true;
          }
        }
      }
    }

    if (!allowed && testSeriesId) {
      const tsQuery = await buildTestSeriesQuery(testSeriesId);
      const e = await Enrollment.findOne({ userId: user._id, paymentStatus: 'paid', ...tsQuery });
      if (e) allowed = true;
    }

    if (bookId) {
      const e = await Enrollment.findOne({ userId: user._id, bookId, paymentStatus: 'paid' });
      if (e) allowed = true;
    }

    console.log('[FileView] Access check result:', { allowed, user: user._id, fileId, fileUrl, testSeriesId, requiredSubject });

    // If no resource id provided, deny request (we require a reason)
    if (!courseId && !testSeriesId && !bookId) {
      const html = htmlPage('File not available', 'Resource id (courseId/testSeriesId/bookId) required');
      return res.status(400).set('Content-Type', 'text/html').send(html);
    }

    if (!allowed) {
      console.warn('[FileView] Access denied for user', user._id, { fileId, fileUrl, testSeriesId, requiredSubject });
      const html = htmlPage('Access denied', 'You do not have access to this file. Please purchase or enroll to view it.');
      return res.status(403).set('Content-Type', 'text/html').send(html);
    }

    // Sign both fileId and fileUrl (if present) into the token so proxy can determine source
    const tokenPayload = {};
    if (fileId) tokenPayload.fileId = fileId;
    if (fileUrl) tokenPayload.fileUrl = fileUrl;

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Build absolute URL for the frontend to open. Prefer explicit BACKEND_URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const baseFromReq = `${protocol}://${host}`;
    const base = (process.env.BACKEND_URL || baseFromReq).replace(/\/$/, '');
    const absoluteUrl = `${base}/api/files/view/${token}`;

    return res.json({ url: absoluteUrl });
  } catch (err) {
    console.error('generateFileViewToken error', err);
    const html = htmlPage('Server error', 'Unable to generate file link. Please try again later.');
    res.status(500).set('Content-Type', 'text/html').send(html);
  }
};

// GET /api/files/view/:token -> validate token and proxy file from Appwrite
export const proxyFileView = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      const html = htmlPage('File not available', 'Token required to view this file.');
      return res.status(400).set('Content-Type', 'text/html').send(html);
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>File not available</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;"><div style="max-width:720px;padding:28px;border-radius:8px;background:#fff;border:1px solid #e6edf3;box-shadow:0 6px 24px rgba(2,6,23,0.04);"><h1 style="margin:0 0 8px;font-size:20px">File not available</h1><p style="margin:0 0 12px;color:#475569">The link is invalid or has expired. If you believe this is an error, please contact support.</p><p style="margin:0;font-size:13px;color:#94a3b8">Error: Invalid or expired token</p></div></body></html>`;
      return res.status(401).set('Content-Type', 'text/html').send(html);
    }

    const { fileId, fileUrl } = payload;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

    let url;
    if (fileUrl) {
      // If fileUrl is provided, try to extract and sanitize fileId from it
      const urlMatch = fileUrl.match(/\/files\/([^\/]+)\/view/);
      if (urlMatch) {
        const extractedFileId = urlMatch[1];
        if (!isValidFileId(extractedFileId)) {
          // Sanitize the invalid fileId and reconstruct URL
          const sanitizedFileId = sanitizeFileId(extractedFileId);
          const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
          const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
          const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

          if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
            const html = htmlPage('Server configuration error', 'Storage is not configured on the server. Please contact the site administrator.');
            return res.status(500).set('Content-Type', 'text/html').send(html);
          }

          const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
          const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
          url = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${sanitizedFileId}/view?project=${APPWRITE_PROJECT_ID}`;
        } else {
          url = fileUrl;
        }
      } else {
        url = fileUrl;
      }
    } else if (fileId) {
      const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
      const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
      const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

      if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
        const html = htmlPage('Server configuration error', 'Storage is not configured on the server. Please contact the site administrator.');
        return res.status(500).set('Content-Type', 'text/html').send(html);
      }

      const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
      const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
      const sanitizedFileId = isValidFileId(fileId) ? fileId : sanitizeFileId(fileId);
      url = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${sanitizedFileId}/view?project=${APPWRITE_PROJECT_ID}`;
    } else {
      const html = htmlPage('File not available', 'fileId or fileUrl required in token');
      return res.status(400).set('Content-Type', 'text/html').send(html);
    }

    // Use global fetch (Node 18+). Do not require external node-fetch dependency.
    // Include both X-Appwrite-Key and x-appwrite-project headers when a project API key is used
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const headers = {};
    if (APPWRITE_API_KEY) headers['X-Appwrite-Key'] = APPWRITE_API_KEY;
    if (APPWRITE_PROJECT_ID) headers['x-appwrite-project'] = APPWRITE_PROJECT_ID;

    // If using a project-scoped API key, ensure project id is configured — return helpful error if missing
    if (APPWRITE_API_KEY && !APPWRITE_PROJECT_ID) {
      console.error('[FileView] Configuration error: APPWRITE_API_KEY is set but APPWRITE_PROJECT_ID is missing');
      const html = htmlPage('Server configuration error', 'Storage project ID missing on server. Please contact the site administrator.');
      return res.status(500).set('Content-Type', 'text/html').send(html);
    }

    const fetchRes = await fetch(url, { headers });
    if (!fetchRes.ok) {
      const status = fetchRes.status;
      let detail = '';
      try { detail = await fetchRes.text(); } catch (e) { detail = String(e); }

      console.error('Appwrite file fetch failed', { url, status, detail });

      const message = status === 404 ? 'The requested file was not found.' : 'Failed to fetch file from storage.';
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>File not available</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;"><div style="max-width:720px;padding:28px;border-radius:8px;background:#fff;border:1px solid #e6edf3;box-shadow:0 6px 24px rgba(2,6,23,0.04);"><h1 style="margin:0 0 8px;font-size:20px">File not available</h1><p style="margin:0 0 12px;color:#475569">${message} Please verify the file exists and try again. If the problem persists, contact support.</p><p style="margin:0;font-size:13px;color:#94a3b8">Status: ${status}</p></div></body></html>`;

      return res.status(status === 404 ? 404 : 502).set('Content-Type', 'text/html').send(html);
    }

    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await fetchRes.arrayBuffer());
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.error('proxyFileView error', err);
    const html = htmlPage('Server error', 'Unable to proxy the file. Please try again later.');
    res.status(500).set('Content-Type', 'text/html').send(html);
  }
};
