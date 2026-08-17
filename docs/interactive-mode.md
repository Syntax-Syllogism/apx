---
title: Interactive generation
description: Use guided prompts to collect APX generation options.
---

Every `apx generate` entry point supports `-i`/`--interactive`. Interactive mode
collects missing generation values, displays the resolved options, and asks for
an explicit confirmation before generation starts.

## Usage

Pass `-i` by itself to use prompts for all generation inputs:

```bash
sf apx generate selector -i
sf apx generate action -i
```

You can mix flags and prompts. Values supplied on the command line are retained;
values not explicitly supplied are prompted for, including static defaults such
as `--output-path`. The prompt types reflect the value: text input for names and
paths, a selection for flavor and trigger operation, a checkbox for aggregate
artifact groups, and a yes/no prompt for `--dry-run`.

The nine supported entry points are:

- `sf apx generate` (aggregate selector, domain, and unit-of-work generation)
- `sf apx generate selector`
- `sf apx generate domain`
- `sf apx generate unitofwork`
- `sf apx generate service`
- `sf apx generate criteria`
- `sf apx generate action`
- `sf apx generate selector method`
- `sf apx generate selector field-injection`

For example, this supplies the org and SObject but prompts for flavor, output
options, and the remaining selector settings:

```bash
sf apx generate selector -i --target-org myOrg --sobject Account
```

## Prompt coverage

The org-backed commands (`generate`, `selector`, `domain`, and `unitofwork`)
prompt for the target org, SObject, AT4DX or fflib flavor, API version, output
path, prefix, and dry-run choice. Unit-of-work also prompts for binding sequence.
The aggregate command prompts for its selector/domain/unit-of-work artifact
checkbox when those toggles were not supplied; at least one group must be
selected.

`generate service` prompts for the service base name, flavor, API version, output
path, prefix, and dry-run choice. Its target-org prompt may be left blank because
service generation can run without an org.

The offline AT4DX commands do not prompt for an org or flavor:

- `action` and `criteria` prompt for the SObject, class name, trigger operation,
  order, process name, description, API version, output path, and dry-run choice.
  Their order prompt defaults to `10.2` for action and `10.1` for criteria.
- `selector method` prompts for the SObject, method class name, selector class
  name, API version, output path, and dry-run choice.
- `selector field-injection` prompts for the SObject, comma-separated fields,
  optional fieldset name, label, description, output path, and dry-run choice.

The prompt choices for trigger operation are the same seven values accepted by
the flag: `Before_Insert`, `Before_Update`, `Before_Delete`, `After_Insert`,
`After_Update`, `After_Delete`, and `After_Undelete`.

When prompted, API version defaults to `sourceApiVersion` from the current
project's `sfdx-project.json`.

## Confirmation and safety

After prompting, APX prints a summary of the resolved flag values and asks
`Generate with these values?`. The default answer is no. Declining prints
`Generation cancelled; no files were written.` and returns an empty generation
result without executing the generation plan.

Confirming uses the same generation path as flag-only mode, including the org
describe step for commands that describe an SObject. `--dry-run` still renders
and validates without writing files. A prompted org alias or username must
already resolve to an authenticated org; interactive mode does not perform org
login.

Interactive mode requires a TTY. Passing `-i` from a non-interactive process
fails fast with `Interactive mode requires an interactive terminal; pass flags
instead when running non-interactively.` Use the regular flags for CI and other
scripted invocations.

## Flag-only mode

Without `-i`, generation behavior is unchanged. The command help shows formerly
required inputs as optional because the same flag definitions support prompting,
but the command still rejects missing required values and still requires exactly
one of `--at4dx` or `--fflib` where applicable. See [Command details](command-details.md)
for the generation and metadata rules that apply after inputs are resolved.
