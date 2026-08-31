// Set VITE_PAYSTACK_PUBLIC_KEY in web/.env (see .env.example) to switch the
// public checkout page from the "pay the organizer directly" fallback over
// to a real Paystack popup. The public key is safe client-side by design --
// the secret key that actually verifies payment never leaves the
// verifyPaystackPayment Cloud Function (functions/src/paystack.ts).
export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;

interface PaystackSetupOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackSetupOptions) => { openIframe: () => void };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Paystack -- check your connection and try again.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function generatePaystackReference(): string {
  return `thh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Opens the Paystack popup; resolves with the transaction reference once the
 * buyer completes payment there. That reference still has to be verified
 * server-side (see verifyPaystackPayment) before any ticket code is issued --
 * this resolving is not proof payment succeeded, only that Paystack says so
 * client-side. */
export async function payWithPaystack(opts: {
  email: string;
  amountGHS: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<{ reference: string }> {
  if (!PAYSTACK_PUBLIC_KEY) throw new Error('Paystack is not configured for this site yet.');
  await loadPaystackScript();
  return new Promise((resolve, reject) => {
    const handler = window.PaystackPop!.setup({
      key: PAYSTACK_PUBLIC_KEY!,
      email: opts.email,
      amount: Math.round(opts.amountGHS * 100),
      currency: 'GHS',
      ref: opts.reference,
      metadata: opts.metadata ?? {},
      callback: (response) => resolve({ reference: response.reference }),
      onClose: () => reject(new Error('Payment cancelled.')),
    });
    handler.openIframe();
  });
}
