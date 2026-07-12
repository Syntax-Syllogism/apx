import { expect } from 'chai';
import { render } from '../../src/aep/templates/registry.js';

describe('aep templates registry', () => {
  it('does not html-escape output', () => {
    const xml = render('unitOfWorkBinding', 'at4dx', {
      applicationFactoryLabel: 'Account',
      bindingSObjectAlternateValue: '<value xsi:nil="true"/>',
      bindingSObjectValue: '<value xsi:type="xsd:string">Account</value>',
      bindingSequenceValue: '1000.0',
    });
    expect(xml).to.include('<value xsi:type="xsd:string">Account</value>');
  });

  it('renders selector binding custom/standard orientation correctly', () => {
    const standard = render('selectorBinding', 'at4dx', {
      applicationFactoryLabel: 'Account',
      bindingSObjectAlternateValue: '<value xsi:nil="true"/>',
      bindingSObjectValue: '<value xsi:type="xsd:string">Account</value>',
      implementationClassName: 'AccountsSelector',
    });
    expect(standard).to.include('<field>BindingSObjectAlternate__c</field>');
    expect(standard).to.include('<value xsi:nil="true"/>');
    expect(standard).to.include('<field>BindingSObject__c</field>');
    expect(standard).to.include('<value xsi:type="xsd:string">Account</value>');
  });

  it('renders domain binding custom/standard orientation correctly', () => {
    const custom = render('domainBinding', 'at4dx', {
      applicationFactoryLabel: 'Property',
      bindingSObjectAlternateValue: '<value xsi:type="xsd:string">Property__c</value>',
      bindingSObjectValue: '<value xsi:nil="true"/>',
      implementationClassName: 'Properties',
    });
    expect(custom).to.include('<field>BindingSObjectAlternate__c</field>');
    expect(custom).to.include('<value xsi:type="xsd:string">Property__c</value>');
    expect(custom).to.include('<field>BindingSObject__c</field>');
    expect(custom).to.include('<value xsi:nil="true"/>');
  });

  it('renders service and unit-of-work bindings', () => {
    const service = render('serviceBinding', 'at4dx', {
      interfaceClassName: 'ILimitMonitorsService',
      implementationClassName: 'LimitMonitorsServiceImpl',
    });
    expect(service).to.include('<field>BindingInterface__c</field>');
    expect(service).to.include('ILimitMonitorsService');

    const uow = render('unitOfWorkBinding', 'at4dx', {
      applicationFactoryLabel: 'Account',
      bindingSObjectAlternateValue: '<value xsi:nil="true"/>',
      bindingSObjectValue: '<value xsi:type="xsd:string">Account</value>',
      bindingSequenceValue: '1234.5',
    });
    expect(uow).to.include('<field>BindingSequence__c</field>');
    expect(uow).to.include('<value xsi:type="xsd:double">1234.5</value>');
  });

  it('renders domain-process bindings and field-injection metadata', () => {
    const criteriaBinding = render('domainProcessBinding', 'at4dx', {
      label: 'FishCompanySlogans10_10Criteria',
      classToInject: 'AccountNameContainsFishCriteria',
      sobjectApiName: 'Account',
      triggerOperation: 'Before_Insert',
      orderOfExecution: '10.1',
      processContext: 'TriggerExecution',
      type: 'Criteria',
      description: 'Generated "description"',
      executeAsynchronous: false,
      logicalInverse: false,
      preventRecursive: false,
    });
    expect(criteriaBinding).to.include('<field>RelatedDomainBindingSObjectAlternate__c</field>');
    expect(criteriaBinding).to.include('<value xsi:nil="true"/>');
    expect(criteriaBinding).to.include('<field>Type__c</field>');
    expect(criteriaBinding).to.include('<value xsi:type="xsd:string">Criteria</value>');
    expect(criteriaBinding).to.include('Generated "description"');

    const fieldSet = render('selectorInclusionFieldSet', 'at4dx', {
      fieldsetName: 'SelectorInclusion_AccountFields',
      label: 'SelectorInclusion_AccountFields',
      description: 'Fields &lt;for&gt; selector',
      fieldNames: ['Name', 'Industry'],
    });
    expect(fieldSet).to.include('<fullName>SelectorInclusion_AccountFields</fullName>');
    expect(fieldSet).to.include('<field>Name</field>');
    expect(fieldSet).to.include('<field>Industry</field>');

    const inclusionBinding = render('selectorConfigFieldSetInclusionBinding', 'at4dx', {
      label: 'SelectorInclusion_AccountFields',
      fieldsetName: 'SelectorInclusion_AccountFields',
      sobjectApiName: 'Account',
    });
    expect(inclusionBinding).to.include('<field>FieldsetName__c</field>');
    expect(inclusionBinding).to.include('<value xsi:type="xsd:string">SelectorInclusion_AccountFields</value>');
  });
});
