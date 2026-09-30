---
title: Dead-code analysis
description: Find unreferenced Apex classes safely before removing them.
---

`sf apx dead` looks at the active, unmanaged Apex classes in an org and reports the ones with no known inbound references. It's for finding and reviewing candidates. It never deletes or changes anything in the org.

## Basic usage

`--target-org` and `--classes` are both required:

```bash
sf apx dead --target-org myOrg --classes
```

Use `--ignore` (repeatable) to exclude classes by name. Patterns are case-insensitive, match the whole class name, and support `*`. The command also takes `--api-version` and `--output-path` (default `generated-files`).

## How it works

1. **Inventory.** It lists active Apex classes where `NamespacePrefix = null` and fetches their symbol tables in batches.
2. **References.** It reads `MetadataComponentDependency` to build inbound and outbound references.
3. **Bindings.** It reads the AT4DX binding objects and treats any class named in a binding as live: `ApplicationFactory_ServiceBinding__mdt`, `ApplicationFactory_SelectorBinding__mdt`, `ApplicationFactory_DomainBinding__mdt`, and `DomainProcessBinding__mdt`.
4. **Suppression.** It sets aside test classes and recognized entry points: REST resources, global classes, annotated or webservice methods, and classes implementing `Database.Batchable`, `System.Schedulable`, `System.Queueable`, `Messaging.InboundEmailHandler`, `System.Callable`, `Process.Plugin`, `Auth.RegistrationHandler`, `Database.RaisesPlatformEvents`, `System.Comparator`, `Iterable`, or `Iterator`.
5. **Rounds.** It repeatedly removes classes with no inbound references, finds orphaned dependency cycles, and groups classes referenced only by their own tests.

Because it works in rounds, a class that only becomes unreferenced after an earlier round is reported as a cascade. Each result shows the round, the reason, the referrers, and a DI risk when a class has an interface or base class but no matching binding.

## Result buckets

- `DEAD`: no inbound references, including classes found by cascade.
- `TEST-ONLY`: referenced only by tests. Its tests appear as `TEST-OF-DEAD` when they can be removed with it.
- `TEST-OF-DEAD`: a test paired with a dead or test-only class.
- `RETAINED`: referenced by tests that also cover surviving code, so the class and the tests stay together.
- `SUPPRESSED`: a test, recognized entry point, or DI-bound class left out of the active graph.

Suppression always applies. `--include-suppressed` only adds the suppressed rows to human output. It doesn't make them candidates for the dead or test-only buckets or for a destructive manifest. Those rows show a `WOULD BE DEAD` value for auditing and are sorted with `yes` first.

## Destructive manifests

Add `--destructive-manifest` to write a manifest you can review under `<output-path>/dead-code/`:

```bash
sf apx dead --target-org myOrg --classes --destructive-manifest
```

It writes `destructiveChanges.xml` for the Apex classes and an empty `package.xml`. By default it includes `DEAD`, `TEST-ONLY`, and the paired `TEST-OF-DEAD` classes. `--dead-only` limits it to `DEAD` and requires `--destructive-manifest`. Suppressed classes are never included, whatever `--include-suppressed` says.

With `--dry-run`, the command works out and validates the manifest paths and creates no files. Without `--destructive-manifest`, `--classes` only reports findings.

Review the XML, then deploy:

```bash
sf project deploy start --target-org myOrg \
  --manifest generated-files/dead-code/package.xml \
  --post-destructive-changes generated-files/dead-code/destructiveChanges.xml
```

## Limitations

Dependency data can't see class names held in strings, such as `Type.forName`, anonymous Apex scheduling, or your own configuration tables. If a binding object is missing, the command says so, and DI implementations may be classified as dead. Classes without symbol tables are recognized as tests by naming convention only, and can't be checked for entry-point annotations.

Always review the findings before you deploy a destructive manifest, especially cascade rounds and DI-risk rows.
