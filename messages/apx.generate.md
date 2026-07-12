# summary

Generate multiple AEP artifact groups in one command run.

# description

Builds selector/domain/unit-of-work plans from one SObject describe and writes all selected outputs in a single manifest.

# errorNothingSelected

Select at least one artifact group: --selector, --domain, or --unit-of-work.

# info.summary

Generated %s files (%s skipped).

# info.dryRunSummary

Dry-run planned %s files.

# info.fflibSnippet

Please add the following binding to Application.cls (fflib_Application.UnitOfWorkFactory entry):

# examples

- Generate selector, domain, and unit-of-work in AT4DX style:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --selector --domain --unit-of-work --at4dx
