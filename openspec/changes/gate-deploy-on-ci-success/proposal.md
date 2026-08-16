## Why

`ci.yml` (lint/typecheck/test/build) и `deploy.yml` (build images → publish to GHCR →
deploy to VPS) are two independent GitHub Actions workflows that both trigger on
`push: branches: [main]`. `deploy.yml` does not wait for `ci.yml` to finish or check its
result. A commit that lands on `main` with failing lint/types/tests still gets built and,
if `vars.DEPLOY_ENABLED == 'true'`, deployed to production — the only signal is a red
`ci.yml` run that nothing is watching. This needs fixing before `DEPLOY_ENABLED` is turned
on for real production traffic.

## What Changes

- Make `deploy.yml`'s build/deploy jobs depend on `ci.yml` succeeding for the same commit,
  so a broken commit on `main` cannot reach production.
- Document the chosen mechanism (`workflow_run` gating vs. merging both workflows into one)
  and its tradeoffs for PR-triggered vs. main-triggered runs.

## Capabilities

### New Capabilities
- `deploy-pipeline`: CI/CD pipeline behavior — how code changes on `main` flow through
  verification (lint/typecheck/test/build) before being built into images and deployed to
  production, including what blocks a deploy from proceeding.

### Modified Capabilities
(none — no existing spec covers CI/CD yet)

## Impact

- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.
- No application code, database, or runtime behavior changes.
- Once merged, a failing CI run on `main` will block image build/publish/deploy instead of
  only producing a red check that nobody has to act on.
