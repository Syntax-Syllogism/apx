export type ClassMetaViewModel = { apiVersion: string };
export type TriggerMetaViewModel = { apiVersion: string };

export type SelectorViewModel = {
  apiName: string;
  implementationClassName: string;
  interfaceClassName: string;
  fieldNames: string[];
};

export type SelectorBindingViewModel = {
  applicationFactoryLabel: string;
  bindingSObjectAlternateValue: string;
  bindingSObjectValue: string;
  implementationClassName: string;
};

export type DomainViewModel = {
  apiName: string;
  implementationClassName: string;
  interfaceClassName: string;
};

export type DomainBindingViewModel = {
  applicationFactoryLabel: string;
  bindingSObjectAlternateValue: string;
  bindingSObjectValue: string;
  implementationClassName: string;
};

export type TriggerViewModel = {
  apiName: string;
  domainImplementationClassName: string;
};

export type ServiceFacadeViewModel = {
  facadeClassName: string;
  interfaceClassName: string;
};

export type ServiceInterfaceViewModel = { interfaceClassName: string };
export type ServiceImplViewModel = { implementationClassName: string; interfaceClassName: string };
export type ServiceExceptionViewModel = { exceptionClassName: string };
export type ServiceUnitTestViewModel = { unitTestClassName: string };

export type ServiceBindingViewModel = {
  interfaceClassName: string;
  implementationClassName: string;
};

export type UnitOfWorkBindingViewModel = {
  applicationFactoryLabel: string;
  bindingSObjectAlternateValue: string;
  bindingSObjectValue: string;
  bindingSequenceValue: string;
};

export type SelectorMethodViewModel = {
  className: string;
  apiName: string;
  selectorImplementationClassName: string;
};

export type SelectorMethodUnitTestViewModel = {
  unitTestClassName: string;
  className: string;
  selectorImplementationClassName: string;
};

export type CriteriaClassViewModel = { className: string; sobjectApiName: string };

export type ActionClassViewModel = { className: string; sobjectApiName: string };

export type DomainProcessTestViewModel = {
  className: string;
  unitTestClassName: string;
  sobjectApiName: string;
};

export type DomainProcessBindingViewModel = {
  label: string;
  classToInject: string;
  sobjectApiName: string;
  triggerOperation: string;
  orderOfExecution: string;
  processContext: string;
  type: 'Criteria' | 'Action';
  description: string;
  executeAsynchronous: boolean;
  logicalInverse: boolean;
  preventRecursive: boolean;
};

export type FieldSetViewModel = {
  fieldsetName: string;
  label: string;
  description: string;
  fieldNames: string[];
};

export type SelectorInclusionBindingViewModel = {
  label: string;
  fieldsetName: string;
  sobjectApiName: string;
};
