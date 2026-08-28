# Legacy URL cutover gate

## Captured public baseline

`config/legacy-url-source-inventory.json` is a source-backed, checksum-protected capture of the public WordPress page and image sitemaps. Regenerate it only with `npm run capture:legacy-url-inventory`; the command has fixed HTTPS endpoints, rejects redirects and cross-origin/query-string entries, and reports counts and hashes rather than page content.

The current capture contains 276 page entries and 276 unique page URLs. The image sitemap contains 1,047 `<image:loc>` entries representing 1,047 unique `/wp-content/uploads/...` paths. These namespace-qualified image locations—not the sitemap's outer page-location elements—are the authoritative legacy-media inventory.

`npm run validate:legacy-url-contract` validates the checked-in source evidence without network access. `npm run validate:legacy-url-release` is the fail-closed release gate and is expected to fail until the full contract is reviewed. A capture is evidence, not approval.

The redirects in `config/legacyRedirects.mjs` are limited to paths already verified by the transfer team. They are not a complete inventory of the current WordPress site.

Production DNS must not move until an owner captures and reviews a source-backed URL inventory from all of the following:

- the current site's WordPress sitemap(s), database export, and web-server redirect rules;
- Google Search Console landing pages and indexed URLs;
- recent CDN/load-balancer access logs and paid-campaign destination URLs;
- every public product slug, page, post, category, form, and externally linked asset.

Each legacy URL must be classified as an exact route, a permanent redirect to a reviewed destination, or an intentional `410`. Product slugs must be mapped to the imported product IDs; do not infer those mappings from names. The release candidate must run an automated URL matrix against the production container and reject redirect chains, loops, unexpected `404`s, and cross-domain destinations.

Archive the inventory, mapping, test output, and sign-off with the cutover record so rollback can restore both DNS and the URL contract.

`config/legacy-url-contract.json` remains `review_required`. Before it can be approved:

- every captured page path must be classified as preserved, a one-hop same-origin permanent redirect, or an owner-approved `410`;
- the database, redirect rules, Search Console, analytics, backlink, campaign, and access-log evidence sources must be reconciled;
- all unique legacy media paths must be present in the reviewed media manifest and served through the dedicated CloudFront legacy-media origin behavior; and
- the release candidate must pass the live status, destination, canonical, indexing, chain, loop, and unexpected-404 checks.

## Live release-candidate acceptance

`npm run acceptance:legacy-urls` is the default-off live acceptance gate. It does not alter the site, DNS, redirects, data, or AWS resources. It refuses to make its first request unless the checked-in inventory has all required evidence sources reconciled and `config/legacy-url-contract.json` is complete and approved.

Run it first against the authenticated private preview with `noindex` enforced, then again against the public canonical origin after cutover. The private preview token is sent only as `X-24-7Labs-Preview-Authorization` and is never written to the receipt. The public phase accepts only `https://24-7labs.com`, requires indexable responses, and also verifies a one-hop query-preserving `https://www.24-7labs.com` redirect to the apex domain.

For every approved legacy page, the gate verifies the exact trailing-slash-sensitive path and its disposition:

- preserved pages return `200`, do not redirect, and expose exactly one same-origin canonical URL;
- redirected pages return `301` or `308`, preserve a fixed query-string probe, reach the approved same-origin destination in one hop, and expose the destination canonical URL;
- removed pages return `410` and are `noindex`; and
- a fixed unclassified probe returns `404` without a redirect.

The gate uses at most six concurrent requests, one attempt per URL, a ten-second timeout per request, and a 2 MiB streamed HTML limit. A successful run creates a new mode-`0600`, path-free JSON receipt outside the repository. The receipt path must not already exist.

Required environment for the private-preview phase:

```text
LEGACY_URL_ACCEPTANCE_ENABLED=true
LEGACY_URL_ACCEPTANCE_CONFIRM=VERIFY_LEGACY_URL_CONTRACT
LEGACY_URL_ACCEPTANCE_APPROVAL_ID=OPS-<numeric-ticket>
LEGACY_URL_ACCEPTANCE_ACCESS_MODE=private_preview
LEGACY_URL_ACCEPTANCE_INDEXING_MODE=noindex
LEGACY_URL_ACCEPTANCE_TARGET_ORIGIN=https://<approved-preview-origin>
LEGACY_URL_ACCEPTANCE_PREVIEW_TOKEN=<32-to-256-character-secret>
LEGACY_URL_ACCEPTANCE_RECEIPT_PATH=<absolute-new-path-outside-repository>
```

For the public phase, use `LEGACY_URL_ACCEPTANCE_ACCESS_MODE=public`, `LEGACY_URL_ACCEPTANCE_INDEXING_MODE=indexable`, `LEGACY_URL_ACCEPTANCE_TARGET_ORIGIN=https://24-7labs.com`, and an empty `LEGACY_URL_ACCEPTANCE_PREVIEW_TOKEN`. Preserve each receipt with the release evidence. A failed gate writes no receipt and blocks cutover or continued rollout.
