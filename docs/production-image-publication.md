# Production image publication

`Publish immutable production image` creates a reviewed storefront artifact;
it does not deploy it. The required build profile is either
`private_validation` (checkout compiled off) or `launch_candidate` (the
company-owned production Authorize.Net browser configuration compiled in).

The workflow remains skipped unless the repository variable
`AWS_ARTIFACT_PUBLISH_ENABLED` is exactly `true`, the operator confirms the
dispatch, and the dispatch runs from `main`. The protected
`production-artifact` environment must require a company reviewer and provide:

- secret `AWS_ARTIFACT_PUBLISH_ROLE_ARN`, scoped to this repository's storefront
  ECR repository;
- variable `AWS_ACCOUNT_ID`, containing the dedicated 24-7Labs AWS account.
- variables `AUTHORIZE_NET_PUBLIC_API_LOGIN_ID` and
  `AUTHORIZE_NET_PUBLIC_CLIENT_KEY`. These are provider-defined public browser
  identifiers, not transaction credentials; never place the transaction key or
  signature key in this repository or storefront workflow.

Inputs are the current 40-character `main` SHA and the successful main-push
`Frontend Fast Checks` run ID for that SHA. The workflow verifies those facts
and the retained security artifact before obtaining AWS credentials. A launch
candidate requires a second explicit confirmation and both bounded public
browser identifiers. The workflow builds with the canonical production origin,
re-scans the exact image, refuses an existing immutable source/profile tag,
pushes only `sha-<source SHA>-<build profile>`, verifies the ECR scan has zero
High or Critical findings, and retains a profile-bound receipt, scan, SBOM, and
checksums. A disabled and enabled build from the same source SHA cannot share a
tag or be mistaken for one another.

The role cannot deploy, read runtime secrets, modify infrastructure, or access
another application repository. A separate reviewed release manifest and
production-release workflow are required to use the image.
