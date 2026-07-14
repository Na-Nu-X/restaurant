# Architectural Design Document: Evolving the Angular CLI MCP Server

**Title**: Unified Target Execution, Structured Feedback & Generalized Watch Management  
**Status**: Proposed / Architectural Roadmap  
**Author**: Antigravity AI Assistant  
**Target Area**: `packages/angular/cli/src/commands/mcp`

---

## 1. Executive Summary & Problem Statement

The initial implementation of the Angular CLI Model Context Protocol (MCP) server successfully established a secure, programmatic sandbox for AI assistants. However, as AI agent workflows mature, four distinct architectural bottlenecks have emerged:

1. **Tool Proliferation & Schema Bloat**: Hardcoding separate MCP tools (`build`, `test`, `e2e`, `devserver.start`, `devserver.stop`, `devserver.wait`) for individual Angular CLI commands increases the tool registry size. This inflates the system prompt token overhead on every LLM request and forces schema divergence for overlapping flags.
2. **Opaque Workspace Capabilities**: The foundational `list_projects` tool exposes project roots and test frameworks but omits configured architectural targets (e.g., `lint`, `e2e`, `prerender`, `deploy`, `storybook`). This forces AI agents into an inefficient "guess and check" execution pattern.
3. **Unstructured Log Dumping**: The `logs` output across existing tools is currently populated by raw OS stream chunks (`data.toString()`). These chunks contain partial lines, ANSI color escapes, and progress spinner artifacts (`\r`). When JSON-escaped, this raw stream becomes exceptionally difficult and token-heavy for LLMs to parse, undermining the goal of providing structured data.
4. **Fragmented Watch Mode Management**: Watch mode is currently restricted entirely to `ng serve` via the `devserver.*` toolset. There is no generalized mechanism to support long-running watched builds (`ng build --watch`) or watched unit tests (`ng test --watch`), limiting the AI's ability to receive rapid, iterative feedback across different target types.

---

## 2. Proposed Architectural Vision

We propose evolving the MCP server toward a unified, target-driven architecture that mirrors Angular’s native `architect` model (**Workspace ➔ Project ➔ Target ➔ Builder**). 

By pairing declarative target discovery in `list_projects` with a unified `run_target` facade, structured JSON reporters, and a generalized `WatchedTargetManager`, the server will achieve ultimate scalability, massive token savings, and pinpoint diagnostic accuracy across both one-off and long-running execution modes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Declarative AI Workflow                           │
│                                                                          │
│  1. list_projects ──> Returns metadata + targets: ['build', 'test']      │
│  2. Code Edit     ──> AI performs workspace modifications                │
│  3. run_target    ──> { project: 'app', target: 'test', watch: true }    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Target Dispatcher (Strategy Pattern)                   │
│           Inspects target name & builder from angular.json AST           │
└────────────────────┬───────────────┬───────────────┬─────────────────────┘
                     ▼               ▼               ▼
            ┌─────────────────┐┌───────────┐┌──────────────────┐
            │ UnitTestHandler ││E2EHandler ││  BuildHandler    │ ... [Custom]
            └────────┬────────┘└─────┬─────┘└────────┬─────────┘
                     ▼               ▼               ▼
            ┌─────────────────┐┌───────────┐┌──────────────────┐
            │Vitest JSON Parse││Cypress/PW ││Parse Output Path │ ... [Sanitized]
            └────────┬────────┘└─────┬─────┘└────────┬─────────┘
                     ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│            WatchedTargetManager (If watch: true requested)               │
│    Maintains active background processes & broadcasts rebuild events     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Design

### 3.1 Declarative Target Discovery (`list_projects`)
Update `listProjectsOutputSchema` and `loadAndParseWorkspace` in `projects.ts` to extract and expose configured architect targets for each project.

```typescript
// Proposed addition to listProjectsOutputSchema
projects: z.array(
  z.object({
    name: z.string(),
    root: z.string(),
    sourceRoot: z.string(),
    projectType: z.enum(['application', 'library']).optional(),
    unitTestFramework: z.enum(['jasmine', 'jest', 'vitest', 'unknown']).optional(),
    // NEW: Array of available architect target names
    targets: z.array(z.string()).describe('Available architect targets (e.g., ["build", "test", "lint", "e2e"])'),
  })
)
```
* **AI Impact**: Eliminates blind execution. An AI can immediately verify if `e2e` or `lint` is supported before attempting execution.

