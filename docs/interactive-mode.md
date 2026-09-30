---
title: Interactive generation
description: Use guided prompts to collect APX generation options.
---

Every `apx generate` command accepts `-i`/`--interactive`. Interactive mode asks for the values you didn't pass, shows what it resolved, and waits for your confirmation before it generates anything.

## Usage

Pass `-i` alone to be prompted for everything:

```bash
sf apx generate selector -i
sf apx generate action -i
```

You can also mix flags and prompts. Values you pass are kept. Everything else is prompted for, including options with defaults, such as `--output-path`. Prompts fit the value: text for names and paths, a selection for flavor and trigger operation, a checkbox for the aggregate artifact groups, and yes/no for `--dry-run`.

These nine commands support it:

- `sf apx generate` (aggregate selector, domain, and unit of work)
- `sf apx generate selector`
- `sf apx generate domain`
- `sf apx generate unitofwork`
- `sf apx generate service`
- `sf apx generate criteria`
- `sf apx generate action`
- `sf apx generate selector method`
- `sf apx generate selector field-injection`

This example supplies the org and SObject, and prompts for the flavor, output options, and the rest:

```bash
sf apx generate selector -i --target-org myOrg --sobject Account
```

## What each command asks

- **`generate`, `selector`, `domain`, `unitofwork`** (need an org): target org, SObject, AT4DX or fflib flavor, API version, output path, prefix, and dry run. `unitofwork` also asks for the binding sequence. Bare `generate` asks for the selector, domain, and unit-of-work checkbox if you didn't set those flags, and you must pick at least one.
- **`generate service`**: service base name, flavor, API version, output path, prefix, and dry run. You can leave the org blank, because a service can be generated without one.
- **`action` and `criteria`** (offline, AT4DX): SObject, class name, trigger operation, order, process name, description, API version, output path, and dry run. Order defaults to `10.2` for action and `10.1` for criteria.
- **`selector method`** (offline): SObject, method class name, selector class name, API version, output path, and dry run.
- **`selector field-injection`** (offline): SObject, comma-separated fields, an optional field set name, label, and description, output path, and dry run.

The offline commands don't ask for an org or a flavor.

Trigger operation offers the same seven values as the flag: `Before_Insert`, `Before_Update`, `Before_Delete`, `After_Insert`, `After_Update`, `After_Delete`, and `After_Undelete`. API version defaults to `sourceApiVersion` in the project's `sfdx-project.json`.

## Confirmation and safety

After prompting, APX prints the resolved values and asks `Generate with these values?`. The default is no. If you decline, it prints `Generation cancelled; no files were written.` and returns an empty result.

If you confirm, generation runs exactly as it does with flags, including the org describe for commands that describe an SObject. `--dry-run` still renders and validates without writing. An org alias or username you type must already be authenticated. Interactive mode doesn't log you in.

Interactive mode needs a terminal. In a non-interactive process, `-i` fails right away with `Interactive mode requires an interactive terminal; pass flags instead when running non-interactively.` Use plain flags in CI and scripts.

## Without `-i`

Nothing changes. Command help shows some inputs as optional because the same flag definitions drive the prompts, but the command still rejects missing required values, and still requires exactly one of `--at4dx` or `--fflib` where it applies. [Command details](command-details.md) covers the rules that apply once the inputs are resolved.
