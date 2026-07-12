import { Eta } from 'eta';
import type { ArtifactId, Flavor } from '../model/types.js';
import { apexClassMeta } from './apex/apexClassMeta.js';
import { actionClass } from './apex/actionClass.js';
import { actionUnitTest } from './apex/actionUnitTest.js';
import { criteriaClass } from './apex/criteriaClass.js';
import { criteriaUnitTest } from './apex/criteriaUnitTest.js';
import { domainProcessBinding } from './apex/domainProcessBinding.js';
import { domainAt4dxClass } from './apex/domainAt4dxClass.js';
import { domainAt4dxInterface } from './apex/domainAt4dxInterface.js';
import { domainBinding } from './apex/domainBinding.js';
import { domainFflibClass } from './apex/domainFflibClass.js';
import { domainFflibInterface } from './apex/domainFflibInterface.js';
import { domainTrigger } from './apex/domainTrigger.js';
import { domainUnitTest } from './apex/domainUnitTest.js';
import { selectorAt4dxClass } from './apex/selectorAt4dxClass.js';
import { selectorAt4dxInterface } from './apex/selectorAt4dxInterface.js';
import { selectorAt4dxUnitTest } from './apex/selectorAt4dxUnitTest.js';
import { selectorBinding } from './apex/selectorBinding.js';
import { selectorFflibClass } from './apex/selectorFflibClass.js';
import { selectorFflibInterface } from './apex/selectorFflibInterface.js';
import { selectorFflibUnitTest } from './apex/selectorFflibUnitTest.js';
import { selectorConfigFieldSetInclusionBinding } from './apex/selectorConfigFieldSetInclusionBinding.js';
import { selectorInclusionFieldSet } from './apex/selectorInclusionFieldSet.js';
import { selectorMethodClass } from './apex/selectorMethodClass.js';
import { selectorMethodUnitTest } from './apex/selectorMethodUnitTest.js';
import { serviceBinding } from './apex/serviceBinding.js';
import { serviceException } from './apex/serviceException.js';
import { serviceFacade } from './apex/serviceFacade.js';
import { serviceImpl } from './apex/serviceImpl.js';
import { serviceInterface } from './apex/serviceInterface.js';
import { serviceUnitTest } from './apex/serviceUnitTest.js';
import { triggerMeta } from './apex/triggerMeta.js';
import { unitOfWorkBinding } from './apex/unitOfWorkBinding.js';

const eta = new Eta({ autoEscape: false, autoTrim: false });

const withFlavor = (artifactId: ArtifactId, flavor: Flavor): string => `${artifactId}:${flavor}`;

const templateByKey = new Map<string, string>([
  [withFlavor('selectorClass', 'at4dx'), selectorAt4dxClass],
  [withFlavor('selectorClass', 'fflib'), selectorFflibClass],
  [withFlavor('selectorInterface', 'at4dx'), selectorAt4dxInterface],
  [withFlavor('selectorInterface', 'fflib'), selectorFflibInterface],
  [withFlavor('selectorUnitTest', 'at4dx'), selectorAt4dxUnitTest],
  [withFlavor('selectorUnitTest', 'fflib'), selectorFflibUnitTest],
  [withFlavor('selectorBinding', 'at4dx'), selectorBinding],
  [withFlavor('criteriaClass', 'at4dx'), criteriaClass],
  [withFlavor('criteriaUnitTest', 'at4dx'), criteriaUnitTest],
  [withFlavor('actionClass', 'at4dx'), actionClass],
  [withFlavor('actionUnitTest', 'at4dx'), actionUnitTest],
  [withFlavor('domainProcessBinding', 'at4dx'), domainProcessBinding],
  [withFlavor('selectorInclusionFieldSet', 'at4dx'), selectorInclusionFieldSet],
  [withFlavor('selectorConfigFieldSetInclusionBinding', 'at4dx'), selectorConfigFieldSetInclusionBinding],
  [withFlavor('domainClass', 'at4dx'), domainAt4dxClass],
  [withFlavor('domainClass', 'fflib'), domainFflibClass],
  [withFlavor('domainInterface', 'at4dx'), domainAt4dxInterface],
  [withFlavor('domainInterface', 'fflib'), domainFflibInterface],
  [withFlavor('domainUnitTest', 'at4dx'), domainUnitTest],
  [withFlavor('domainUnitTest', 'fflib'), domainUnitTest],
  [withFlavor('domainTrigger', 'at4dx'), domainTrigger],
  [withFlavor('domainTrigger', 'fflib'), domainTrigger],
  [withFlavor('domainBinding', 'at4dx'), domainBinding],
  [withFlavor('serviceFacade', 'at4dx'), serviceFacade],
  [withFlavor('serviceFacade', 'fflib'), serviceFacade],
  [withFlavor('serviceInterface', 'at4dx'), serviceInterface],
  [withFlavor('serviceInterface', 'fflib'), serviceInterface],
  [withFlavor('serviceImpl', 'at4dx'), serviceImpl],
  [withFlavor('serviceImpl', 'fflib'), serviceImpl],
  [withFlavor('serviceException', 'at4dx'), serviceException],
  [withFlavor('serviceException', 'fflib'), serviceException],
  [withFlavor('serviceUnitTest', 'at4dx'), serviceUnitTest],
  [withFlavor('serviceUnitTest', 'fflib'), serviceUnitTest],
  [withFlavor('serviceBinding', 'at4dx'), serviceBinding],
  [withFlavor('serviceBinding', 'fflib'), serviceBinding],
  [withFlavor('unitOfWorkBinding', 'at4dx'), unitOfWorkBinding],
  [withFlavor('selectorMethodClass', 'at4dx'), selectorMethodClass],
  [withFlavor('selectorMethodClass', 'fflib'), selectorMethodClass],
  [withFlavor('selectorMethodUnitTest', 'at4dx'), selectorMethodUnitTest],
  [withFlavor('selectorMethodUnitTest', 'fflib'), selectorMethodUnitTest],
  [withFlavor('apexClassMeta', 'at4dx'), apexClassMeta],
  [withFlavor('apexClassMeta', 'fflib'), apexClassMeta],
  [withFlavor('triggerMeta', 'at4dx'), triggerMeta],
  [withFlavor('triggerMeta', 'fflib'), triggerMeta],
]);

export const getTemplateSource = (artifactId: ArtifactId, flavor: Flavor): string => {
  const template = templateByKey.get(withFlavor(artifactId, flavor));
  if (!template) throw new Error(`No template registered for artifact "${artifactId}" and flavor "${flavor}".`);
  return template;
};

export const render = (artifactId: ArtifactId, flavor: Flavor, viewModel: object): string => {
  const rendered = eta.renderString(getTemplateSource(artifactId, flavor), viewModel);
  if (typeof rendered !== 'string') throw new Error(`Template ${artifactId}/${flavor} returned no content.`);
  return rendered;
};
