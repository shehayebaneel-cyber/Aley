# Payments (donations)

Donations flow through a single, swappable **payment provider** (`server/src/lib/payments.ts`).

- **Default = `mock`**: donations are recorded immediately, with **no real charge**. Good for
  development and demos.
- **`gateway`**: a real hosted-checkout gateway (the donor pays on the provider's secure page).

The app code (donate button, donation recording, project totals) never changes — only the
provider does.

## Going live with a Lebanese gateway

Stripe does **not** pay out to merchants based in Lebanon, so for real payouts use a local
gateway. Common options:

| Gateway | Notes |
| --- | --- |
| **Areeba** (Mastercard MPGS hosted checkout) | Via most Lebanese banks; hosted payment page |
| **Whish Money** | Popular local wallet/API |
| **PinPay** | Local payments |
| **Your bank's gateway** (Audi/BLOM/etc.) | Usually MPGS-based hosted page |

### What you need to obtain (from the gateway / your bank)
1. A **merchant account** (signed agreement) — this is the part only you can do.
2. **Sandbox/test credentials** to integrate and test before going live:
   - API base URL
   - Merchant ID
   - API key / secret (and sometimes a hashing key)
3. Their **API docs** for: "create hosted payment session" and "query/verify payment".

### How to finish the integration
1. Put the credentials in `server/.env`:
   ```
   PAYMENT_PROVIDER="gateway"
   PAYMENT_BASE_URL="https://<gateway-base-url>"
   PAYMENT_MERCHANT_ID="<merchant id>"
   PAYMENT_API_KEY="<api key/secret>"
   ```
2. In `server/src/lib/payments.ts`, fill the two `fetch()` calls in `HostedGatewayProvider`
   (`startDonation` = create session → return checkout URL; `verify` = confirm payment by
   reference) to match the gateway's API.
3. A small follow-up (when wiring a redirect gateway): add `status` + `providerRef` to the
   `Donation` model so a donation can be **pending → paid** after the donor returns and we verify.
   The donate endpoint already returns `{ status: "redirect", redirectUrl }` for that flow.

Bring me the gateway name + sandbox credentials + API docs and I'll complete steps 2–3 and test
it end-to-end in their sandbox.
