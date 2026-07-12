# summary

Generate selector classes, tests, and metadata for an SObject.

# description

Describes the target SObject and scaffolds selector artifacts in either AT4DX or fflib flavor.

# info.created

Generated %s files (%s skipped).

# examples

- Generate AT4DX selector files:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --at4dx

- Generate fflib selector files with a prefix:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Property__c --fflib --prefix foobar