### 3.2 Stream Sanitization & Structured Reporters
To solve the unstructured log dumping problem, we establish a dual-horizon reporting architecture:

#### Near-Term: Stream Sanitization (`host.ts`)
Modify `executeNgCommand` in `host.ts` to buffer incoming `stdout`/`stderr` streams, split them cleanly by newlines (`\n`), and strip out ANSI color escapes and carriage returns (`\r`). 
```typescript
// Conceptual sanitization buffer
const cleanLogs: string[] = rawStreamBuffer
  .split('\n')
  .map(line => line.replace(/\x1B\[\d+m|\r/g, '').trim())
  .filter(line => line.length > 0);
```

#### Long-Term: Structured JSON Reporters (`test.ts`, `e2e.ts`)
Instead of capturing `stdout` for verification workflows, configure the underlying runners to generate structured JSON summaries. The MCP tool parses the JSON artifact and returns a concise, semantic contract to the LLM:
```json
{
  "status": "failure",
  "summary": {
    "total": 25,
    "passed": 24,
    "failed": 1
  },
  "failures": [
    {
      "spec": "auth.component.spec.ts",
      "test": "should redirect on expired token",
      "errorMessage": "Expected status 302, but received 200."
    }
  ]
}
```

### 3.3 The Unified `run_target` Facade
Deprecate standalone `build`, `test`, and `e2e` tools in favor of a single `run_target` MCP tool declaration.

```typescript
const runTargetInputSchema = z.object({
  workspace: z.string().optional(),
  project: z.string().optional(),
  target: z.string().describe('The architect target to execute (e.g., "build", "test", "lint", "e2e", "deploy")'),
  configuration: z.string().optional().describe('Target configuration (e.g., "development", "production")'),
  options: z.record(z.unknown()).optional().describe('Optional key-value flags to pass to the builder (e.g., { watch: true, instanceId: "preview" })'),
});
```

#### The Strategy Dispatcher (`TargetDispatcher`)
Under the hood, `run_target` implements the Strategy Pattern to route execution based on the target name and underlying builder definition:

1. **`UnitTestStrategy` (Target: `test`)**:
   * Inspects builder (`@angular/build:unit-test` vs Karma).
   * Automatically injects `--headless true` or `--browsers ChromeHeadless`.
   * Attaches JSON reporter and returns structured semantic test results.
2. **`E2EStrategy` (Target: `e2e`)**:
   * Inspects builder (`@cypress/schematic:cypress`, `@playwright/test`).
   * Injects CI/headless execution flags.
   * Parses runner JSON summary and returns structured E2E results.
3. **`BuildStrategy` (Target: `build`)**:
   * Defaults to `development`.
   * Parses output logs for `Output location: (.*)` to return exact artifact paths.
4. **`LintStrategy` (Target: `lint`)**:
   * Injects `--format json`.
   * Parses ESLint output and returns structured file/line error diagnostics.
5. **`GenericStrategy` (Target: Custom / Unknown)**:
   * Executes custom community builders (e.g., `storybook`, `prerender`, `compodoc`).
   * Returns sanitized, line-buffered `stdout`/`stderr`.

---

### 3.4 Generalized Watch Mode Management (`WatchedTargetManager`)
To support long-running, watched execution across all target types (e.g., `ng serve`, `ng build --watch`, `ng test --watch`), we transition from the legacy `devservers` Map to a generalized `WatchedTargetManager`.

We evaluated three architectural approaches for exposing watch mode management to AI agents:

#### Approach 1: The `watchMode` Lifecycle Flag (Single-Tool Encapsulation)
`run_target` remains the exclusive tool, using a `watchMode: 'start' | 'wait' | 'stop' | 'none'` parameter to manage the background lifecycle.
* **Pros**: Absolute minimal tool registry size (exactly one tool).
* **Cons**: Overloads the `run_target` schema. The LLM must understand the stateful `start ➔ wait ➔ stop` sequence via parameter flags.

