# summary

Find Apex classes in an org that nothing references.

# description

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

# examples

- List classes nothing references:

  <%= config.bin %> <%= command.id %> --target-org myOrg --classes

- Include suppressed entry points and DI-bound classes in the report:

  <%= config.bin %> <%= command.id %> --target-org myOrg --classes --include-suppressed

- Write a destructive manifest for the dead classes and their tests:

  <%= config.bin %> <%= command.id %> --target-org myOrg --classes --destructive-manifest

- Write a manifest for unreferenced classes only, excluding test-only groups:

  <%= config.bin %> <%= command.id %> --target-org myOrg --classes --destructive-manifest --dead-only

# info.summary

Scanned %s classes over %s round(s): %s dead, %s test-only, %s retained, %s suppressed.

# info.bindingSources

Binding sources consulted:

# info.bindingSourceRow

  %s  %s

# info.bindingSourceMissing

  %s  not present in org

# info.manifestWritten

Wrote a destructive manifest for %s classes to %s

# info.nextStep

Review the manifest, then deploy it with:

# info.dryRunManifest

Would write a destructive manifest for %s classes to %s

# info.noResults

No dead classes found.

# warn.stringReferences

Class names held as strings outside the known AT4DX binding objects are invisible to
dependency data. Classes reached only via Type.forName, System.schedule from anonymous
Apex, or a bespoke config table are reported as dead even when they are live. Review
before deleting.

# warn.noBindingSources

No AT4DX binding objects were found in this org, so no dependency-injection bindings could
be resolved. If this is an AT4DX project, injected implementations will be reported as
dead.

# warn.cascade

%s classes were found in round 2 or later. These are only dead once the earlier rounds are
deployed. Deploy and re-run to confirm.

# warn.missingSymbolTable

%s classes have no symbol table (never compiled); entry-point detection was skipped for
them and they were classified on naming convention alone.

# warn.maxRounds

Cascade stopped at the %s-round safety limit. Results may be incomplete; please report
this.

# error.nothingSelected

Specify --classes.

# error.manifestWithoutClasses

--destructive-manifest requires --classes.
