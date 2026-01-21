# xyOps AI Coding Agent Instructions

## Project Overview
xyOps is a unified automation platform (job scheduler, workflow engine, monitoring, alerting, ticketing) built on **pixl-server**, a Node.js framework. Key goal: integrate all components into a cohesive feedback loop where events, jobs, monitors, and alerts interconnect seamlessly.

**Architecture layers:**
- **Engine** (`lib/engine.js`): Core job/workflow execution, scheduling, and state management
- **API** (`lib/api/*.js`): REST endpoints via pixl-server-api; routes requests through session auth
- **Job System** (`lib/job.js`): Event→Job launch, merges category/plugin defaults, manages execution limits and actions
- **Workflow Engine** (`lib/workflow.js`): JEXL-based expression evaluation; node execution model for DAG workflows
- **Actions** (`lib/action.js`): Post-job notifications (email, webhooks, events, tickets, snapshots)
- **Storage** (`unbase` + `storage` components): Key-value store for objects; search via Unbase
- **Communication** (`lib/comm.js`): WebSocket real-time updates to UI; socket abstraction layer

## Common Patterns & Conventions

### Class Structure
- **Mixins via `pixl-class-util`**: Core engine mixes in separate concerns (Job, Workflow, Action, Server, etc.) into main server class
- **Logging**: `this.logDebug(level, msg, data)`, `this.logError(component, msg)`; dedicated pseudo-component strings ('Job', 'Workflow', 'Action', 'Comm')
- **Configuration**: `this.config.get('path.to.key')`, multi-config files via loader (config.json, sso.json, ui.json, intl.json, unbase.json)

### API Pattern
```javascript
api_endpoint_name(args, callback) {
  // args.params, args.query, args.request, args.files
  // Load session → check user permissions → do work → callback({ code: 0, ...data })
  this.loadSession(args, (err, session, user) => {
    if (!this.requireValidUser(session, user, callback)) return;
    // ... business logic
    callback({ code: 0, results });
  });
}
```

### Job Lifecycle
- Job ID auto-generated: `Tools.generateShortID('j')`
- **State transitions**: queued → active → complete (or failed/timeout)
- **Action conditions**: 'success', 'failure', 'timeout', 'tag:*' for conditional post-processing
- **Category merges**: Actions & limits from category appended to job.actions/limits before launch

### Workflow Node Execution
- **Node types**: trigger, action, condition, wait, monitor, parallel, etc.
- **Expression evaluation**: JEXL (JavaScript Expression Language) with custom functions: `min()`, `max()`, `bytes()`, `number()`, `pct()`, `find()`, `count()`
- **Data flow**: `details.input.data` passes through nodes; sub-job output stored in `details.wfJobData[node_id]`
- **State tracking**: `workflow.state = {}` holds node states; `workflow.jobs = {}` holds sub-job references

## Important Notes
- **No direct data mutations**: Use `Tools.mergeHashes()`, `Tools.copyHash()` to avoid reference bugs
- **Async patterns**: `async.eachLimit()` with configured concurrency for batch operations
- **WebSocket state**: Socket `metadata` tracks timing; disconnect/reconnect handled gracefully
- **Expression limits**: JEXL expressions run synchronously (`jexl.evalSync()`); avoid long-running code in `{{...}}`
- **Permissions**: Most API endpoints require valid session + user validation via `this.requireValidUser()`

## File/Path Conventions
- **Config overrides**: `XYOPS_component_setting_name` env var (note single underscore between component and setting)
- **Storage keys normalized**: `this.storage.normalizeKey()` converts to lowercase, removes special chars
- **Symlink convention**: `node_modules/pixl-*` → `htdocs/`; shared utilities linked from pixl-webapp
- **Log files**: `logs/Error.log` (dedicated error log), per-component debug output

## Key Files to Know
- `lib/main.js`: Entry point, checks Node.js version ≥ 16
- `lib/loader.js`: Initializes pixl-server + components (Storage, Unbase, Web, API, User, Debug, xyOps)
- `lib/engine.js`: Main component; earlyStart hooks, manages active jobs/alerts/tokens
- `lib/api.js`: API namespace setup; intercepts all requests (cache-bust removal)
- `lib/server.js`: Server connection/validation logic; merges existing data on reconnect
- `sample_conf/config.json`: Config template with job/workflow/category/server defaults
- `docs/dev.md`: Development dependencies and workflows

## Build & Development Workflow
- **Build modes**: `node bin/build.js dev` (unminified, separate files) or `node bin/build.js dist` (minified, bundled)
- **Steps defined in** `internal/setup.json` → `build-tools.js` executes actions (symlink, compress, bundle)
- **Test harness**: `npm test` runs `pixl-unit test/test.js`; test suites in `test/suites/test-*.js`; setup/teardown removes test data directories
- **Dev debugging**: `npm debug` or `bin/debug.sh` for local debugging; Chrome DevTools via pixl-server-debug component

### Utility Patterns
- **Message substitution**: `this.messageSub(text, data)` replaces `{{jexl_expression}}` with evaluated values
- **Filename safety**: `this.cleanFilename()` for file operations, `this.cleanURLFilename()` for URLs
- **Multi-user load**: `this.loadMultipleUsers(usernames, callback)` returns array (no error on missing users)
- **Array comparison**: `this.isArrayDiff(a, b)` via SHA256 digest (ignores order)

## Critical Data Flows
1. **Event → Job → Actions**: Event triggered → Job launched with merged category/plugin config → Post-execution actions fire based on job condition (success/failure/timeout)
2. **Workflow Execution**: Start node → JEXL evaluates node conditions → Next nodes queued → Sub-jobs spawned and awaited
3. **Real-time Updates**: WebSocket broadcasts state changes (job progress, alerts) to connected clients
4. **Storage Pattern**: `this.unbase.get/update/search('table_name', key, ...)` for database ops; `this.storage.normalizeKey()` for safe storage keys