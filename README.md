This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

Use Node 22.23.2 and npm 10.9.8. Copy `example.env` to `.env.local`, then install and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) with your browser to see the result.

Run the local CI gates with `npm run ci`, `npm run audit`, and `npm run audit:prod`. CI also produces a CycloneDX container SBOM and blocks fixed High/Critical container vulnerabilities. The liveness endpoint is `/api/health`.

## Container

The multi-stage image uses the Next.js standalone output, runs without root, and can be built for ARM64 with Buildx:

```bash
docker buildx build --platform linux/arm64 --build-arg NEXT_PUBLIC_PROD_API_URL=https://api.example.com --build-arg NEXT_PUBLIC_SITE_URL=https://24-7labs.com -t 24-7labs-web .
```

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

Deploy only an image that passed the required `Frontend Fast Checks` branch-protection check. Public `NEXT_PUBLIC_*` values are embedded at build time and must never contain secrets.

Before production DNS cutover, complete the source-backed legacy URL inventory and validation gate in `docs/legacy-url-cutover.md`; the small checked-in redirect list is intentionally not presented as complete.

Checkout remains off unless the production image is explicitly built with
`NEXT_PUBLIC_CHECKOUT_ENABLED=true` and the selected Authorize.Net environment,
API Login ID, and Public Client Key. Those values are public browser
configuration; the Authorize.Net Transaction Key remains backend-only. Enabling
the storefront does not override the backend payment kill switches or the
required controlled production acceptance test.
