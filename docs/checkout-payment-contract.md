# Checkout payment contract

Online checkout is deliberately disabled in this branch. The page does not load
Authorize.Net, collect card fields, create an order, or call the payment API.
This matches the backend's fail-closed `503` payment endpoint.

Do not re-enable checkout until the backend owns all pricing, returns a
high-entropy customer checkout token rather than relying on an integer order ID,
requires a server-enforced idempotency key, persists payment-attempt states before
the gateway call, uniquely records provider transaction IDs, and has a tested
reconciliation path for provider-success/database-failure. Coupon use and order
notifications must be finalized only after confirmed payment.

The production merchant account, webhook/signature contract, refund procedure,
and sandbox-to-production owner approval also remain external launch gates.
