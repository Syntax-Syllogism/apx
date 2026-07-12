export const domainBinding = `<?xml version="1.0" encoding="UTF-8"?>
<CustomMetadata xmlns="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <label><%= it.applicationFactoryLabel %></label>
    <protected>false</protected>
    <values>
        <field>BindingSObjectAlternate__c</field>
        <%= it.bindingSObjectAlternateValue %>
    </values>
    <values>
        <field>BindingSObject__c</field>
        <%= it.bindingSObjectValue %>
    </values>
    <values>
        <field>To__c</field>
        <value xsi:type="xsd:string"><%= it.implementationClassName %></value>
    </values>
</CustomMetadata>
`;
