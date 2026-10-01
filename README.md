# apx

[![NPM](https://img.shields.io/npm/v/@syntax-syllogism/apx.svg?label=%40syntax-syllogism%2Fapx)](https://www.npmjs.com/package/@syntax-syllogism/apx) [![Downloads/week](https://img.shields.io/npm/dw/@syntax-syllogism/apx.svg)](https://npmjs.org/package/@syntax-syllogism/apx) [![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://raw.githubusercontent.com/Syntax-Syllogism/apx/blob/release/LICENSE)

A Salesforce CLI plugin that generates Apex Enterprise Patterns code (fflib or at4dx) for an SObject: Domain, Selector, Service, and Unit of Work classes. It can also find Apex classes that nothing references.

## Install

```bash
sf plugins install @syntax-syllogism/apx@x.y.z
```

## Quick start

```bash
# Domain layer for Account: class, interface, trigger, tests, and metadata
sf apx generate domain --target-org myOrg --sobject Account --at4dx

# Just a Selector
sf apx generate selector --target-org myOrg --sobject Account --fflib

# Selector, Domain, and Unit of Work in one pass
sf apx generate --target-org myOrg --sobject Account --selector --domain --unit-of-work --at4dx
```

Add `--dry-run` to any command to see what it would write without writing it.

## Documentation

New here? Start with [Getting started](docs/getting-started.md).

* [Command details](docs/command-details.md): flavors, naming and prefixes, binding sequence, domain-process metadata, and dry-run and overwrite behavior
* [Interactive generation](docs/interactive-mode.md): `-i` prompts for the values you leave out
* [Dead-code analysis](docs/dead-code.md): find unreferenced classes and build a safe destructive manifest

## Issues

Report problems at <https://github.com/Syntax-Syllogism/apx/issues>.

## Contributing

Read the [Code of Conduct](CODE_OF_CONDUCT.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Open an issue before starting work so we can avoid duplicate effort. Pull requests need unit tests.

### Build

You need yarn.

```bash
git clone git@github.com:Syntax-Syllogism/apx
cd apx
yarn && yarn build
```

Run the plugin from source:

```bash
node ./bin/dev.js apx generate domain --help
```

To run it from anywhere through the Salesforce CLI, link it:

```bash
sf plugins link .
sf plugins   # verify
```

## Commands

<!-- commands -->
* [`sf apx dead`](#sf-apx-dead)
* [`sf apx generate`](#sf-apx-generate)
* [`sf apx generate action`](#sf-apx-generate-action)
* [`sf apx generate criteria`](#sf-apx-generate-criteria)
* [`sf apx generate domain`](#sf-apx-generate-domain)
* [`sf apx generate selector`](#sf-apx-generate-selector)
* [`sf apx generate selector field-injection`](#sf-apx-generate-selector-field-injection)
* [`sf apx generate selector method`](#sf-apx-generate-selector-method)
* [`sf apx generate service`](#sf-apx-generate-service)
* [`sf apx generate unitofwork`](#sf-apx-generate-unitofwork)

## `sf apx dead`

Find Apex classes in an org that nothing references.

```
USAGE
  $ sf apx dead -o <value> [--json] [--flags-dir <value>] [-c] [--dead-only --destructive-manifest]
    [--include-suppressed] [--ignore <value>...] [-a <value>] [-p <value>] [--dry-run]

FLAGS
  -a, --api-version=<value>   Override the API version used for the org connection.
  -c, --classes               Find Apex classes that have no inbound metadata dependencies.
  -o, --target-org=<value>    (required) Target org username or alias.
  -p, --output-path=<value>   [default: generated-files] Output folder relative to the Salesforce project root.
      --dead-only             Limit the manifest to unreferenced classes, excluding test-only classes and their tests.
      --destructive-manifest  Write a destructive-changes manifest for the classes found. Does not modify the org.
      --dry-run               Render and validate generation output without writing files.
      --ignore=<value>...     Class-name pattern to exclude from results. Supports `*`. Repeatable.
      --include-suppressed    Also report classes suppressed as entry points, test classes, or DI-bound.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Find Apex classes in an org that nothing references.

  Uses the Tooling API Dependency API (MetadataComponentDependency) to find unmanaged Apex
  classes with no inbound metadata references.

  AT4DX dependency-injection bindings are resolved: classes named in
  ApplicationFactory_ServiceBinding__mdt, ApplicationFactory_SelectorBinding__mdt,
  ApplicationFactory_DomainBinding__mdt, or DomainProcessBinding__mdt are treated as live,
  because nothing references an injected implementation directly. Implementations with no
  binding are still reported, which is usually what you are looking for.

  Analysis repeats over the surviving graph until nothing new becomes dead, so an entire
  abandoned subsystem is found in one run; the round each class was found in is reported.

  Classes referenced only by their own tests are paired with those tests so both are removed
  together. When a test also covers surviving code, the class and its test are both retained
  and reported, because removing the class without its test would break the deployment.

  Recognised entry points (@AuraEnabled, @InvocableMethod, @RestResource, global,
  webservice, Batchable, Schedulable, Queueable) and test classes are suppressed by default.

  Class names held as strings outside the known binding objects -- Type.forName,
  System.schedule from anonymous Apex, bespoke config tables -- remain invisible. Always
  review results before deploying a destructive change.

EXAMPLES
  List classes nothing references:

    $ sf apx dead --target-org myOrg --classes

  Include suppressed entry points and DI-bound classes in the report:

    $ sf apx dead --target-org myOrg --classes --include-suppressed

  Write a destructive manifest for the dead classes and their tests:

    $ sf apx dead --target-org myOrg --classes --destructive-manifest

  Write a manifest for unreferenced classes only, excluding test-only groups:

    $ sf apx dead --target-org myOrg --classes --destructive-manifest --dead-only

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/dead.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/dead.ts)_

## `sf apx generate`

Generate multiple AEP artifact groups in one command run.

```
USAGE
  $ sf apx generate [--json] [--flags-dir <value>] [-o <value>] [-s <value>] [--at4dx] [--fflib] [-a <value>] [-b
    <value>] [-p <value>] [--prefix <value>] [-r] [-d] [-u] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>       Override the API version used for the org connection.
  -b, --binding-sequence=<value>  Binding sequence value for AT4DX unit-of-work metadata.
  -d, --domain                    Include domain artifacts in aggregate generation.
  -i, --interactive               Prompt for generation flag values interactively.
  -o, --target-org=<value>        Target org username or alias.
  -p, --output-path=<value>       [default: generated-files] Output folder relative to the Salesforce project root.
  -r, --selector                  Include selector artifacts in aggregate generation.
  -s, --sobject=<value>           SObject API name used for generated artifacts.
  -u, --unit-of-work              Include unit-of-work artifacts in aggregate generation.
      --at4dx                     Generate AT4DX-flavor artifacts.
      --dry-run                   Render and validate generation output without writing files.
      --fflib                     Generate fflib-flavor artifacts.
      --prefix=<value>            Optional namespace-style class prefix.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate multiple AEP artifact groups in one command run.

  Builds selector/domain/unit-of-work plans from one SObject describe and writes all selected outputs in a single
  manifest.

EXAMPLES
  Generate selector, domain, and unit-of-work in AT4DX style:

    $ sf apx generate --target-org myOrg --sobject Account --selector --domain --unit-of-work --at4dx

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate.ts)_

## `sf apx generate action`

Generate an AT4DX domain-process action class, test, and binding metadata.

```
USAGE
  $ sf apx generate action [--json] [--flags-dir <value>] [-s <value>] [-c <value>] [--trigger-operation
    Before_Insert|Before_Update|Before_Delete|After_Insert|After_Update|After_Delete|After_Undelete] [--order <value>]
    [--process-name <value>] [--description <value>] [-a <value>] [-p <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>         Override the API version used for the org connection.
  -c, --class-name=<value>          Selector method-injection class name.
  -i, --interactive                 Prompt for generation flag values interactively.
  -p, --output-path=<value>         [default: generated-files] Output folder relative to the Salesforce project root.
  -s, --sobject=<value>             SObject API name used for generated artifacts.
      --description=<value>         Optional description value written into generated metadata.
      --dry-run                     Render and validate generation output without writing files.
      --order=<value>               Order-of-execution token used for AT4DX domain-process bindings (for example, 10.1).
      --process-name=<value>        Optional process token used to build AT4DX binding developer names.
      --trigger-operation=<option>  Trigger operation enum value for AT4DX domain-process bindings.
                                    <options: Before_Insert|Before_Update|Before_Delete|After_Insert|After_Update|After_
                                    Delete|After_Undelete>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate an AT4DX domain-process action class, test, and binding metadata.

  Creates offline action scaffolding and a DomainProcessBinding record without requiring an org connection.

EXAMPLES
  Generate action artifacts with defaults:

    $ sf apx generate action -s Account -c DefaultAccountSloganBasedOnNameAction

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/action.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/action.ts)_

## `sf apx generate criteria`

Generate an AT4DX domain-process criteria class, test, and binding metadata.

```
USAGE
  $ sf apx generate criteria [--json] [--flags-dir <value>] [-s <value>] [-c <value>] [--trigger-operation
    Before_Insert|Before_Update|Before_Delete|After_Insert|After_Update|After_Delete|After_Undelete] [--order <value>]
    [--process-name <value>] [--description <value>] [-a <value>] [-p <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>         Override the API version used for the org connection.
  -c, --class-name=<value>          Selector method-injection class name.
  -i, --interactive                 Prompt for generation flag values interactively.
  -p, --output-path=<value>         [default: generated-files] Output folder relative to the Salesforce project root.
  -s, --sobject=<value>             SObject API name used for generated artifacts.
      --description=<value>         Optional description value written into generated metadata.
      --dry-run                     Render and validate generation output without writing files.
      --order=<value>               Order-of-execution token used for AT4DX domain-process bindings (for example, 10.1).
      --process-name=<value>        Optional process token used to build AT4DX binding developer names.
      --trigger-operation=<option>  Trigger operation enum value for AT4DX domain-process bindings.
                                    <options: Before_Insert|Before_Update|Before_Delete|After_Insert|After_Update|After_
                                    Delete|After_Undelete>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate an AT4DX domain-process criteria class, test, and binding metadata.

  Creates offline criteria scaffolding and a DomainProcessBinding record without requiring an org connection.

EXAMPLES
  Generate criteria artifacts with defaults:

    $ sf apx generate criteria -s Account -c AccountNameContainsFishCriteria

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/criteria.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/criteria.ts)_

## `sf apx generate domain`

Generate domain classes, tests, triggers, and metadata for an SObject.

```
USAGE
  $ sf apx generate domain [--json] [--flags-dir <value>] [-o <value>] [-s <value>] [--at4dx] [--fflib] [-a <value>] [-p
    <value>] [--prefix <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>  Override the API version used for the org connection.
  -i, --interactive          Prompt for generation flag values interactively.
  -o, --target-org=<value>   Target org username or alias.
  -p, --output-path=<value>  [default: generated-files] Output folder relative to the Salesforce project root.
  -s, --sobject=<value>      SObject API name used for generated artifacts.
      --at4dx                Generate AT4DX-flavor artifacts.
      --dry-run              Render and validate generation output without writing files.
      --fflib                Generate fflib-flavor artifacts.
      --prefix=<value>       Optional namespace-style class prefix.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate domain classes, tests, triggers, and metadata for an SObject.

  Describes the target SObject and scaffolds domain artifacts in either AT4DX or fflib flavor.

EXAMPLES
  Generate AT4DX domain files:

    $ sf apx generate domain --target-org myOrg --sobject Account --at4dx

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/domain.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/domain.ts)_

## `sf apx generate selector`

Generate selector classes, tests, and metadata for an SObject.

```
USAGE
  $ sf apx generate selector [--json] [--flags-dir <value>] [-o <value>] [-s <value>] [--at4dx] [--fflib] [-a <value>] [-p
    <value>] [--prefix <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>  Override the API version used for the org connection.
  -i, --interactive          Prompt for generation flag values interactively.
  -o, --target-org=<value>   Target org username or alias.
  -p, --output-path=<value>  [default: generated-files] Output folder relative to the Salesforce project root.
  -s, --sobject=<value>      SObject API name used for generated artifacts.
      --at4dx                Generate AT4DX-flavor artifacts.
      --dry-run              Render and validate generation output without writing files.
      --fflib                Generate fflib-flavor artifacts.
      --prefix=<value>       Optional namespace-style class prefix.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate selector classes, tests, and metadata for an SObject.

  Describes the target SObject and scaffolds selector artifacts in either AT4DX or fflib flavor.

EXAMPLES
  Generate AT4DX selector files:

    $ sf apx generate selector --target-org myOrg --sobject Account --at4dx

  Generate fflib selector files with a prefix:

    $ sf apx generate selector --target-org myOrg --sobject Property__c --fflib --prefix foobar

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/selector.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/selector.ts)_

## `sf apx generate selector field-injection`

Generate AT4DX selector field-injection metadata (fieldset + binding).

```
USAGE
  $ sf apx generate selector field-injection [--json] [--flags-dir <value>] [-s <value>] [--fields <value>] [--fieldset-name <value>]
    [--label <value>] [--description <value>] [-p <value>] [--dry-run] [-i]

FLAGS
  -i, --interactive            Prompt for generation flag values interactively.
  -p, --output-path=<value>    [default: generated-files] Output folder relative to the Salesforce project root.
  -s, --sobject=<value>        SObject API name used for generated artifacts.
      --description=<value>    Optional description value written into generated metadata.
      --dry-run                Render and validate generation output without writing files.
      --fields=<value>         Comma-separated API names for field-set displayed fields.
      --fieldset-name=<value>  Optional field-set API name for selector field injection.
      --label=<value>          Optional label value for generated metadata artifacts.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate AT4DX selector field-injection metadata (fieldset + binding).

  Creates a FieldSet and SelectorConfig_FieldSetInclusion binding offline from a comma-separated field list.

EXAMPLES
  Generate field-injection metadata:

    $ sf apx generate selector field-injection -s Account --fields Name,Industry
```

_See code: [src/commands/apx/generate/selector/field-injection.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/selector/field-injection.ts)_

## `sf apx generate selector method`

Generate an AT4DX selector method-injection class and test.

```
USAGE
  $ sf apx generate selector method [--json] [--flags-dir <value>] [-s <value>] [-c <value>] [--sobject-selector-class-name
    <value>] [-a <value>] [-p <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>                  Override the API version used for the org connection.
  -c, --class-name=<value>                   Selector method-injection class name.
  -i, --interactive                          Prompt for generation flag values interactively.
  -p, --output-path=<value>                  [default: generated-files] Output folder relative to the Salesforce project
                                             root.
  -s, --sobject=<value>                      SObject API name used for generated artifacts.
      --dry-run                              Render and validate generation output without writing files.
      --sobject-selector-class-name=<value>  Selector implementation class name used by method injection.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate an AT4DX selector method-injection class and test.

  Creates method-injection scaffolding for an existing selector without requiring an org describe.

EXAMPLES
  Generate selector method scaffolding:

    $ sf apx generate selector method -c SelectBySloganMethod --sobject-selector-class-name AccountsSelector -s \
      Account

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/selector/method.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/selector/method.ts)_

## `sf apx generate service`

Generate service facade/interface/implementation classes and metadata.

```
USAGE
  $ sf apx generate service [--json] [--flags-dir <value>] [-o <value>] [--service-basename <value>] [--at4dx] [--fflib]
    [-a <value>] [-p <value>] [--prefix <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>       Override the API version used for the org connection.
  -i, --interactive               Prompt for generation flag values interactively.
  -o, --target-org=<value>        Target org username or alias.
  -p, --output-path=<value>       [default: generated-files] Output folder relative to the Salesforce project root.
      --at4dx                     Generate AT4DX-flavor artifacts.
      --dry-run                   Render and validate generation output without writing files.
      --fflib                     Generate fflib-flavor artifacts.
      --prefix=<value>            Optional namespace-style class prefix.
      --service-basename=<value>  Base name used for generated service classes.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate service facade/interface/implementation classes and metadata.

  Builds service-layer Apex artifacts for the provided basename and flavor.

EXAMPLES
  Generate an AT4DX service set:

    $ sf apx generate service --target-org myOrg --service-basename LimitMonitors --at4dx

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/service.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/service.ts)_

## `sf apx generate unitofwork`

Generate unit-of-work binding metadata for an SObject.

```
USAGE
  $ sf apx generate unitofwork [--json] [--flags-dir <value>] [-o <value>] [-s <value>] [--at4dx] [--fflib] [-a <value>] [-b
    <value>] [-p <value>] [--prefix <value>] [--dry-run] [-i]

FLAGS
  -a, --api-version=<value>       Override the API version used for the org connection.
  -b, --binding-sequence=<value>  Binding sequence value for AT4DX unit-of-work metadata.
  -i, --interactive               Prompt for generation flag values interactively.
  -o, --target-org=<value>        Target org username or alias.
  -p, --output-path=<value>       [default: generated-files] Output folder relative to the Salesforce project root.
  -s, --sobject=<value>           SObject API name used for generated artifacts.
      --at4dx                     Generate AT4DX-flavor artifacts.
      --dry-run                   Render and validate generation output without writing files.
      --fflib                     Generate fflib-flavor artifacts.
      --prefix=<value>            Optional namespace-style class prefix.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate unit-of-work binding metadata for an SObject.

  Creates AT4DX unit-of-work binding metadata or prints the fflib Application snippet.

EXAMPLES
  Generate AT4DX unit-of-work binding:

    $ sf apx generate unitofwork --target-org myOrg --sobject Account --at4dx

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Override the API version used for the org connection.

    Override the api version used for api requests made by this command
```

_See code: [src/commands/apx/generate/unitofwork.ts](https://github.com/Syntax-Syllogism/apx/blob/v0.4.0/src/commands/apx/generate/unitofwork.ts)_
<!-- commandsstop -->
