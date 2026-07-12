# summary

Generate domain classes, tests, triggers, and metadata for an SObject.

# description

Describes the target SObject and scaffolds domain artifacts in either AT4DX or fflib flavor.

# info.created

Generated %s files (%s skipped).

# examples

- Generate AT4DX domain files:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --at4dx
