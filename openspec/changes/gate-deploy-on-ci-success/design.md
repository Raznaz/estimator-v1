## Context

`ci.yml` and `deploy.yml` both trigger on `push: branches: [main]` as separate workflows
with no relationship between them (see proposal.md - Why). `deploy.yml` also has a second
trigger, `workflow_dispatch`, for manual redeploys from the Actions UI.

## Goals / Non-Goals

**Goals:**
- A commit that fails CI on `main` cannot reach the `build`/`deploy` jobs in `deploy.yml`
  via the automatic `push` path.
- Manual `workflow_dispatch` deploys keep working without depending on a `push`-triggered
  CI run existing for the target ref.
- No change to what CI checks or how it runs.

**Non-Goals:**
- Branch protection / required-status-checks configuration on `main` (a GitHub repo
  setting, not a workflow file change; out of scope here but worth doing separately if
  direct pushes to `main` are possible).
- Automatic rollback on failed post-deploy health check (existing known gap, not addressed
  by this change).
- Changing what `ci.yml` checks or its trigger set.

## Decisions

**Gate `deploy.yml`'s `push`-triggered run on `ci.yml`'s result via `workflow_run`.**

`deploy.yml`'s `on.push` trigger is replaced with `on.workflow_run` on the `CI` workflow
(`types: [completed]`, filtered to `branches: [main]`). The `build` job gets an `if`
condition requiring `github.event.workflow_run.conclusion == 'success'` when the run was
triggered by `workflow_run`, and images are built from `github.event.workflow_run.head_sha`
(not `github.sha`, which is unset/wrong under `workflow_run`). The `workflow_dispatch`
trigger is left untouched, so manual deploys are unaffected and always allowed to run.

Alternatives considered:
- **Merge `ci.yml`'s job into `deploy.yml` as a leading job, `build`/`deploy` via
  `needs: check`.** Rejected: `ci.yml` also runs on `pull_request`, and folding it into
  `deploy.yml` would either duplicate the check job across two files or drag
  deploy-specific permissions/secrets context into PR runs. Keeping them as separate
  workflow files with a `workflow_run` link preserves the existing PR-check behavior
  untouched.
- **Rely solely on GitHub branch protection (required status checks).** Rejected as the
  sole fix: it only stops merges through the GitHub UI/PR flow, not a direct `git push` to
  `main` by anyone with write access. Still worth adding separately, but doesn't replace a
  workflow-level gate.

## Risks / Trade-offs

- **`workflow_run` uses a different event payload** (`github.event.workflow_run.head_sha`
  instead of `github.sha`, `github.ref` instead of the pushed ref in some fields) →
  Mitigation: explicitly reference `github.event.workflow_run.head_sha` for checkout and
  image tags in the `build` job; verify with a test push before relying on it.
- **`workflow_run` adds a small delay**: deploy no longer starts until `ci.yml` fully
  finishes, instead of racing it → acceptable, this delay is the entire point of the fix.
- **Manual `workflow_dispatch` still bypasses CI entirely** by design (Requirement: Manual
  deploy trigger is an explicit override) → operator is trusted to know what they're
  deploying; not treated as a gap here.

## Migration Plan

1. Update `deploy.yml`: replace `on.push` with `on.workflow_run` (workflows: `["CI"]`,
   types: `[completed]`), add the success-conclusion `if` guard, switch checkout/tag refs
   to `github.event.workflow_run.head_sha`.
2. Push a small test commit that intentionally fails CI (e.g., a lint error) on a branch,
   verify no deploy run starts; then fix it and verify the deploy run starts once CI goes
   green.
3. No rollback needed beyond reverting the workflow file if `workflow_run` behaves
   unexpectedly — no runtime/production state is touched by this change.
