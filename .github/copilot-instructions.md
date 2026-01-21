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
- __Data flow__: `details.input.data` passes through nodes; sub-job output stored in `details.wfJobData[node_id]`
- **State tracking**: `workflow.state = {}` holds node states; `workflow.jobs = {}` holds sub-job references

## Important Notes

- **No direct data mutations**: Use `Tools.mergeHashes()`, `Tools.copyHash()` to avoid reference bugs
- **Async patterns**: `async.eachLimit()` with configured concurrency for batch operations
- **WebSocket state**: Socket `metadata` tracks timing; disconnect/reconnect handled gracefully
- **Expression limits**: JEXL expressions run synchronously (`jexl.evalSync()`); avoid long-running code in `{{...}}`
- **Permissions**: Most API endpoints require valid session + user validation via `this.requireValidUser()`

## File/Path Conventions

- __Config overrides__: `XYOPS_component_setting_name` env var (note single underscore between component and setting)
- **Storage keys normalized**: `this.storage.normalizeKey()` converts to lowercase, removes special chars
- __Symlink convention__: `node_modules/pixl-*` → `htdocs/`; shared utilities linked from pixl-webapp
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

- __Message substitution__: `this.messageSub(text, data)` replaces `{{jexl_expression}}` with evaluated values
- **Filename safety**: `this.cleanFilename()` for file operations, `this.cleanURLFilename()` for URLs
- **Multi-user load**: `this.loadMultipleUsers(usernames, callback)` returns array (no error on missing users)
- **Array comparison**: `this.isArrayDiff(a, b)` via SHA256 digest (ignores order)

## Critical Data Flows

1. **Event → Job → Actions**: Event triggered → Job launched with merged category/plugin config → Post-execution actions fire based on job condition (success/failure/timeout)
2. **Workflow Execution**: Start node → JEXL evaluates node conditions → Next nodes queued → Sub-jobs spawned and awaited
3. **Real-time Updates**: WebSocket broadcasts state changes (job progress, alerts) to connected clients
4. __Storage Pattern__: `this.unbase.get/update/search('table_name', key, ...)` for database ops; `this.storage.normalizeKey()` for safe storage keys

## Common Development Recipes

### Adding a New API Endpoint

1. Create method in `lib/api/domain.js` following pattern: `api_<action>_<resource>(args, callback)`
2. Load session: `this.loadSession(args, (err, session, user) => { ... })`
3. Validate user: `if (!this.requireValidUser(session, user, callback)) return;`
4. Fetch from storage: `this.storage.get('resource/' + id, (err, data) => { ... })`
5. Return: `callback({ code: 0, resource: data })` or `this.doError('error_key', 'message', callback)`
6. Add test in `test/suites/test-domain.js` with PixlRequest: `this.request.post('http://localhost:5522/api/app/action_resource', {...})`

**Key validation methods:**
- `this.requireParams(params, {id: /regex/}, callback)` — validates param format
- `this.requireMaster(args, callback)` — ensures running on master server
- `this.requirePrivilege(user, 'privilege_name', callback)` — checks user ACL

### Implementing a Custom Workflow Node Type

1. Add node type definition in `sample_conf/config.json` under `workflow_node_types`
2. Implement handler in `lib/workflow.js`: `runWFNode_<type>(opts)` method
3. Access input: `opts.job.workflow.nodes`, output stored in `details.wfJobData[node.id]`
4. Queue next nodes: Call `this.runWorkflowNode({ job, node: nextNode })`
5. Evaluate JEXL expressions on node data: `jexl.evalSync(expression, context)`
6. Example custom node at line ~800+ in `lib/workflow.js` showing state/output handling

**Node structure:**
```javascript
{
  id: "node_1",
  type: "action|condition|wait|parallel",
  title: "Node Title",
  config: { /* node-specific settings */ },
  outputs: { success: "node_2", failure: "node_3" }
}
```

### Debugging Job Execution

1. Enable verbose logging: Set `debug_level: 9` in `conf/config.json`
2. Tail logs: `tail -f logs/Job.log logs/Workflow.log logs/Error.log`
3. Check active jobs: API endpoint `GET /api/app/get_jobs?offset=0&limit=100`
4. Inspect job details via storage CLI: `node bin/db-cli.js "get('jobs/j_xxxxx')"`
5. For satellites: Check `jobs/` key with satellite hostname prefix, verify WebSocket connection health via `/health` endpoint
6. **Job stuck?** Check `job.timeout` vs `config.dead_job_timeout` (default 120s); review action conditions

## Frontend Integration & Real-Time Communication

