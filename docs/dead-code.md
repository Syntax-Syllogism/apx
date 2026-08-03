# Dead-code analysis

`sf apx dead` analyzes active, unmanaged Apex classes in an org and reports classes with
no known inbound references. It is an inventory and review aid; it does not delete or
modify org metadata.

## Basic usage

The command requires both `--target-org` and `--classes`:

```bash
sf apx dead --target-org myOrg --classes
```

Use `--ignore` one or more times to exclude case-insensitive class-name patterns. Patterns
support `*` and match the complete class name. The command also accepts `--api-version` and
`--output-path` (default: `generated-files`).

## How the analysis works

1. It inventories active Apex classes where `NamespacePrefix = null` and fetches symbol
   tables in batches.
2. It reads `MetadataComponentDependency` records to build inbound and outbound references.
3. It reads the known AT4DX binding metadata objects and treats classes named by bindings as
   live. The sources are:
   `ApplicationFactory_ServiceBinding__mdt`, `ApplicationFactory_SelectorBinding__mdt`,
   `ApplicationFactory_DomainBinding__mdt`, and `DomainProcessBinding__mdt`.
4. It suppresses recognized entry points and test classes from classification. Recognized
   entry points include REST resources, global classes, annotated or webservice methods,
   and supported Batchable, Schedulable, Queueable, Callable, messaging, and platform-event
   interfaces.
5. It repeatedly removes zero-inbound classes. It also identifies orphaned dependency
   cycles and groups classes referenced only by their own tests.

Analysis continues in rounds so a class that becomes unreferenced only after an earlier
round is reported as a cascade. Results include the round, reason, referrers, and DI risk
where a class has an interface or base class but no matching binding.

## Result buckets

- `DEAD`: no inbound references, including classes found through cascade analysis.
- `TEST-ONLY`: referenced only by tests; its tests appear in `TEST-OF-DEAD` when they can
  be removed with it.
- `TEST-OF-DEAD`: a test paired with a dead or test-only class.
- `RETAINED`: referenced by tests that also cover surviving code, so the class and tests
  must remain together.
- `SUPPRESSED`: a test, recognized entry point, or DI-bound class excluded from the active
  graph.

Suppression is always applied during classification. `--include-suppressed` only adds the
suppressed rows to human-readable output; it does not make those classes candidates for
dead/test-only buckets or destructive manifests. Suppressed rows include a `WOULD BE DEAD`
audit value and are sorted with `yes` rows first.

## Destructive manifests

Add `--destructive-manifest` to write a reviewable manifest under
`<output-path>/dead-code/`:

```bash
sf apx dead --target-org myOrg --classes --destructive-manifest
```

The command writes `destructiveChanges.xml` for Apex classes and an empty `package.xml`.
By default, the manifest includes `DEAD`, `TEST-ONLY`, and paired `TEST-OF-DEAD` classes.
`--dead-only` limits it to the `DEAD` bucket and requires
`--destructive-manifest`.

Use `--dry-run` with `--destructive-manifest` to calculate and validate the manifest paths
without creating files. `--classes` without `--destructive-manifest` only reports findings.
The manifest never includes suppressed classes, regardless of `--include-suppressed`.
Review the generated XML before deployment:

```bash
sf project deploy start --target-org myOrg \
  --manifest generated-files/dead-code/package.xml \
  --post-destructive-changes generated-files/dead-code/destructiveChanges.xml
```

## Limitations and warnings

Dependency data cannot see class names held in strings, such as `Type.forName`, anonymous
Apex scheduling, or bespoke configuration tables. Missing binding objects are reported and
mean DI implementations may be classified as dead. Classes without symbol tables use
naming conventions for test detection and cannot be checked for entry-point annotations.

Always review findings, especially cascade rounds and DI-risk rows, before deploying a
destructive manifest.
