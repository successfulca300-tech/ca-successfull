import jwt from 'jsonwebtoken';

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

    if (courseId) {
      const e = await Enrollment.findOne({ userId: user._id, courseId, paymentStatus: 'paid' });
      if (e) allowed = true;
    }
    if (testSeriesId) {
      const e = await Enrollment.findOne({ userId: user._id, testSeriesId, paymentStatus: 'paid' });
      if (e) allowed = true;
    }
    if (bookId) {
      const e = await Enrollment.findOne({ userId: user._id, bookId, paymentStatus: 'paid' });
      if (e) allowed = true;
    }

    // If no resource id provided, deny request (we require a reason)
    if (!courseId && !testSeriesId && !bookId) {
      const html = htmlPage('File not available', 'Resource id (courseId/testSeriesId/bookId) required');
      return res.status(400).set('Content-Type', 'text/html').send(html);
    }

    if (!allowed) {
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
    // Build headers. Appwrite requires both project header and key when using API key.
    const headers = {};
    if (APPWRITE_API_KEY) {
      headers['X-Appwrite-Key'] = APPWRITE_API_KEY;
      if (process.env.APPWRITE_PROJECT_ID) {
        headers['X-Appwrite-Project'] = process.env.APPWRITE_PROJECT_ID;
      }
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

// Public proxy for Appwrite files (no auth). Use for thumbnails and public previews.
export const publicFileProxy = async (req, res) => {
  try {
    const { fileId, fileUrl } = req.query || {};

    if (!fileId && !fileUrl) {
      return res.status(400).json({ message: 'fileId or fileUrl query parameter required' });
    }

    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_BUCKET_ID) {
      const html = htmlPage('Server configuration error', 'Storage is not configured on the server. Please contact the site administrator.');
      return res.status(500).set('Content-Type', 'text/html').send(html);
    }

    let url;
    if (fileUrl) {
      url = fileUrl;
    } else {
      const sanitizedFileId = isValidFileId(fileId) ? fileId : sanitizeFileId(fileId);
      const _base = APPWRITE_ENDPOINT.replace(/\/$/, '');
      const endpointWithV1 = _base.endsWith('/v1') ? _base : `${_base}/v1`;
      url = `${endpointWithV1}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${sanitizedFileId}/view?project=${APPWRITE_PROJECT_ID}`;
    }

    const headers = {
      'X-Appwrite-Key': APPWRITE_API_KEY,
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    };

    console.log('[PublicProxy] Fetching Appwrite URL for public file', { fileId, fileUrl, url });

    const fetchRes = await fetch(url, { headers });
    if (!fetchRes.ok) {
      const status = fetchRes.status;
      let detail = '';
      try { detail = await fetchRes.text(); } catch (e) { detail = String(e); }
      console.error('Appwrite public file fetch failed', { url, status, detail });
      const message = status === 404 ? 'The requested file was not found.' : 'Failed to fetch file from storage.';
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>File not available</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a;"><div style="max-width:720px;padding:28px;border-radius:8px;background:#fff;border:1px solid #e6edf3;box-shadow:0 6px 24px rgba(2,6,23,0.04);"><h1 style="margin:0 0 8px;font-size:20px">File not available</h1><p style="margin:0 0 12px;color:#475569">${message} Please verify the file exists and try again. If the problem persists, contact support.</p><p style="margin:0;font-size:13px;color:#94a3b8">Status: ${status}</p></div></body></html>`;
      return res.status(status === 404 ? 404 : 502).set('Content-Type', 'text/html').send(html);
    }

    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await fetchRes.arrayBuffer());
    console.log('[PublicProxy] Serving file response, content-type:', contentType, 'bytes:', buffer.length);
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.error('publicFileProxy error', err);
    const html = htmlPage('Server error', 'Unable to proxy the file. Please try again later.');
    res.status(500).set('Content-Type', 'text/html').send(html);
  }
};
