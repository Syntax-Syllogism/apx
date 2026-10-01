---
title: Getting started with APX
description: Install APX and generate Apex Enterprise Patterns code.
---

`apx` is a Salesforce CLI plugin that generates Apex Enterprise Patterns code (fflib or at4dx) for an SObject: Domain, Selector, Service, and Unit of Work. This guide walks you through a first run.

## Install

Use Node.js 22 or later: the shared `apx-core` 0.3.0 dependency requires it.

```bash
sf plugins install @syntax-syllogism/apx@x.y.z
```

Or build from source (see [Contributing](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/README.md#contributing)):

```bash
git clone git@github.com:jprichter/apx
cd apx
yarn && yarn build
node ./bin/dev.js apx generate --help
```

## The basics

Most `apx generate` commands that use an org need two things:

1. **A flavor.** Pass exactly one of `--at4dx` or `--fflib`. The flavor decides which templates are used for every file the command creates: the interface and implementation shape, the binding metadata format, and the base classes.
2. **A target.** `--target-org` and `--sobject` make APX describe a live SObject, so it can use the real field names and know whether the object is custom or standard.

Some commands work offline. The AT4DX-only `action`, `criteria`, `selector method`, and `selector field-injection` commands take the SObject API name as plain text. `service` also works offline and takes `--service-basename` instead of an SObject.

Every command accepts `--dry-run` (render and validate, write nothing) and `--output-path` (default `generated-files`, relative to the Salesforce project root).

## Your first run

Generate an AT4DX selector for `Account`:

```bash
sf apx generate selector --target-org myOrg --sobject Account --at4dx
```

APX describes `Account` in `myOrg`, then writes a selector interface, an implementation, a unit test, and (for AT4DX) a `SelectorConfig` binding custom metadata record under `generated-files/`.

To see what it would write first, add `--dry-run`:

```bash
sf apx generate selector --target-org myOrg --sobject Account --at4dx --dry-run --json
```

Want to be prompted instead? Add `-i`. APX asks for the values you left out, shows a summary, and asks you to confirm before it writes anything:

```bash
sf apx generate selector -i --target-org myOrg --sobject Account
```

See [Interactive generation](interactive-mode.md) for the details.

## Several layers at once

The bare `apx generate` command builds more than one layer from a single SObject describe, so it makes one API call:

```bash
sf apx generate --target-org myOrg --sobject Account \
  --selector --domain --unit-of-work --at4dx
```

Set at least one of `--selector`, `--domain`, or `--unit-of-work`, or the command fails. See [Aggregate generation](command-details.md#aggregate-generation-apx-generate) for how binding sequence and prefix apply.

## Offline scaffolding

Some artifacts don't need an org:

```bash
# An action class and its AT4DX domain-process binding
sf apx generate action -s Account -c DefaultAccountSloganBasedOnNameAction

# A field set and binding for an existing selector
sf apx generate selector field-injection -s Account --fields Name,Industry
```

See [Offline domain-process generation](command-details.md#offline-domain-process-generation-action--criteria) for how `--trigger-operation`, `--order`, and `--process-name` combine into the binding's developer name.

## Next steps

* [Command details](command-details.md): flavors, naming and prefixes, binding sequence, domain-process metadata, and dry-run and overwrite behavior.
* [Dead-code analysis](dead-code.md): find classes nothing references.
* Every flag: the [Commands](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/README.md#commands) section of the README, or `--help` on any command.
