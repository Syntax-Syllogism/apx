---
title: APX documentation
description: Guides for generating Apex Enterprise Patterns code and analyzing dead Apex classes.
---

APX is a Salesforce CLI plugin for generating Apex Enterprise Patterns (fflib
and AT4DX) code and finding Apex classes with no known inbound references.

## Guides

- [Getting started](getting-started.md) — install APX and generate your first
  Domain, Selector, Service, or Unit of Work artifacts.
- [Command details](command-details.md) — understand flavor selection, naming,
  binding metadata, and dry-run behavior.
- [Dead-code analysis](dead-code.md) — review dependency analysis results and
  produce safe destructive manifests.

For the complete flag reference, see the [README command reference](https://github.com/Syntax-Syllogism/apx/blob/v0.2.4/README.md#commands)
or run any command with `--help`.
