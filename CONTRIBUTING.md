# Contributing

All changes must be proposed through a focused pull request. Do not push directly
to `main`, deploy from a contributor branch, or change production services as
part of a code review.

## Workflow

1. Start from the current `main` branch and create a descriptive feature or fix
   branch.
2. Keep one bounded purpose per pull request.
3. Use synthetic data only. Never commit or attach credentials, environment
   files, database dumps, media archives, or customer, patient, order, payment,
   or form records.
4. Run the repository checks documented in the README and include the results in
   the pull request.
5. Identify configuration, database, privacy, security, and rollback effects.
6. Wait for company review and passing checks before merge. A pull request,
   approval, or merge does not authorize deployment or billable work.

If requirements or scope are unclear, open a draft pull request and list the
question rather than assuming production behavior.