#### Approach 2: Dedicated Companion Tools (Separation of Concerns)
`run_target` is used purely for spawning (`watch: true`), while two generalized companion tools manage active background jobs.
```
┌──────────────────────────────────────────────────────────────────────────┐
│                   run_target { ..., watch: true }                        │
│         Spawns process & registers in context.watchedTargets Map         │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│             watched_target.wait { project: 'app', target: 'serve' }      │
│           Blocks until active rebuild completes; returns fresh logs      │
├──────────────────────────────────────────────────────────────────────────┤
│             watched_target.stop { project: 'app', target: 'serve' }      │
│                 Terminates background process & cleans Map               │
└──────────────────────────────────────────────────────────────────────────┘
```
* **Pros**: Keeps `run_target` input schema extremely clean. Clear separation of concerns between spawning work and inspecting active background jobs.
* **Cons**: Adds 2 companion tools to the registry (`watched_target.wait`, `watched_target.stop`).

#### Approach 3: MCP Server Push / Notifications (The Reactive Agent Horizon)
Instead of the AI actively polling via a `wait` tool, the server pushes custom MCP notifications (e.g., `notifications/target_watch_event`) containing structured rebuild summaries whenever the OS file watcher triggers a background rebuild.
* **Pros**: True asynchronous elegance. Completely eliminates active polling (`wait_for_build`) and saves significant tool-calling overhead.
* **Cons**: Requires the MCP client (Cursor, Claude Desktop, custom agent runner) to support and react to custom server notifications.

#### Watch Mode Comparative Summary & Architectural Verdict

| Dimension | Approach 1 (`watchMode` Flag) | Approach 2 (Companion Tools) | Approach 3 (MCP Notifications) |
| :--- | :--- | :--- | :--- |
| **Tool Registry Size** | **1 Tool** (Lowest) | **3 Tools** (Moderate) | **1 Tool** (Lowest) |
| **LLM Schema Complexity** | Moderate (Union flags) | **Low** (Clean separation) | **Low** (Clean separation) |
| **Client Compatibility** | **Universal** (All MCP clients) | **Universal** (All MCP clients) | **Restricted** (Requires notification support) |
| **Execution Overhead** | Requires polling (`wait`) | Requires polling (`wait`) | **Zero Polling** (Reactive push) |

**Architectural Recommendation**:  
For immediate compatibility with existing MCP clients (which primarily rely on request/response tool calling), **Approach 2 (Dedicated Companion Tools)** is the most ergonomic and reliable choice. It keeps tool schemas clean while providing a clear, predictable contract for LLMs.

However, the underlying `WatchedTargetManager` should be designed to emit internal event streams. This ensures the server is perfectly positioned to adopt **Approach 3 (MCP Notifications)** as agentic platforms evolve to support reactive notification wakeups.

---

## 3.5 Multi-Instance Watch Mode & Configuration Clobbering
A critical edge case in AI agent workflows is handling multiple watch mode requests for the exact same target (e.g., calling `run_target({ project: 'app', target: 'serve', watch: true })` multiple times with different ports or flags).

To provide an exceptionally ergonomic, self-healing experience, the `WatchedTargetManager` implements a **Smart Hybrid** tracking strategy:

```
┌──────────────────────────────────────────────────────────────────────────┐
│          AI Agent calls run_target { project: 'app', target: 'serve' }   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│              Does active process exist for app:serve:default?            │
└────────────────────┬───────────────────────────────┬─────────────────────┘
                     │ YES                           │ NO
                     ▼                               ▼
┌────────────────────────────────────────┐ ┌───────────────────────────────┐
│     Are requested options identical?   │ │ Spawn fresh process & store   │
└─────────┬────────────────────┬─────────┘ └───────────────────────────────┘
          │ YES                │ NO (e.g. new port/config)
          ▼                    ▼
┌────────────────────┐ ┌───────────────────────────────────────────────────┐
│ Idempotent No-Op   │ │ Graceful Restart (Clobber)                        │
│ Return active URL  │ │ Auto-kill old process & spawn fresh with new flags│
└────────────────────┘ └───────────────────────────────────────────────────┘
```

