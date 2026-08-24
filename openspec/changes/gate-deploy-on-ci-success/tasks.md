## 1. Update deploy workflow trigger

- [x] 1.1 In `.github/workflows/deploy.yml`, replace `on.push: branches: [main]` with
      `on.workflow_run: workflows: ["CI"], types: [completed]`, keeping
      `on.workflow_dispatch` unchanged.
- [x] 1.2 Add a filter so the workflow only proceeds for `workflow_run` events on `main`
      (e.g. `github.event.workflow_run.head_branch == 'main'` where relevant, since
      `workflow_run` fires for runs on any branch).

## 2. Gate the build job on CI success

- [x] 2.1 Add an `if` condition to the `build` job so it only runs when either the event is
      `workflow_dispatch`, or it's `workflow_run` with
      `github.event.workflow_run.conclusion == 'success'`.
- [x] 2.2 Update `actions/checkout` in the `build` job to check out
      `github.event.workflow_run.head_sha` when triggered by `workflow_run` (falling back to
      the default ref for `workflow_dispatch`).
- [x] 2.3 Update image tags (currently `${{ github.sha }}`) to use the resolved commit SHA
      consistently across both trigger types.

## 3. Verify

- [ ] 3.1 Push a branch/commit that fails CI (e.g. a deliberate lint error) to `main` (or a
      test branch protected the same way) and confirm `deploy.yml` does not run its
      build/deploy jobs.
- [ ] 3.2 Fix the failure, confirm `ci.yml` goes green, and confirm `deploy.yml` then runs
      automatically via `workflow_run` and builds/publishes images for the correct commit.
- [ ] 3.3 Manually trigger `deploy.yml` via `workflow_dispatch` and confirm it still runs
      independent of any `workflow_run` event.

## 4. Documentation

- [x] 4.1 Update the inline comments in `deploy.yml` describing the trigger (currently says
      "при push в main и вручную из UI") to reflect the new `workflow_run`-gated behavior.
