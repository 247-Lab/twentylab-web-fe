# Legacy URL cutover gate

The redirects in `config/legacyRedirects.mjs` are limited to paths already verified by the transfer team. They are not a complete inventory of the current WordPress site.

Production DNS must not move until an owner captures and reviews a source-backed URL inventory from all of the following:

- the current site's WordPress sitemap(s), database export, and web-server redirect rules;
- Google Search Console landing pages and indexed URLs;
- recent CDN/load-balancer access logs and paid-campaign destination URLs;
- every public product slug, page, post, category, form, and externally linked asset.

Each legacy URL must be classified as an exact route, a permanent redirect to a reviewed destination, or an intentional `410`. Product slugs must be mapped to the imported product IDs; do not infer those mappings from names. The release candidate must run an automated URL matrix against the production container and reject redirect chains, loops, unexpected `404`s, and cross-domain destinations.

Archive the inventory, mapping, test output, and sign-off with the cutover record so rollback can restore both DNS and the URL contract.
