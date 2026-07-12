# summary

Generate AT4DX selector field-injection metadata (fieldset + binding).

# description

Creates a FieldSet and SelectorConfig_FieldSetInclusion binding offline from a comma-separated field list.

# info.created

Generated %s files (%s skipped).

# info.reviewBinding

Review the generated binding defaults: BindingSObjectAlternate__c (nil), IsActive__c=true, and metadata label/description values.

# error.fieldsetNameTooLong

The generated field set name `%s` is longer than the 40-character Salesforce limit.

# examples

- Generate field-injection metadata:

  <%= config.bin %> <%= command.id %> -s Account --fields Name,Industry
