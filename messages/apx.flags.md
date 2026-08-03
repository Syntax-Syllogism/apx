# flags.target-org.summary

Target org username or alias.

# flags.sobject.summary

SObject API name used for generated artifacts.

# flags.api-version.summary

Override the API version used for the org connection.

# flags.class-name.summary

Selector method-injection class name.

# flags.sobject-selector-class-name.summary

Selector implementation class name used by method injection.

# flags.process-name.summary

Optional process token used to build AT4DX binding developer names.

# flags.order.summary

Order-of-execution token used for AT4DX domain-process bindings (for example, 10.1).

# flags.trigger-operation.summary

Trigger operation enum value for AT4DX domain-process bindings.

# flags.description.summary

Optional description value written into generated metadata.

# flags.label.summary

Optional label value for generated metadata artifacts.

# flags.fieldset-name.summary

Optional field-set API name for selector field injection.

# flags.fields.summary

Comma-separated API names for field-set displayed fields.

# flags.prefix.summary

Optional namespace-style class prefix.

# flags.output-path.summary

Output folder relative to the Salesforce project root.

# flags.binding-sequence.summary

Binding sequence value for AT4DX unit-of-work metadata.

# flags.at4dx.summary

Generate AT4DX-flavor artifacts.

# flags.fflib.summary

Generate fflib-flavor artifacts.

# flags.service-basename.summary

Base name used for generated service classes.

# flags.selector.summary

Include selector artifacts in aggregate generation.

# flags.domain.summary

Include domain artifacts in aggregate generation.

# flags.unit-of-work.summary

Include unit-of-work artifacts in aggregate generation.

# flags.dry-run.summary

Render and validate generation output without writing files.

# flags.classes.summary

Find Apex classes that have no inbound metadata dependencies.

# flags.destructive-manifest.summary

Write a destructive-changes manifest for the classes found. Does not modify the org.

# flags.dead-only.summary

Limit the manifest to unreferenced classes, excluding test-only classes and their tests.

# flags.include-suppressed.summary

Also report classes suppressed as entry points, test classes, or DI-bound.

# flags.ignore.summary

Class-name pattern to exclude from results. Supports `*`. Repeatable.

# error.invalidOrder

`--order` must be a decimal-like value such as `10.1` or `10.2`.

# error.bindingNameTooLong

The generated binding developer name `%s` is longer than the 40-character Salesforce limit.

# error.fieldsetNameTooLong

The generated field set name `%s` is longer than the 40-character Salesforce limit.
