# Repository Workflow

This document describes the standard workflow for working in this repo.

## Branching

- main: stable releases only (protected)
- develop: integration branch for ongoing work
- feat/*: new features
- fix/*: bug fixes
- chore/*: maintenance and tooling
- hotfix/*: urgent fixes branched from main

## Commits and Releases

- One logical change per commit.
- Use short, descriptive commit messages.
- Tag releases as vX.Y.Z.

## Pull Requests and Reviews

- All changes go through PRs.
- Include a concise description and a quick checklist:
  - Tests run (or explain why not)
  - Config changes documented
  - Migrations or data changes noted
- Require at least 1 reviewer.
- No direct pushes to main.

## CI Expectations

- Lint, tests, and build run on every PR.
- Blocking checks must pass before merge.
- Release tags produce build artifacts.

## Configs and Secrets

- Keep config templates in sample_conf/.
- Keep secrets out of the repo (use env vars or secret storage).

## Documentation

- README: quick start only.
- Detailed docs live in docs/.
- Update CHANGELOG.md for user-facing changes.
