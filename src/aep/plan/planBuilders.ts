import type { SObjectDescribeView } from '../describe/describe.js';
import type { GenerationPlan, PlannedArtifact } from '../model/types.js';
import type { Flavor } from '../model/types.js';
import {
  type DomainProcessNames,
  type FieldInjectionNames,
  classFilename,
  classMetadataFilename,
  type SelectorMethodNames,
  type ServiceNames,
  type SObjectNames,
  triggerFilename,
  triggerMetadataFilename,
} from '../naming/naming.js';
import { PathResolver } from '../paths/paths.js';
import { render } from '../templates/registry.js';

const artifact = (id: PlannedArtifact['id'], relativePath: string, content: string): PlannedArtifact => ({
  id,
  relativePath,
  content,
});

const escapeXmlText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const bindingSObjectAlternateValue = (isCustom: boolean, apiName: string): string =>
  isCustom ? `<value xsi:type="xsd:string">${apiName}</value>` : '<value xsi:nil="true"/>';

const bindingSObjectValue = (isCustom: boolean, apiName: string): string =>
  isCustom ? '<value xsi:nil="true"/>' : `<value xsi:type="xsd:string">${apiName}</value>`;

export const buildSelectorPlan = (args: {
  names: SObjectNames;
  view: SObjectDescribeView;
  flavor: Flavor;
  apiVersion: string;
  paths: PathResolver;
  includeBinding: boolean;
}): GenerationPlan => {
  const { names, view, flavor, apiVersion, paths } = args;
  const selectorVm = {
    apiName: view.apiName,
    implementationClassName: names.selectorImplementationClassName,
    interfaceClassName: names.selectorInterfaceClassName,
    fieldNames: view.fieldNames,
  };
  const classMetaVm = { apiVersion };

  const artifacts: PlannedArtifact[] = [
    artifact(
      'selectorClass',
      `${paths.selectorClassDir()}/${classFilename(names.selectorImplementationClassName)}`,
      render('selectorClass', flavor, selectorVm)
    ),
    artifact(
      'apexClassMeta',
      `${paths.selectorClassDir()}/${classMetadataFilename(names.selectorImplementationClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'selectorInterface',
      `${paths.selectorClassDir()}/${classFilename(names.selectorInterfaceClassName)}`,
      render('selectorInterface', flavor, selectorVm)
    ),
    artifact(
      'apexClassMeta',
      `${paths.selectorClassDir()}/${classMetadataFilename(names.selectorInterfaceClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'selectorUnitTest',
      `${paths.selectorTestDir()}/${classFilename(names.selectorUnitTestClassName)}`,
      render('selectorUnitTest', flavor, selectorVm)
    ),
    artifact(
      'apexClassMeta',
      `${paths.selectorTestDir()}/${classMetadataFilename(names.selectorUnitTestClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
  ];

  if (args.includeBinding) {
    artifacts.push(
      artifact(
        'selectorBinding',
        `${paths.selectorBindingDir()}/${names.selectorBindingMetadataFileName}`,
        render('selectorBinding', flavor, {
          applicationFactoryLabel: names.applicationFactoryLabel,
          bindingSObjectAlternateValue: bindingSObjectAlternateValue(names.isCustom, names.apiName),
          bindingSObjectValue: bindingSObjectValue(names.isCustom, names.apiName),
          implementationClassName: names.selectorImplementationClassName,
        })
      )
    );
  }

  return { artifacts };
};

export const buildDomainPlan = (args: {
  names: SObjectNames;
  view: SObjectDescribeView;
  flavor: Flavor;
  apiVersion: string;
  paths: PathResolver;
  includeBinding: boolean;
}): GenerationPlan => {
  const { names, view, flavor, apiVersion, paths } = args;
  const domainVm = {
    apiName: view.apiName,
    implementationClassName: names.domainImplementationClassName,
    interfaceClassName: names.domainInterfaceClassName,
  };
  const classMetaVm = { apiVersion };
  const triggerVm = {
    apiName: view.apiName,
    domainImplementationClassName: names.domainImplementationClassName,
  };

  const artifacts: PlannedArtifact[] = [
    artifact(
      'domainClass',
      `${paths.domainClassDir()}/${classFilename(names.domainImplementationClassName)}`,
      render('domainClass', flavor, domainVm)
    ),
    artifact(
      'apexClassMeta',
      `${paths.domainClassDir()}/${classMetadataFilename(names.domainImplementationClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'domainInterface',
      `${paths.domainClassDir()}/${classFilename(names.domainInterfaceClassName)}`,
      render('domainInterface', flavor, domainVm)
    ),
    artifact(
      'apexClassMeta',
      `${paths.domainClassDir()}/${classMetadataFilename(names.domainInterfaceClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'domainUnitTest',
      `${paths.domainTestDir()}/${classFilename(names.domainUnitTestClassName)}`,
      render('domainUnitTest', flavor, domainVm)
    ),
    artifact(
      'apexClassMeta',
      `${paths.domainTestDir()}/${classMetadataFilename(names.domainUnitTestClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'domainTrigger',
      `${paths.triggerDir()}/${triggerFilename(names.domainImplementationClassName)}`,
      render('domainTrigger', flavor, triggerVm)
    ),
    artifact(
      'triggerMeta',
      `${paths.triggerDir()}/${triggerMetadataFilename(names.domainImplementationClassName)}`,
      render('triggerMeta', flavor, classMetaVm)
    ),
  ];

  if (args.includeBinding) {
    artifacts.push(
      artifact(
        'domainBinding',
        `${paths.domainBindingDir()}/${names.domainBindingMetadataFileName}`,
        render('domainBinding', flavor, {
          applicationFactoryLabel: names.applicationFactoryLabel,
          bindingSObjectAlternateValue: bindingSObjectAlternateValue(names.isCustom, names.apiName),
          bindingSObjectValue: bindingSObjectValue(names.isCustom, names.apiName),
          implementationClassName: names.domainImplementationClassName,
        })
      )
    );
  }

  return { artifacts };
};

export const buildServicePlan = (args: {
  names: ServiceNames;
  flavor: Flavor;
  apiVersion: string;
  paths: PathResolver;
  includeBinding: boolean;
}): GenerationPlan => {
  const { names, flavor, apiVersion, paths, includeBinding } = args;
  const classMetaVm = { apiVersion };

  const artifacts: PlannedArtifact[] = [
    artifact(
      'serviceFacade',
      `${paths.serviceClassDir()}/${classFilename(names.facadeClassName)}`,
      render('serviceFacade', flavor, {
        facadeClassName: names.facadeClassName,
        interfaceClassName: names.interfaceClassName,
      })
    ),
    artifact(
      'apexClassMeta',
      `${paths.serviceClassDir()}/${classMetadataFilename(names.facadeClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'serviceInterface',
      `${paths.serviceClassDir()}/${classFilename(names.interfaceClassName)}`,
      render('serviceInterface', flavor, {
        interfaceClassName: names.interfaceClassName,
      })
    ),
    artifact(
      'apexClassMeta',
      `${paths.serviceClassDir()}/${classMetadataFilename(names.interfaceClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'serviceImpl',
      `${paths.serviceClassDir()}/${classFilename(names.implementationClassName)}`,
      render('serviceImpl', flavor, {
        implementationClassName: names.implementationClassName,
        interfaceClassName: names.interfaceClassName,
      })
    ),
    artifact(
      'apexClassMeta',
      `${paths.serviceClassDir()}/${classMetadataFilename(names.implementationClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'serviceException',
      `${paths.serviceClassDir()}/${classFilename(names.exceptionClassName)}`,
      render('serviceException', flavor, {
        exceptionClassName: names.exceptionClassName,
      })
    ),
    artifact(
      'apexClassMeta',
      `${paths.serviceClassDir()}/${classMetadataFilename(names.exceptionClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
    artifact(
      'serviceUnitTest',
      `${paths.serviceTestDir()}/${classFilename(names.unitTestClassName)}`,
      render('serviceUnitTest', flavor, {
        unitTestClassName: names.unitTestClassName,
      })
    ),
    artifact(
      'apexClassMeta',
      `${paths.serviceTestDir()}/${classMetadataFilename(names.unitTestClassName)}`,
      render('apexClassMeta', flavor, classMetaVm)
    ),
  ];

  if (includeBinding) {
    artifacts.push(
      artifact(
        'serviceBinding',
        `${paths.serviceBindingDir()}/${names.bindingMetadataFileName}`,
        render('serviceBinding', flavor, {
          interfaceClassName: names.interfaceClassName,
          implementationClassName: names.implementationClassName,
        })
      )
    );
  }

  return { artifacts };
};

export const buildUnitOfWorkPlan = (args: {
  names: SObjectNames;
  flavor: Flavor;
  paths: PathResolver;
  bindingSequenceValue: string;
}): GenerationPlan => {
  if (args.flavor !== 'at4dx') return { artifacts: [] };
  return {
    artifacts: [
      artifact(
        'unitOfWorkBinding',
        `${args.paths.uowBindingDir()}/${args.names.unitOfWorkBindingMetadataFileName}`,
        render('unitOfWorkBinding', args.flavor, {
          applicationFactoryLabel: args.names.applicationFactoryLabel,
          bindingSObjectAlternateValue: bindingSObjectAlternateValue(args.names.isCustom, args.names.apiName),
          bindingSObjectValue: bindingSObjectValue(args.names.isCustom, args.names.apiName),
          bindingSequenceValue: args.bindingSequenceValue,
        })
      ),
    ],
  };
};

export const buildSelectorMethodPlan = (args: {
  names: SelectorMethodNames;
  flavor: Flavor;
  apiVersion: string;
  paths: PathResolver;
}): GenerationPlan => {
  const { names, flavor, apiVersion, paths } = args;
  return {
    artifacts: [
      artifact(
        'selectorMethodClass',
        `${paths.selectorClassDir()}/${classFilename(names.className)}`,
        render('selectorMethodClass', flavor, {
          className: names.className,
          apiName: names.sobjectApiName,
          selectorImplementationClassName: names.sobjectSelectorClassName,
        })
      ),
      artifact(
        'apexClassMeta',
        `${paths.selectorClassDir()}/${classMetadataFilename(names.className)}`,
        render('apexClassMeta', flavor, { apiVersion })
      ),
      artifact(
        'selectorMethodUnitTest',
        `${paths.selectorTestDir()}/${classFilename(names.unitTestClassName)}`,
        render('selectorMethodUnitTest', flavor, {
          unitTestClassName: names.unitTestClassName,
          className: names.className,
          selectorImplementationClassName: names.sobjectSelectorClassName,
        })
      ),
      artifact(
        'apexClassMeta',
        `${paths.selectorTestDir()}/${classMetadataFilename(names.unitTestClassName)}`,
        render('apexClassMeta', flavor, { apiVersion })
      ),
    ],
  };
};

export const buildCriteriaPlan = (args: {
  names: DomainProcessNames;
  flavor: Flavor;
  apiVersion: string;
  triggerOperation: string;
  orderOfExecution: string;
  description: string;
  paths: PathResolver;
}): GenerationPlan => {
  const { names, flavor, apiVersion, triggerOperation, orderOfExecution, description, paths } = args;
  return {
    artifacts: [
      artifact(
        'criteriaClass',
        `${paths.criteriaClassDir()}/${classFilename(names.className)}`,
        render('criteriaClass', flavor, {
          className: names.className,
          sobjectApiName: names.sobjectApiName,
        })
      ),
      artifact(
        'apexClassMeta',
        `${paths.criteriaClassDir()}/${classMetadataFilename(names.className)}`,
        render('apexClassMeta', flavor, { apiVersion })
      ),
      artifact(
        'criteriaUnitTest',
        `${paths.criteriaTestDir()}/${classFilename(names.unitTestClassName)}`,
        render('criteriaUnitTest', flavor, {
          className: names.className,
          unitTestClassName: names.unitTestClassName,
          sobjectApiName: names.sobjectApiName,
        })
      ),
      artifact(
        'apexClassMeta',
        `${paths.criteriaTestDir()}/${classMetadataFilename(names.unitTestClassName)}`,
        render('apexClassMeta', flavor, { apiVersion })
      ),
      artifact(
        'domainProcessBinding',
        `${paths.domainProcessBindingDir()}/${names.bindingMetadataFileName}`,
        render('domainProcessBinding', flavor, {
          label: names.bindingDeveloperName,
          classToInject: names.className,
          sobjectApiName: names.sobjectApiName,
          triggerOperation,
          orderOfExecution,
          processContext: 'TriggerExecution',
          type: 'Criteria',
          description: escapeXmlText(description),
          executeAsynchronous: false,
          logicalInverse: false,
          preventRecursive: false,
        })
      ),
    ],
  };
};

export const buildActionPlan = (args: {
  names: DomainProcessNames;
  flavor: Flavor;
  apiVersion: string;
  triggerOperation: string;
  orderOfExecution: string;
  description: string;
  paths: PathResolver;
}): GenerationPlan => {
  const { names, flavor, apiVersion, triggerOperation, orderOfExecution, description, paths } = args;
  return {
    artifacts: [
      artifact(
        'actionClass',
        `${paths.actionClassDir()}/${classFilename(names.className)}`,
        render('actionClass', flavor, {
          className: names.className,
          sobjectApiName: names.sobjectApiName,
        })
      ),
      artifact(
        'apexClassMeta',
        `${paths.actionClassDir()}/${classMetadataFilename(names.className)}`,
        render('apexClassMeta', flavor, { apiVersion })
      ),
      artifact(
        'actionUnitTest',
        `${paths.actionTestDir()}/${classFilename(names.unitTestClassName)}`,
        render('actionUnitTest', flavor, {
          className: names.className,
          unitTestClassName: names.unitTestClassName,
          sobjectApiName: names.sobjectApiName,
        })
      ),
      artifact(
        'apexClassMeta',
        `${paths.actionTestDir()}/${classMetadataFilename(names.unitTestClassName)}`,
        render('apexClassMeta', flavor, { apiVersion })
      ),
      artifact(
        'domainProcessBinding',
        `${paths.domainProcessBindingDir()}/${names.bindingMetadataFileName}`,
        render('domainProcessBinding', flavor, {
          label: names.bindingDeveloperName,
          classToInject: names.className,
          sobjectApiName: names.sobjectApiName,
          triggerOperation,
          orderOfExecution,
          processContext: 'TriggerExecution',
          type: 'Action',
          description: escapeXmlText(description),
          executeAsynchronous: false,
          logicalInverse: false,
          preventRecursive: false,
        })
      ),
    ],
  };
};

export const buildFieldInjectionPlan = (args: {
  names: FieldInjectionNames;
  flavor: Flavor;
  fieldNames: string[];
  label: string;
  description: string;
  paths: PathResolver;
}): GenerationPlan => {
  const { names, flavor, fieldNames, label, description, paths } = args;
  return {
    artifacts: [
      artifact(
        'selectorInclusionFieldSet',
        `${paths.fieldSetDir(names.sobjectApiName)}/${names.fieldSetFileName}`,
        render('selectorInclusionFieldSet', flavor, {
          fieldsetName: names.fieldsetName,
          label,
          description: escapeXmlText(description),
          fieldNames,
        })
      ),
      artifact(
        'selectorConfigFieldSetInclusionBinding',
        `${paths.selectorInclusionBindingDir()}/${names.bindingMetadataFileName}`,
        render('selectorConfigFieldSetInclusionBinding', flavor, {
          label,
          fieldsetName: names.fieldsetName,
          sobjectApiName: names.sobjectApiName,
        })
      ),
    ],
  };
};

export const combinePlans = (...plans: GenerationPlan[]): GenerationPlan => ({
  artifacts: plans.flatMap((plan) => plan.artifacts),
});
