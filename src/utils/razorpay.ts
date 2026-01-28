import { apiRequest } from '@/lib/api';

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window && (window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

export async function openRazorpay(resourceType: 'course' | 'testseries' | 'book', resource: any, amount?: number, selectedSubjects?: string[]) {
  if (!resourceType || !resource) throw new Error('Resource type and resource are required');
  await loadRazorpayScript();

  const id = resource._id || resource.id;
  const finalAmount = amount !== undefined ? amount : (resource.price || 0);

  if (typeof finalAmount !== 'number' || finalAmount <= 0) {
    throw new Error('Amount must be a positive number for payment');
  }

  const title = resource.title || resource.name || 'Purchase';

  // Build payload with proper key
  const payload: any = { amount: finalAmount };
  if (resourceType === 'course') payload.courseId = id;
  if (resourceType === 'testseries') {
    payload.testSeriesId = id;
    if (selectedSubjects && selectedSubjects.length > 0) {
      payload.purchasedSubjects = selectedSubjects;
    }
  }
  if (resourceType === 'book') payload.bookId = id;

  // Create order on backend
  const resp = await apiRequest('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!resp || resp.mode !== 'razorpay') {
    throw new Error('Payment mode not available');
  }

  const { keyId, order, enrollmentId } = resp;

  const options: any = {
    key: keyId,
    amount: order.amount,
    currency: order.currency,
    name: title,
    description: title,
    order_id: order.id,
    handler: async function (razorpayResponse: any) {
      try {
        await apiRequest('/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_order_id: razorpayResponse.razorpay_order_id,
            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
            razorpay_signature: razorpayResponse.razorpay_signature,
            enrollmentId,
          }),
        });
        alert('Payment successful — access granted');

        // Navigate to appropriate dashboard section based on resource type
        if (resourceType === 'testseries') {
          window.location.href = '/dashboard?tab=test-series';
        } else if (resourceType === 'course') {
          window.location.href = '/dashboard?tab=courses';
        } else if (resourceType === 'book') {
          window.location.href = '/dashboard?tab=books';
        } else {
          window.location.reload();
        }
      } catch (err: any) {
        console.error('Verification failed', err);
        alert('Payment verification failed: ' + (err.message || err));
      }
    },
    prefill: {
      name: (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').name; } catch { return ''; } })(),
      email: (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').email; } catch { return ''; } })(),
    },
    theme: { color: '#2563eb' },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
