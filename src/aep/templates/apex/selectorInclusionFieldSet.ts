export const selectorInclusionFieldSet = `<?xml version="1.0" encoding="UTF-8"?>
<FieldSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName><%= it.fieldsetName %></fullName>
    <description><%= it.description %></description>
<% for (const fieldName of it.fieldNames) { %>    <displayedFields>
        <field><%= fieldName %></field>
        <isFieldManaged>false</isFieldManaged>
        <isRequired>false</isRequired>
    </displayedFields>
<% } %>    <label><%= it.label %></label>
</FieldSet>
`;
