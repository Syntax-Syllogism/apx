---
title: Plugin architecture
description: Ownership and compatibility boundaries between the APX CLI plugin and apx-core.
---

The APX plugin pins `@syntax-syllogism/apx-core` to exactly `0.3.0`. Each command is a thin adapter over one of core's use cases: flags → options → use case → core renderer. Core owns the shared generation and dead-code functionality, option schemas and validation, and user-facing result text; this repository owns the Salesforce CLI interface.

## Where changes belong

| Area | Owner |
| --- | --- |
| Use cases (`plan`/`apply`, `run`), option schemas and validation messages, and renderers for generation results and the dead-code report | `apx-core` |
| Describe conversion, naming, path layout, plan builders, templates, generation engine, and generation model types | `apx-core` |
| Output-base and API-version helpers, shared defaults and validators | `apx-core` |
| Class inventory, binding scans, dependency graph, entry-point detection, classification, and destructive manifest rendering/writing | `apx-core` |
| Flag → option mapping, connection selection, dry-run mapping, and CLI output routing | `src/adapters/` and `src/commands/apx/` |
| Salesforce CLI flags and message loading | `src/aep/flags.ts` and `messages/` |
| Interactive input, confirmation, TTY checks, and CLI required-input checks | `src/aep/prompting.ts` and `src/aep/commandSupport.ts` |
| Core error translation and compatibility wrappers | `src/aep/apxCommand.ts` and `src/aep/errors.ts` |

The former plugin directories `src/aep/{describe,engine,model,naming,paths,plan,templates}` and `src/dead/` have been removed. Change shared behavior in core, release it, and deliberately upgrade the plugin's exact dependency pin and lockfile. The core package's README describes its public exports; templates are internal to core.

## CLI boundary

Commands own `Org` resolution, authentication refresh, and connection selection. Core accepts caller-supplied connections and does not authenticate. The describe commands refresh auth before obtaining the selected connection; `dead` also refreshes before querying. Service generation can run without an org. See [Command details](command-details.md#describe-and-api-version) for API-version precedence.

The plugin calls core's output-base helper without an explicit project root: relative output paths resolve against the current Salesforce project, while absolute paths are used directly. Generation commands call `runGeneration` (`src/adapters/generation.ts`): it maps flags with `toOptions` (`src/adapters/options.ts`), validates them with the use case's schema, connects only when the descriptor's `requiresOrg` allows it, and calls `plan`. `--dry-run` maps the plan to `wouldCreate` (absolute paths) without writing; otherwise `apply` runs with `overwrite: 'overwrite'`. Core also supports `'skip'`, but the CLI does not expose it. Human output comes from `renderGenerationResult`.

`toOptions` keeps three CLI rules out of core: `--at4dx`/`--fflib` map to `flavor` through `requireExactlyOneFlavor` and `resolveFlavor`, `--fields` is split on commas, and `generate action` keeps its `10.2` order default. `test/adapters/parity.test.ts` fails when a schema key has no flag or an option flag has no schema key.

All commands extend `ApxCommand`, whose catch handler translates intentional core errors to the CLI's previous error shapes. `toCliError` preserves messages, maps the test-pairing invariant to `SfError`, and otherwise restores plain errors or original describe causes as appropriate. Core error codes and structured data are not generally exposed as new CLI JSON fields.

Core validates options with zod. `parseOptionsForCli` turns the first validation issue into the `SfError` the CLI printed before. Two more wrappers preserve details that core would otherwise change:

- `withCliDescribeErrors` wraps the connection passed to a use case, captures `describeSObject` failures, and rethrows the original Salesforce API failure, including `NOT_FOUND` payloads, because core's not-found error omits the original cause. Successful describe conversion still runs in core.
- `writeDeadCodeManifestForCli` unwraps core's `write-failed` cause so manifest filesystem failures retain their previous CLI error details.

Keep these adapters in mind when upgrading core; removing them requires checking human and JSON error compatibility. `apx dead` runs core's `dead` use case, writes the manifest with `writeDeadCodeManifest` unless `--dry-run` is set, and prints `renderDeadCodeReport`. `splitDeadReport` (`src/adapters/dead.ts`) sends the report's warnings to `this.warn` (stderr) and every other line to `this.log`; tables use core's plain-text layout. Its safety rules are described in [Dead-code analysis](dead-code.md).

## Compatibility checks

The plugin retains golden-plan and formatting tests in `test/aep/planBuilders.test.ts` and `test/aep/apexFormatting.test.ts`, with unchanged fixtures under `test/fixtures/aep/golden/`. Domain unit tests for naming, templates, the engine, and classification live in core.

Plugin boundary coverage includes `test/adapters/` for option mapping, validation text, report splitting and descriptor/flag parity, `test/commands/apx/core-cutover.test.ts` for auth/connection ordering and API versions, `test/aep/errors.test.ts` for CLI error translation, command tests under `test/commands/apx/`, and interactive tests. Run the relevant tests for a boundary change and `yarn test` for the plugin gate. For command/help changes, `yarn version` regenerates README and CLI references; `yarn docs:cli-reference` regenerates only the [CLI reference](cli-reference.md).

The NUTs (`NUT_AEP_ENABLE=true yarn test:nuts`) exercise the org-free generators through `bin/run.js` and need no org. Before/after human and JSON comparisons of the org-backed commands and a linked-plugin smoke test require an authenticated test org. These checks were skipped during the unattended cutovers and remain recorded in the work items; automated tests do not establish live-org parity.

The scoped registry mapping in `.npmrc` supports the GitHub Packages-only docs theme. The core lockfile entry uses public npm. When upgrading core, use a temporary public npm scoped-registry override for that dependency operation, as documented in `.npmrc`, and retain the docs-theme mapping.