1. **Default Idempotency (If options match)**: If the AI calls `run_target` again with the *exact same options*, treat it as an idempotent no-op. Return the active process status/address immediately without incurring a restart penalty.
2. **Auto-Clobbering (If options differ)**: If the AI calls `run_target` again with *different options* (e.g., a new port or configuration flag), automatically terminate the old process and spawn a fresh one. This provides seamless self-healing without requiring the LLM to manually call `watched_target.stop`.
3. **Explicit Concurrency (If `instanceId` provided)**: If the AI explicitly provides an `instanceId` in the options (e.g., `instanceId: 'preview'` vs `instanceId: 'e2e'`), isolate the process in the internal map (`workspace:project:target:instanceId`), allowing side-by-side execution of the same target.

---

## 4. Summary of Architectural Advantages

| Metric | Current Architecture | Proposed Architecture (`run_target` + Companion Tools) |
| :--- | :--- | :--- |
| **Tool Registry Size** | Multiple growing tools (`build`, `test`, `e2e`, `devserver.*`) | **Exactly Three Tools** (`run_target`, `watched_target.wait`, `watched_target.stop`) |
| **LLM Prompt Overhead** | High (multiple verbose tool definitions) | **Minimal** (clean, modular tool definitions) |
| **Target Discovery** | Opaque (guess and check) | **Declarative** (exposed via `list_projects`) |
| **Log Parsing Ergonomics**| Poor (JSON-escaped raw stream chunks) | **Excellent** (Structured JSON summaries & clean lines) |
| **Watch Mode Scope** | Restricted to `ng serve` only | **Universal** (supports watched builds, tests, and custom targets) |
| **Multi-Instance Watch**| Idempotent no-op only (rigid) | **Smart Hybrid** (idempotent reuse + auto-clobbering + aliasing) |
| **Extensibility** | Requires new MCP tool code per command | **Instant** (supports all custom builders via generic fallback) |

---

## 5. LLM Ergonomics & Context Window Optimization

Exposing numerous granular tools to an LLM introduces significant technical and cognitive overhead. Evolving to the unified `run_target` design directly optimizes how AI assistants consume the MCP server within their context constraints:

### 5.1 System Prompt Token Footprint
MCP clients inject tool names, descriptions, and JSON parameter schemas directly into the system prompt of every query. A single, highly descriptive tool averages **200 to 500 tokens** of overhead.
* **Granular Architecture (8+ Tools)**: Creates a permanent tax of **1,600 to 4,000 tokens** on every single user query.
* **Unified Architecture (3 Tools)**: Slashes this permanent tax down to **600 to 1,500 tokens** (a **60%+ permanent reduction**), maximizing the remaining context window for actual project files and code analysis.

### 5.2 Attention Window & Selection Accuracy
LLMs utilize attention mechanisms that suffer from **"Lost in the Middle"** retrieval degradation when presented with massive, flat lists of choices (15+ tools). Tool selection accuracy drops significantly in the middle of a long prompt.
Furthermore, exposing overlapping tools (e.g., separate `build`, `test_unit`, `test_e2e`) leads to semantic blur, causing the LLM to hallucinate parameters or select incorrect tools. Collapsing the entire workspace capabilities into exactly three semantically distinct axes (`list_projects` for discovery, `run_target` for execution, `watched_target` for background lifecycles) ensures **near-100% tool selection accuracy** and eliminates parameter clashing.

---

## 6. Execution Roadmap

1. **Step 1**: Update `projects.ts` to include `targets: z.array(z.string())` in the `list_projects` output schema. [**Completed**]
2. **Step 2**: Implement stream line buffering, native VT-stripping, and process deduplication in `host.ts`. [**Completed**]
3. **Step 3**: Implement the `run_target` tool declaration and the base Strategy Dispatcher.
4. **Step 4**: Migrate `build.ts`, `test.ts`, and `e2e.ts` logic into their respective internal Strategy Handlers (`BuildStrategy`, `UnitTestStrategy`, `E2EStrategy`).
5. **Step 5**: Implement `WatchedTargetManager` with the Smart Hybrid tracking strategy (idempotency, clobbering, aliasing).
6. **Step 6**: Implement `watched_target.wait` and `watched_target.stop` companion tools.
7. **Step 7**: Deprecate legacy standalone tool declarations (`build`, `test`, `e2e`, `devserver.*`) from `mcp-server.ts`.
