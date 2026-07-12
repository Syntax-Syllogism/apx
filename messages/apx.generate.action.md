# summary

Generate an AT4DX domain-process action class, test, and binding metadata.

# description

Creates offline action scaffolding and a DomainProcessBinding record without requiring an org connection.

# info.created

Generated %s files (%s skipped).

# info.reviewBinding

Review the generated binding defaults: RelatedDomainBindingSObjectAlternate__c (nil), ExecuteAsynchronous__c=false, LogicalInverse__c=false, PreventRecursive__c=false, ProcessContext__c=TriggerExecution, DomainMethodToken__c (nil), and Description__c.

# error.invalidOrder

`--order` must be a decimal-like value such as `10.1` or `10.2`.

# error.bindingNameTooLong

The generated binding developer name `%s` is longer than the 40-character Salesforce limit.

# examples

- Generate action artifacts with defaults:

  <%= config.bin %> <%= command.id %> -s Account -c DefaultAccountSloganBasedOnNameAction