**UI Framework**: [pixl-xyapp](https://github.com/pixlcore/pixl-xyapp) (custom Vue-like framework in `htdocs/js/`)

**WebSocket Communication** (via `lib/comm.js`):
- Server broadcasts events: `this.comm.broadcast('event_type', data)`
- Client subscribes: `comm.on('event_type', handler)`
- Metadata tracks socket state: `socket.metadata = { connected_time, ip, ...}`
- On reconnect, server merges existing job/alert state automatically

**Frontend Files**:
- `htdocs/js/app.js`: Main app initialization, route handling
- `htdocs/js/comm.js`: WebSocket abstraction, event emission
- `htdocs/js/utils.js`: Shared client-side utilities
- `htdocs/js/pages/`: Individual page/view components

**Sending state to UI**: Use broadcast keys like `jobs_update`, `alerts_update`, `status_update` (referenced in `lib/engine.js` tick handlers)

## Plugin System & Extensibility

**Plugin Loading** (via `lib/api/plugins.js`):
- Plugins loaded from `conf/plugins/` directory or npm packages
- Each plugin exports: `{ run: (job, callback) => {...}, config: { title, description, ... } }`
- **Sandbox isolation**: Plugins run in child process via `child_process` or inline (if `plugin.inline: true`)

**Plugin Execution Flow**:
1. Job specifies `plugin: 'plugin_id'`
2. Engine loads plugin config via `this.plugins` array
3. Spawns plugin process or calls inline with job data
4. Captures stdout/stderr, stores logs in job output
5. Plugin exit code determines job success/failure

**Custom Plugin Template**:
```javascript
module.exports = {
  run: function(job, callback) {
    // job.data contains input parameters
    // Return via callback(err, result)
    callback(null, { status: 'success', output: 'data' });
  },
  config: {
    title: "My Plugin",
    description: "Does something useful",
    params: { /* UI form schema */ }
  }
};
```

## Alert & Monitor Lifecycle

**Monitor Flow**:
1. Monitor definition stored in `monitors/` (SQL-like queries on metrics)
2. Scheduled check via `schedule.checkEvents()` → calls monitor query
3. Evaluates JEXL threshold expression (e.g., `cpu_avg > 80`)
4. If threshold met: Creates or updates `activeAlerts` entry
5. Triggers actions (email, webhook, ticket) based on alert conditions
6. Auto-clears when threshold no longer met

**Complex Alert Conditions**:
- Use JEXL functions: `max(metric_array)`, `count(items)`, `find(items, expression)`
- Example: `count(servers_down) > 3 && avg(response_time) > 1000`
- Stored in `alert.condition` field; evaluated via `jexl.evalSync()`

**Alert State Tracking**:
- `activeAlerts` holds live alerts in memory
- Each alert: `{ id, monitor, server, value, timestamp, acknowledged }`
- Persisted to storage on state change
- Clear via alert action or manual acknowledge

## Storage & Data Queries

**Storage Key Patterns**:
- Events: `events/<event_id>`
- Jobs: `jobs/<job_id>`
- Monitors: `monitors/<monitor_id>`
- Alerts: `alerts/<alert_id>`
- Users: `users/<username>`
- Sessions: `sessions/<session_id>`

**Querying Examples**:
```javascript
// Get single object
this.storage.get('events/my_event', (err, event) => {...})

// Search with Unbase (database layer)
this.unbase.search('jobs', { state: 'complete', tags: { $contains: 'important' } }, (err, results) => {...})

// List all keys under prefix (for pagination)
this.storage.listFind('jobs/', { offset: 0, limit: 100 }, (err, keys) => {...})

// Batch operations with concurrency control
async.eachLimit(keys, this.storage.concurrency, (key, callback) => {
  this.storage.get(key, callback);
}, finalCallback);
```

**Always normalize keys**: `key = this.storage.normalizeKey(userInput)` before use

## Environment Variables & Configuration

**Key env var patterns** (prefix `XYOPS_`):
- `XYOPS_config_debug_level=9` → Override `config.debug_level`
- `XYOPS_sso_enabled=true` → Override nested SSO settings
- `XYOPS_mail_settings_host=smtp.example.com` → Deep path override
- `XYOPS_config_overrides_file=conf/overrides.json` → Load entire config file

**Config file hierarchy** (loaded by `lib/loader.js`):
1. `conf/config.json` (main, user-editable)
2. `conf/sso.json` (SSO settings)
3. `internal/unbase.json` (database schema)
4. `internal/ui.json` (UI locale/translation strings)
5. `internal/intl.json` (internationalization)
6. Env var overrides applied last

## Testing Strategy & Quality

**Test execution**:
```bash
npm test                    # Full suite
npm test -- --grep "job"    # Filter tests
npm debug                   # Debug mode in Node
```

**Test structure** (from `test/test.js`):
- setUp/tearDown clean data dirs (`test/logs`, `test/data`, `test/temp`)
- Each domain has separate suite file: `test/suites/test-events.js`, `test/suites/test-jobs.js`, etc.
- PixlRequest for HTTP calls; mock storage via overrides in `test/fixtures/overrides.json`
- Tests verify API responses, state transitions, edge cases

**Before committing**:
1. Run `npm test` and verify all pass
2. Update `CHANGELOG.md` for user-facing changes
3. Document config/data model changes in commit message
4. Reference issue number: "Fixes #123"

## Performance & Scaling Considerations

- **Job concurrency**: `max_jobs_per_min` in config controls queue rate
- **Satellite distribution**: Jobs routed to satellites via tags/categories for load balancing
- **Memory limits**: `NODE_MAX_MEMORY` env var (default 4096 MB) in `bin/control.sh`
- **Storage backend**: Supports SQLite (default) or external backends via pixl-server-storage
- **Unbase indexes**: Define in `internal/unbase.json` for fast searches on frequently-queried fields

## ⚠️ Critical Complexities & Common Pitfalls

### Job State Duality: `activeJobs` vs `jobDetails`

Jobs maintain TWO separate state objects — this is a **frequent source of bugs**:

```javascript
this.activeJobs[job.id]           // Synced to clients every tick (UI updates)
this.jobDetails[job.id]           // Local-only: workflow state, logs, outputs
```

**Rule:** Always write workflow/execution data to `jobDetails`, never directly modify `activeJobs` workflow state. Race condition: client uses stale `activeJobs.workflow` while server updates `jobDetails.wfJobData`.

### Workflow State Hierarchy: 3 Nested Levels

Workflow state tracked in THREE places — access wrong one = undefined:

```javascript
job.workflow.state[node_id]           // Node execution status
job.workflow.jobs[sub_job_id]         // Sub-job references  
details.wfJobData[node_id]            // Node output data (source of truth for conditions)
```

When adding workflow node types: Read output from `this.jobDetails[job.id].wfJobData`, write results there, NOT to `activeJobs`.

### Server Selection Race Condition

Jobs assigned to satellites with TOCTOU bug:
```javascript
if (server.state !== 'ready') return;  // Check at T=0
// ... 100ms network delay ...
launchJobOnServer(job, server);        // Use at T=100ms (server may be down now!)
```

**Fix:** Re-check server state inside `launchJobOnServer()` before actual spawn.

### Job Limits × Satellite Distribution = Broken Guarantees

Job limits enforced LOCALLY on master, but jobs run on SATELLITES:
- If satellite disconnects, job count not cleaned up
- Reconnect causes double-counting of limits
- Rate limiting becomes unreliable

**Fix on satellite disconnect:** Purge jobs from activeJobs count, retry or mark failed.

### Action Deduplication Silent Failures

Actions deduped by MD5 hash of JSON.stringify, but:
```javascript
// These produce different JSON strings (key order):
{ email: "x@y.com", subject: "Failed" }
{ subject: "Failed", email: "x@y.com" }
// Different hashes → dedup fails → action fires twice
```

**Fix:** Normalize action object to consistent key order before hashing.

### WebSocket State Merge on Reconnect

Stale client state can overwrite current server state on reconnect:
```
T=0s:  Client sees job.state = 'running'
T=5s:  Network loss; job actually completes on server
T=10s: Client reconnects with old state
→ Job marked 'running' again despite being done!
```

**Fix:** Use server timestamp precedence; server state wins if newer.

### JEXL Expressions Silent Failures

Syntax errors in `{{expression}}` silently fail:
```javascript
// ❌ WRONG
"{{metric.value > 100}}"  // If metric.value undefined → expression fails silently

// ✅ RIGHT  
// Use safe property access in JEXL context
"{{(metric.value || 0) > 100}}"
```

### Common Mistakes Checklist

- ❌ Forgetting `this.loadSession()` in API endpoint → user undefined
- ❌ Blocking I/O in plugins (`fs.readFileSync()`) → event loop blocked
- ❌ Not normalizing storage keys → `storage.normalizeKey(input)` required
- ❌ Accessing workflow state from wrong location (state vs jobs vs wfJobData)
- ❌ Trusting server state hasn't changed between check and job launch