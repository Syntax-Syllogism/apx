# summary

Generate unit-of-work binding metadata for an SObject.

# description

Creates AT4DX unit-of-work binding metadata or prints the fflib Application snippet.

# info.created

Generated %s files (%s skipped).

# info.fflibSnippet

Please add the following binding to Application.cls (fflib_Application.UnitOfWorkFactory entry):

# examples

- Generate AT4DX unit-of-work binding:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --at4dx
