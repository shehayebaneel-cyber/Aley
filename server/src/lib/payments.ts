// ---------------------------------------------------------------------------
// Payment abstraction for donations (and reusable for future orders/bookings).
//
// The app talks to a payment gateway ONLY through PaymentProvider. The default
// is a MOCK provider (records the donation immediately — no real charge). To go
// live with a Lebanese gateway (Areeba/Mastercard MPGS, Whish, PinPay, a bank's
// hosted page, …) implement HostedGatewayProvider's two HTTP calls with your
// merchant credentials and set PAYMENT_PROVIDER=gateway. No route/UI changes.
//
// Most Lebanese gateways use a "hosted redirect" flow:
//   1) create a payment session on the gateway  -> returns a redirect URL
//   2) customer pays on the gateway's hosted page
//   3) gateway redirects back to our returnUrl with a reference
//   4) we verify that reference server-side, then record the donation
// ---------------------------------------------------------------------------

export interface DonationIntent {
  amount: number;
  currency: string;
  projectId: number;
  donorName: string;
  reference: string; // our unique reference for this attempt
  returnUrl: string; // where the gateway sends the donor back
}

export interface PaymentResult {
  status: "PAID" | "REDIRECT" | "PENDING" | "FAILED";
  redirectUrl?: string; // when status === "REDIRECT"
  providerRef?: string;
  error?: string;
}

export interface PaymentProvider {
  readonly name: string;
  /** Begin a donation payment. Mock pays instantly; hosted gateways return a redirect URL. */
  startDonation(intent: DonationIntent): Promise<PaymentResult>;
  /** Verify a payment by reference after the donor returns (hosted-redirect gateways). */
  verify(reference: string): Promise<PaymentResult>;
}

/** Default: no real charge — records donations immediately (test/demo). */
class MockProvider implements PaymentProvider {
  readonly name = "mock";
  async startDonation(): Promise<PaymentResult> {
    return { status: "PAID" };
  }
  async verify(): Promise<PaymentResult> {
    return { status: "PAID" };
  }
}

/**
 * Template for a real hosted-checkout gateway. Reads merchant credentials from
 * env. The two fetch() calls below are the ONLY gateway-specific code to write
 * once you have a merchant account + API docs from your provider.
 *
 * Required env: PAYMENT_BASE_URL, PAYMENT_MERCHANT_ID, PAYMENT_API_KEY
 */
class HostedGatewayProvider implements PaymentProvider {
  readonly name = "gateway";
  private base = process.env.PAYMENT_BASE_URL ?? "";
  private merchant = process.env.PAYMENT_MERCHANT_ID ?? "";
  private key = process.env.PAYMENT_API_KEY ?? "";

  private configured() {
    return this.base && this.merchant && this.key;
  }

  async startDonation(intent: DonationIntent): Promise<PaymentResult> {
    if (!this.configured()) return { status: "FAILED", error: "Payment gateway is not configured." };
    // TODO (gateway-specific): create a hosted payment session and return its URL.
    // Example shape — replace endpoint/fields with your provider's API:
    //
    // const res = await fetch(`${this.base}/session`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` },
    //   body: JSON.stringify({
    //     merchantId: this.merchant,
    //     amount: intent.amount, currency: intent.currency,
    //     reference: intent.reference, returnUrl: intent.returnUrl,
    //     description: `Donation to project #${intent.projectId}`,
    //   }),
    // });
    // const data = await res.json();
    // return { status: "REDIRECT", redirectUrl: data.checkoutUrl, providerRef: data.id };
    return { status: "FAILED", error: "Gateway adapter not implemented yet." };
  }

  async verify(reference: string): Promise<PaymentResult> {
    if (!this.configured()) return { status: "FAILED", error: "Payment gateway is not configured." };
    // TODO (gateway-specific): confirm the payment status for `reference`.
    // const res = await fetch(`${this.base}/payment/${reference}`, {
    //   headers: { Authorization: `Bearer ${this.key}` },
    // });
    // const data = await res.json();
    // return { status: data.status === "CAPTURED" ? "PAID" : "FAILED", providerRef: reference };
    void reference;
    return { status: "FAILED", error: "Gateway adapter not implemented yet." };
  }
}

// Select the active provider via env (default: mock — safe, no real charge).
export const paymentProvider: PaymentProvider =
  process.env.PAYMENT_PROVIDER === "gateway" ? new HostedGatewayProvider() : new MockProvider();
