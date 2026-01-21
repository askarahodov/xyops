# Contributing

Please read our **[Contributing Guide](https://github.com/pixlcore/xyops/blob/main/CONTRIBUTING.md)** before submitting a pull request.

TL;DR; we do not accept feature PRs, but there are **lots** of other ways you can contribute!  See the guide for details.

Thank you for helping us improve xyOps!

---

## xyOps Code Review Checklist

**Developers**: Please verify all boxes before submitting. **Reviewers**: Use this as your verification checklist.

### Architecture & Critical Issues
- [ ] Job state changes go to `jobDetails.wfJobData`, NOT `activeJobs.workflow`
- [ ] No `fs.readFileSync()` in lib code (use async versions)
- [ ] Storage keys normalized with `this.storage.normalizeKey()`
- [ ] API endpoints include `this.loadSession()` for auth
- [ ] Server state checked at point of use (avoid TOCTOU)
- [ ] No silent JEXL expression failures

**Reference**: [docs/AI_AGENT_ANALYSIS.md](../../docs/AI_AGENT_ANALYSIS.md) - See 6 Critical Issues

### Code Quality
- [ ] Session validation: `this.loadSession(args, (err, session, user) => {...})`
- [ ] Permission check: `this.requireValidUser(session, user, callback)`
- [ ] No direct mutations: Uses `Tools.copyHash()` / `Tools.mergeHashes()`
- [ ] Async patterns: Proper error handling in callbacks
- [ ] Workflow hierarchy respected (state → jobs → wfJobData)

### Testing & Documentation
- [ ] Tests added for new functionality
- [ ] CHANGELOG.md updated (if user-facing)
- [ ] Comments explain complex logic
- [ ] Config changes documented

**Quick Reference**: [docs/QUICK_REFERENCE_AI.md](../../docs/QUICK_REFERENCE_AI.md)
