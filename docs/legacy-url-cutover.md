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
