---
title: Command details
description: Naming, flavor, and metadata rules for APX generation commands.
---

Deeper logic notes for how apx builds its generation plans. Flag-by-flag
reference lives in the [README](https://github.com/Syntax-Syllogism/apx/blob/v0.3.0/README.md#commands) and in each command's
`--help` output; this doc covers the naming, flavor, and metadata rules that
don't fit in a flag summary.

Use [Interactive generation](interactive-mode.md) for the guided `-i` input
flow. The rules below apply after either prompts or flags have resolved the
command inputs.

## Flavor selection (`--at4dx` / `--fflib`)

SObject-based generation commands (`generate`, `domain`, `selector`,
`service`, and `unitofwork`) require exactly one of `--at4dx` or `--fflib`.
In flag-only mode, passing both or neither is rejected before generation. With
`-i`, the flavor is collected by a single-select prompt and the same exactly-one
rule is enforced after prompting. The flavor selects the template set used for
every artifact in the plan: interface/implementation shape, base-class
references, and binding metadata format all differ between fflib and AT4DX.
`action`, `criteria`, `selector method`, and `selector field-injection` are
AT4DX-only offline commands and do not expose flavor flags.

One asymmetry to know about: `apx generate unitofwork --fflib` does **not**
write a binding file. fflib has no unit-of-work binding metadata concept —
instead the command prints the `Application` factory snippet you need to add
by hand (the SObjectType to register), and returns an empty `created`/`skipped`
array with that snippet under `manualSteps` in the JSON result. Only
`--at4dx` writes an actual `unitOfWorkBinding` artifact.

## Naming and the `--prefix` flag

Class names are derived from the SObject API name, not typed in directly.
`--prefix` (when given) is upper-cased and joined with `_` ahead of the base
name — e.g. `--prefix foobar` on `Property__c` produces `FOOBAR_Properties`
for the domain class rather than `Properties`. The SObject API name has any
existing leading prefix stripped first (case-insensitively) so re-running
generation with the same prefix doesn't double it up, `__c` and underscores
are removed, and the result is pluralized for selector/domain class base
names (`Account` → `Accounts`).

Interfaces get an `I` inserted after the prefix (`FOOBAR_IProperties`), and
unit test classes get a `Test` suffix, truncated so the total stays within
Apex's 40-character type-name limit.

Service commands (`generate service`) use `--service-basename` directly
instead of describing an SObject — there's no org round-trip or required
`--target-org`, and no pluralization, since a service isn't tied to one object.

## Aggregate generation (`apx generate`)

The bare `generate` command combines `buildSelectorPlan`, `buildDomainPlan`,
and `buildUnitOfWorkPlan` from a single SObject describe. At least one of
`--selector`, `--domain`, `--unit-of-work` must be set, or the command
errors before making any org call. All three (when selected) share the same
`--prefix`, `--at4dx`/`--fflib` flavor, and `--output-path`; `--binding-sequence`
only affects the unit-of-work artifact and only when `--at4dx` is selected.

## Binding sequence (`--binding-sequence` / `-b`)

Only meaningful for AT4DX unit-of-work bindings. If omitted it defaults to
`1000.0`. This value controls ordering when multiple SObjects register with
the same `Application` factory — lower values bind earlier. There's no
validation on the format beyond what AT4DX's own metadata expects; pick a
value that fits your existing sequence.

## Offline domain-process generation (`action` / `criteria`)

`apx generate action` and `apx generate criteria` don't describe an org —
they build a `DomainProcessBinding` custom metadata record entirely from
flags:

* `--order` defaults to `10.2` for `action` and `10.1` for `criteria`, and
  must match `\d+(\.\d+)?` (e.g. `10`, `10.1`, `10.20`) — anything else is a
  validation error before any files are written.
* `--process-name` is optional. When set, the binding's developer name
  becomes `<processName><order-with-dots-as-underscores><Type>` (e.g.
  `FishCompanySlogans10_20Criteria`). When omitted, the developer name falls
  back to the class name itself.
* Custom metadata record names are capped at 40 characters
  (`isWithinCustomMetadataNameLimit`). If the computed developer name would
  exceed that, the command errors out rather than silently truncating —
  shorten `--process-name` or the class name.
* `--description` is escaped for XML (`&`, `<`, `>`) before being written
  into the metadata file, so you can pass ordinary prose without worrying
  about breaking the generated XML.
* `--trigger-operation` is validated against the AT4DX enum
  (`Before_Insert` … `After_Undelete`) at parse time via `options`.

These commands never require `--target-org` — they only need the SObject
API name as a string for the generated class's method signatures, so they
work even against SObjects that don't exist yet in any org.

## Selector field injection (`selector field-injection`)

Also fully offline. `--fields` is a required comma-separated list of API
names; the command doesn't validate them against a describe, so a typo'd
field name will pass generation and only surface when you deploy the
metadata. `--fieldset-name` is optional — when omitted, a default is derived
as `SelectorInclusion_<Fields>` (with a `Fields` suffix), truncated to stay
within the fieldset API-name length limit. `--label` and `--description` are
free text written directly into the generated `FieldSet` metadata.

## Dry run, overwrite, and the JSON result shape

Every command returns `{ baseDir, created, skipped, wouldCreate? }` (plus
`manualSteps` for the fflib unit-of-work case above):

* **`--dry-run`** short-circuits before any filesystem check — the plan is
  built and every artifact's target path is reported under `wouldCreate`,
  but nothing is read from or written to disk. `created`/`skipped` are
  always empty in this mode.
* **Without `--dry-run`**, the generation engine's default overwrite policy
  is `overwrite` — existing files at a planned path are silently replaced.
  There is no `--no-overwrite`/`--skip-existing` flag exposed on any command
  today; if you need to detect collisions before writing, run with
  `--dry-run --json` first and diff `wouldCreate` against what's already on
  disk.
* A generation plan is checked for duplicate output paths
  (`ensureNoPlanCollisions`) before anything is written — two artifacts
  targeting the same file within one command invocation is a hard error,
  not a silent last-write-wins.

## Describe and API version resolution

Any command that takes `--target-org` describes the SObject once per
invocation (no caching across separate CLI invocations). `--api-version`
overrides the connection's default API version; when omitted, the org
connection's own default is used, and that resolved value (not the flag) is
what gets written into generated `-meta.xml` API version fields.
