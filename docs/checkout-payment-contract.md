# Checkout payment contract

Checkout is implemented but remains deliberately default-off. With
`NEXT_PUBLIC_CHECKOUT_ENABLED` absent or `false`, the cart presents the existing
unavailable message, the checkout page collects no customer information, and no
Authorize.Net script or payment endpoint is used.

The enabled flow is two-stage:

1. The storefront submits contact, appointment, coupon ID, and numeric product
   quantities to `/api/payment/checkout`. The backend validates the input,
   calculates authoritative pricing, and returns a short-lived capability.
2. Authorize.Net AcceptUI collects card number, expiration, and security code in
   its hosted form. The storefront sends only the returned one-time nonce, the
   capability, and one UUID idempotency key to `/api/payment/process`.

The browser never calculates the charge amount, sends raw card data to the
application, or creates a separate order after payment. A decline permits a new
payment attempt. Any ambiguous response blocks retry and tells the customer to
contact 24-7 Labs while backend reconciliation determines the authoritative
outcome. The capability and nonce remain in memory and expire.

The production image must select exactly one Authorize.Net browser environment;
the content-security policy then allows only that environment's AcceptUI script
and hosted iframe origin. The API Login ID and Public Client Key are public
browser configuration. Transaction credentials remain backend-only.

Production stays disabled until the merchant configuration, webhook and
transaction-detail reconciliation, adjustment controls, outbox delivery, and
the controlled production payment/void-or-refund test all pass. The storefront
flag and backend checkout/payment flags are independent kill switches.
