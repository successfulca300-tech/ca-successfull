import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const API = 'http://127.0.0.1:5000/api';

const run = async () => {
  try {
    // Create a temporary user
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test User';

    console.log('Registering user', email);
    let res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const reg = await res.json();
    if (!res.ok) {
      console.error('Register failed', res.status, reg);
      return;
    }
    const token = reg.token || reg?.token;
    console.log('User token obtained');

    // Find an existing book via DB? Hardcode the book id from previous script output
    const bookId = '693f50aa20518389f9fce234';

    // Fetch book details
    res = await fetch(`${API}/books/${bookId}`, { headers: { Authorization: `Bearer ${token}` } });
    const book = await res.json();
    console.log('Book fetched', book._id || book);

    const fileUrl = book.fileUrl;
    console.log('fileUrl:', fileUrl);

    // Request view token
    res = await fetch(`${API}/files/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileUrl, bookId }),
    });
    const tokenRes = await res.json();
    console.log('Token response', res.status, tokenRes);
    if (!res.ok) return;

    const viewUrl = tokenRes.url;
    console.log('View URL:', viewUrl);

    // Fetch proxied URL
    const viewRes = await fetch(viewUrl);
    console.log('View fetch status:', viewRes.status, viewRes.headers.get('content-type'));
    if (viewRes.ok) {
      const buf = await viewRes.arrayBuffer();
      console.log('Received bytes:', buf.byteLength);
    } else {
      const txt = await viewRes.text();
      console.log('View response body:', txt);
    }
  } catch (err) {
    console.error('Test error', err);
  }
};

run();
