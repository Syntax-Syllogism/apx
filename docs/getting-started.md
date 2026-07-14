# Getting started with apx

`apx` is a Salesforce CLI plugin that generates Apex Enterprise Patterns
(fflib/at4dx) code — Domain, Selector, Service, and Unit of Work artifacts —
from a described SObject. This guide walks through your first generation run.

## Install

```bash
sf plugins install @syntax-syllogism/apx@x.y.z
```

Or build from source (see [Contributing](../README.md#contributing)):

```bash
git clone git@github.com:jprichter/apx
cd apx
yarn && yarn build
./bin/dev.js apx generate --help
```

## Concepts

Every `apx generate` command needs two things:

1. **A flavor** — exactly one of `--at4dx` or `--fflib`. These are mutually
   exclusive; you must pick one. The flavor selects which template set is
   rendered (interface/implementation shape, binding metadata format, base
   class references) for every artifact the command produces.
2. **A target** — most commands describe a live SObject via `--target-org`
   + `--sobject` to pull real field names and custom/standard-object status.
   A few commands (`action`, `criteria`, `selector method`,
   `selector field-injection`) work entirely offline and don't need an org
   connection at all — they only need the SObject API name as a string.

All commands support `--dry-run` (render and validate without writing files)
and `--output-path` (defaults to `generated-files`, relative to the Salesforce
project root).

## Your first generation run

Generate a full selector for `Account` in AT4DX style:

```bash
sf apx generate selector --target-org myOrg --sobject Account --at4dx
```

This describes `Account` against `myOrg`, then writes a selector interface,
implementation, unit test, and (for AT4DX) a `SelectorConfig` binding custom
metadata record under `generated-files/`.

Preview first with `--dry-run` if you want to see what would be written
without touching disk:

```bash
sf apx generate selector --target-org myOrg --sobject Account --at4dx --dry-run --json
```

## Generating multiple layers at once

The bare `apx generate` command builds several artifact groups from a single
SObject describe, so you only pay for one API round-trip:

```bash
sf apx generate --target-org myOrg --sobject Account \
  --selector --domain --unit-of-work --at4dx
```

At least one of `--selector`, `--domain`, `--unit-of-work` is required — the
command errors out if none are set. See
[Aggregate generation](command-details.md#aggregate-generation-apx-generate)
for exactly how binding sequence and prefix apply across the combined plan.

## Offline scaffolding

Some artifacts don't need an org at all:

```bash
# Action class + AT4DX domain-process binding, entirely offline
sf apx generate action -s Account -c DefaultAccountSloganBasedOnNameAction

# Field-injection fieldset + binding for an existing selector
sf apx generate selector field-injection -s Account --fields Name,Industry
```

See [Offline domain-process generation](command-details.md#offline-domain-process-generation-action--criteria)
for how `--trigger-operation`, `--order`, and `--process-name` combine to
build the binding's developer name.

## Next steps

+ [Command details](command-details.md) — flavor selection, naming/prefix
  rules, binding sequence, domain-process metadata, dry-run/overwrite
  semantics.
+ [Example `--json` output](examples/generate-selector-output.json) — what a
  successful `--json` run looks like.
+ Full CLI reference: see the [Commands](../README.md#commands) section of
  the README, or run any command with `--help`.
