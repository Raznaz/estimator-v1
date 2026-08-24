## Purpose

Defines how a commit on `main` is verified before it is built into deployable images and
rolled out to production, so that a broken commit cannot reach users unnoticed.

## ADDED Requirements

### Requirement: Deploy blocked on CI failure
The system SHALL NOT build or publish deployment images, nor deploy to production, for a
commit on `main` whose CI verification (lint, typecheck, tests, build) did not complete
successfully.

#### Scenario: CI fails on a main commit
- **WHEN** a commit is pushed to `main` and its CI run (lint/typecheck/test/build) fails
- **THEN** no image build, publish, or production deploy runs for that commit

#### Scenario: CI succeeds on a main commit
- **WHEN** a commit is pushed to `main` and its CI run completes successfully
- **THEN** the image build/publish job runs for that commit, and the deploy job runs
  afterward if `DEPLOY_ENABLED` is set

### Requirement: Manual deploy trigger is an explicit override
The system SHALL allow deploying via manual trigger (`workflow_dispatch`) independent of
the automatic CI gate, since a human operator explicitly chose to deploy that ref.

#### Scenario: Operator manually triggers a deploy
- **WHEN** a user runs the deploy workflow manually from the Actions UI for a given ref
- **THEN** the build and deploy jobs run for that ref without waiting on a `push`-triggered
  CI run
