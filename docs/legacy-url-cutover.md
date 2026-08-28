# Legacy URL cutover gate

## Captured public baseline

`config/legacy-url-source-inventory.json` is a source-backed, checksum-protected capture of the public WordPress page and image sitemaps. Regenerate it only with `npm run capture:legacy-url-inventory`; the command has fixed HTTPS endpoints, rejects redirects and cross-origin/query-string entries, and reports counts and hashes rather than page content.

The current capture contains 276 page entries and 276 unique page URLs. The image sitemap contains 1,047 `<image:loc>` entries representing 1,047 unique `/wp-content/uploads/...` paths. These namespace-qualified image locations—not the sitemap's outer page-location elements—are the authoritative legacy-media inventory.

`npm run validate:legacy-url-contract` validates the checked-in source evidence without network access. `npm run validate:legacy-url-release` is the fail-closed release gate and is expected to fail until the full contract is reviewed. A capture is evidence, not approval.

The July 21 final database snapshot contains 129 active blog rows. Its 129 slugs match 129 captured legacy root paths exactly, with no database-only or sitemap-only blog slugs. Those entries are now classified as one-hop redirects from the WordPress trailing-slash URL to the same root slug without a trailing slash. Root blog pages are canonical; the transferred application's interim `/blogs/<slug>` detail route permanently redirects to the historical root path. This classification is bound to the reviewed snapshot with SHA-256 `5462ff2be8913b29385e0e74816963617db5f4149f5888ce2da8bbc829694772`.

Sixteen additional paths are source-backed exact route matches: the home page plus 15 existing application routes whose legacy form differs only by the trailing slash. The home page is preserved and the 15 trailing-slash paths are classified as one-hop redirects to the same route without the slash. No semantic alias was inferred for this set.

The product-route evidence pipeline independently binds the 105 public WordPress product paths to the July 21 final database snapshot. `npm run capture:legacy-product-routes` accepts a catalog-only JSON projection on standard input, fetches the fixed public product URLs with redirects disabled, extracts the single Product JSON-LD record, and matches only an exact normalized English name to one published and visible imported product. The output is `config/legacy-product-route-evidence.json`, bound to both the sitemap source-set checksum and final database SHA-256. It contains public product facts only; no users, forms, orders, or customer data are queried or stored.

`npm run apply:legacy-product-routes` validates that evidence, updates the URL contract, and regenerates the runtime product-route module. The current evidence binds 101 stable product paths to unique imported product IDs. Those exact WordPress paths remain canonical and serve the imported product directly; internal numeric links for the same products permanently canonicalize back to the stable slug. Four paths remain unresolved and are deliberately not routed because the evidence is absent or ambiguous:

- `/product/basic-combination-allergy-panel/`
- `/product/expanded-food-panel-90-foods-food-additives/`
- `/product/hair-10-panel-drug-test/`
- `/product/prolactin/`

Four otherwise exact identity matches have a changed final-catalog price; that drift is recorded in the evidence rather than used as a slug-matching signal. The imported catalog remains authoritative for the destination price.

Thirty page paths remain intentionally unclassified: the four unresolved product paths plus 26 aliased, form, commerce, policy, or retired paths. Aliased and retired paths still require explicit destination or owner-approved `410` review; similar names alone are not approval.

Runtime canonicalization is resolved by `src/proxy.js` after `skipTrailingSlashRedirect` disables Next.js's automatic pre-routing slash redirect. This prevents the previous `/shop/` → `/shop` → `/testing-services` chain. Known aliases, no-slash or numeric variants of verified product routes, transferred `/blogs/<slug>` paths, and ordinary trailing-slash canonicalization now share one resolver that preserves the query string and emits one permanent `308`. The canonical legacy product path itself is not redirected. The checked-in `npm run smoke:canonical-redirects` command starts the compiled storefront, verifies representative one-hop and preserved-product responses with redirect following disabled, and terminates its exact child process.

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
