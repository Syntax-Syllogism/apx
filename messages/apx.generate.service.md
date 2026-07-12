# summary

Generate service facade/interface/implementation classes and metadata.

# description

Builds service-layer Apex artifacts for the provided basename and flavor.

# info.created

Generated %s files (%s skipped).

# examples

- Generate an AT4DX service set:

  <%= config.bin %> <%= command.id %> --target-org myOrg --service-basename LimitMonitors --at4dx
