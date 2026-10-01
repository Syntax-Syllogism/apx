---
title: Command details
description: Naming, flavor, and metadata rules for APX generation commands.
---

This page explains how apx builds its generation plans: the naming, flavor, and metadata rules that don't fit in a flag summary. For flags, see the [CLI reference](cli-reference.md) or a command's `--help`.

The rules below apply once inputs are resolved, whether from flags or from [interactive prompts](interactive-mode.md).

## Flavor (`--at4dx` / `--fflib`)

`generate`, `domain`, `selector`, `service`, and `unitofwork` need exactly one of `--at4dx` or `--fflib`. Passing both or neither fails before anything is generated. With `-i`, you pick the flavor from a list, and the same rule is checked afterward. The flavor sets the templates for every file in the plan: the interface and implementation shape, base class references, and binding metadata format all differ between fflib and AT4DX.

`action`, `criteria`, `selector method`, and `selector field-injection` are AT4DX-only offline commands, so they have no flavor flags.

One difference to know about: `apx generate unitofwork --fflib` writes **no** binding file, because fflib has no unit-of-work binding metadata. Instead, the command prints the `Application` factory snippet (the SObjectType to register) for you to add by hand. In the JSON result, `created` and `skipped` are empty and the snippet is under `manualSteps`. Only `--at4dx` writes a `unitOfWorkBinding`. The aggregate `apx generate --fflib --unit-of-work` prints the same snippet but, for compatibility, doesn't include `manualSteps` in its JSON result.

## Naming and `--prefix`

Class names come from the SObject API name. You don't type them in.

* `--prefix` is upper-cased and joined to the base name with `_`. For example, `--prefix foobar` on `Property__c` gives the domain class `FOOBAR_Properties`, not `Properties`.
* Any existing leading prefix on the SObject name is stripped first (case-insensitively), so re-running with the same prefix doesn't double it.
* `__c` and underscores are removed, and selector and domain base names are pluralized (`Account` becomes `Accounts`).
* Interfaces get an `I` after the prefix (`FOOBAR_IProperties`).
* Test classes get a `Test` suffix, shortened to stay within Apex's 40-character type-name limit.

`generate service` uses `--service-basename` as given. It doesn't describe an SObject, needs no `--target-org`, and isn't pluralized, because a service isn't tied to one object.

## Aggregate generation (`apx generate`)

The bare `generate` command builds selector, domain, and unit-of-work plans from one SObject describe. Set at least one of `--selector`, `--domain`, or `--unit-of-work`, or the command fails before it touches the org. All selected layers share `--prefix`, the flavor, and `--output-path`. `--binding-sequence` affects only the unit-of-work artifact, and only with `--at4dx`.

## Binding sequence (`--binding-sequence` / `-b`)

This applies only to AT4DX unit-of-work bindings. The default is `1000.0`. When several SObjects register with the same `Application` factory, lower values bind first. APX doesn't check the format beyond what AT4DX's metadata expects, so choose a value that fits your existing sequence.

## Offline domain-process generation (`action` / `criteria`)

`apx generate action` and `apx generate criteria` build a `DomainProcessBinding` custom metadata record from flags alone. They never need `--target-org`. They use the SObject API name only as text in the generated method signatures, so they work even for SObjects that don't exist in any org yet.

* `--order` defaults to `10.2` for `action` and `10.1` for `criteria`. It must match `\d+(\.\d+)?` (for example `10`, `10.1`, or `10.20`). Anything else is a validation error before any file is written.
* `--process-name` is optional. If you set it, the binding's developer name is `<processName><order-with-dots-as-underscores><Type>`, such as `FishCompanySlogans10_20Criteria`. If you don't, the developer name is the class name.
* Custom metadata record names are limited to 40 characters. If the developer name would be longer, the command fails instead of truncating it. Shorten `--process-name` or the class name.
* `--description` is XML-escaped (`&`, `<`, `>`) before it's written, so ordinary prose is safe.
* `--trigger-operation` is checked against the AT4DX values (`Before_Insert` through `After_Undelete`) when the command parses its flags.

## Selector field injection (`selector field-injection`)

This is also fully offline. `--fields` is required and is a comma-separated list of API names. APX doesn't check them against a describe, so a typo passes generation and only shows up when you deploy the metadata. `--fieldset-name` is optional. If you leave it out, APX derives `SelectorInclusion_<Fields>` (with a `Fields` suffix) and truncates it to fit the field set API name limit. `--label` and `--description` are free text written straight into the `FieldSet` metadata.

## Dry run, overwrite, and the JSON result

Every generation command returns `{ baseDir, created, skipped, wouldCreate? }`, plus `manualSteps` for `generate unitofwork --fflib` (see above).

* **`--dry-run`** builds and validates the plan and lists every target path under `wouldCreate`, without checking whether the output files exist or writing them. Project resolution and interactive API-version defaults can still read project configuration, and commands that describe an SObject still contact the org. `created` and `skipped` are always empty.
* **Without `--dry-run`**, existing files at a planned path are overwritten silently. No command has a `--no-overwrite` or `--skip-existing` flag. To check for collisions first, run with `--dry-run --json` and compare `wouldCreate` with what's on disk.
* Before writing, APX checks the plan for duplicate output paths. If two artifacts in one run target the same file, that's an error, not a silent last-write-wins.

## Describe and API version

`generate`, `domain`, `selector`, and `unitofwork` refresh org authentication and describe the SObject once per run. Nothing is cached between runs. `--api-version` selects the connection version; otherwise the connection's default is used. That resolved version is written into generated Apex and trigger `-meta.xml` files.

`service` never describes an SObject. Its API-version precedence is the explicit flag, then the optional org connection's version, then `60.0`. It refreshes authentication and obtains the connection only when an org is supplied and no explicit version is set.

Offline `action`, `criteria`, and `selector method` use the explicit version or `60.0`. `selector field-injection` has no API-version flag. In interactive mode, the API-version prompt is prefilled from the project's `sourceApiVersion`; accepting that value supplies it to generation. Non-interactive commands do not use `sourceApiVersion` as a fallback.
