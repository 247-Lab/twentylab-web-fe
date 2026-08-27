# Production image publication

`Publish immutable production image` creates a reviewed storefront artifact;
it does not deploy it. Checkout is compiled off in this candidate.

The workflow remains skipped unless the repository variable
`AWS_ARTIFACT_PUBLISH_ENABLED` is exactly `true`, the operator confirms the
dispatch, and the dispatch runs from `main`. The protected
`production-artifact` environment must require a company reviewer and provide:

- secret `AWS_ARTIFACT_PUBLISH_ROLE_ARN`, scoped to this repository's storefront
  ECR repository;
- variable `AWS_ACCOUNT_ID`, containing the dedicated 24-7Labs AWS account.

Inputs are the current 40-character `main` SHA and the successful main-push
`Frontend Fast Checks` run ID for that SHA. The workflow verifies those facts
and the retained security artifact before obtaining AWS credentials. It builds
with the canonical production origin and `NEXT_PUBLIC_CHECKOUT_ENABLED=false`,
re-scans the image, refuses an existing immutable source tag, pushes only
`sha-<source SHA>`, verifies the ECR scan has zero High or Critical findings,
and retains a receipt, scan, SBOM, and checksums.

The role cannot deploy, read runtime secrets, modify infrastructure, or access
another application repository. A separate reviewed release manifest and
production-release workflow are required to use the image.
