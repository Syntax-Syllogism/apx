import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';
import { toDescribeView } from '../../src/aep/describe/describe.js';
import {
  buildActionNames,
  buildCriteriaNames,
  buildFieldInjectionNames,
  buildSelectorMethodNames,
  buildServiceNames,
  buildSObjectNames,
} from '../../src/aep/naming/naming.js';
import { PathResolver } from '../../src/aep/paths/paths.js';
import {
  buildActionPlan,
  buildCriteriaPlan,
  buildDomainPlan,
  buildFieldInjectionPlan,
  buildSelectorMethodPlan,
  buildSelectorPlan,
  buildServicePlan,
  buildUnitOfWorkPlan,
} from '../../src/aep/plan/planBuilders.js';

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

describe('aep plan builders', () => {
  it('builds fflib selector content that matches golden', () => {
    const describe = readJson<{
      name: string;
      custom: boolean;
      fields: Array<{ name: string; type?: string; filterable?: boolean }>;
    }>(join('test', 'fixtures', 'aep', 'describe', 'account.json'));
    const view = toDescribeView(describe);
    const names = buildSObjectNames({ apiName: view.apiName, isCustom: view.isCustom });
    const plan = buildSelectorPlan({
      names,
      view,
      flavor: 'fflib',
      apiVersion: '62.0',
      paths: new PathResolver(),
      includeBinding: false,
    });
    const classArtifact = plan.artifacts.find((a) => a.relativePath.endsWith('/AccountsSelector.cls'));
    const golden = readFileSync(
      join('test', 'fixtures', 'aep', 'golden', 'fflib', 'account', 'selector', 'AccountsSelector.cls'),
      'utf8'
    );
    expect(classArtifact?.content.trimEnd()).to.equal(golden.trimEnd());
  });

  it('builds at4dx domain trigger content that matches golden', () => {
    const describe = readJson<{
      name: string;
      custom: boolean;
      fields: Array<{ name: string; type?: string; filterable?: boolean }>;
    }>(join('test', 'fixtures', 'aep', 'describe', 'property__c.json'));
    const view = toDescribeView(describe);
    const names = buildSObjectNames({ apiName: view.apiName, isCustom: view.isCustom });
    const plan = buildDomainPlan({
      names,
      view,
      flavor: 'at4dx',
      apiVersion: '62.0',
      paths: new PathResolver(),
      includeBinding: true,
    });
    const triggerArtifact = plan.artifacts.find((a) => a.relativePath.endsWith('/Properties.trigger'));
    const bindingArtifact = plan.artifacts.find((a) => a.id === 'domainBinding');
    const golden = readFileSync(
      join('test', 'fixtures', 'aep', 'golden', 'at4dx', 'property__c', 'domain', 'Properties.trigger'),
      'utf8'
    );
    expect(triggerArtifact?.content.trimEnd()).to.equal(golden.trimEnd());
    expect(bindingArtifact?.relativePath).to.equal(
      'main/schema/custommetadata/applicationFactoryBindings/domainBindings/ApplicationFactory_DomainBinding.Property.md-meta.xml'
    );
  });

  it('builds service and selector-method plans', () => {
    const service = buildServiceNames({ basename: 'LimitMonitors' });
    const servicePlan = buildServicePlan({
      names: service,
      flavor: 'at4dx',
      apiVersion: '62.0',
      paths: new PathResolver(),
      includeBinding: true,
    });
    const iface = servicePlan.artifacts.find((a) => a.relativePath.endsWith('/ILimitMonitorsService.cls'));
    const serviceGolden = readFileSync(
      join('test', 'fixtures', 'aep', 'golden', 'at4dx', 'service', 'limitMonitors', 'ILimitMonitorsService.cls'),
      'utf8'
    );
    expect(iface?.content.trimEnd()).to.equal(serviceGolden.trimEnd());

    const methodNames = buildSelectorMethodNames({
      className: 'SelectBySloganMethod',
      sobjectApiName: 'Account',
      sobjectSelectorClassName: 'AccountsSelector',
    });
    const methodPlan = buildSelectorMethodPlan({
      names: methodNames,
      flavor: 'at4dx',
      apiVersion: '62.0',
      paths: new PathResolver(),
    });
    const methodClass = methodPlan.artifacts.find((a) => a.relativePath.endsWith('/SelectBySloganMethod.cls'));
    const methodGolden = readFileSync(
      join('test', 'fixtures', 'aep', 'golden', 'at4dx', 'selectorMethod', 'SelectBySloganMethod.cls'),
      'utf8'
    );
    expect(methodClass?.content.trimEnd()).to.equal(methodGolden.trimEnd());
  });

  it('builds unit-of-work only for at4dx', () => {
    const names = buildSObjectNames({ apiName: 'Account', isCustom: false });
    const at4dxPlan = buildUnitOfWorkPlan({
      names,
      flavor: 'at4dx',
      paths: new PathResolver(),
      bindingSequenceValue: '1200.0',
    });
    const fflibPlan = buildUnitOfWorkPlan({
      names,
      flavor: 'fflib',
      paths: new PathResolver(),
      bindingSequenceValue: '1200.0',
    });
    expect(at4dxPlan.artifacts).to.have.length(1);
    expect(fflibPlan.artifacts).to.have.length(0);
  });

  it('builds criteria/action plans with expected artifacts and golden content', () => {
    const paths = new PathResolver();

    const criteriaNames = buildCriteriaNames({
      className: 'AccountNameContainsFishCriteria',
      sobjectApiName: 'Account',
      processName: 'FishCompanySlogans',
      order: '10.10',
    });
    const criteriaPlan = buildCriteriaPlan({
      names: criteriaNames,
      flavor: 'at4dx',
      apiVersion: '62.0',
      triggerOperation: 'Before_Insert',
      orderOfExecution: '10.1',
      description: 'Review generated criteria binding for AccountNameContainsFishCriteria.',
      paths,
    });
    expect(criteriaPlan.artifacts.map((a) => a.id)).to.deep.equal([
      'criteriaClass',
      'apexClassMeta',
      'criteriaUnitTest',
      'apexClassMeta',
      'domainProcessBinding',
    ]);
    expect(criteriaPlan.artifacts[0].relativePath).to.equal(
      'main/classes/criteria/AccountNameContainsFishCriteria.cls'
    );
    expect(criteriaPlan.artifacts[4].relativePath).to.equal(
      'main/schema/custommetadata/applicationFactoryBindings/domainProcessBindings/DomainProcessBinding.FishCompanySlogans10_10Criteria.md-meta.xml'
    );

    const criteriaClassGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'criteria',
        'AccountNameContainsFishCriteria.cls'
      ),
      'utf8'
    );
    expect(criteriaPlan.artifacts[0].content.trimEnd()).to.equal(criteriaClassGolden.trimEnd());
    const criteriaTestGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'criteria',
        'AccountNameContainsFishCriteriaTest.cls'
      ),
      'utf8'
    );
    expect(criteriaPlan.artifacts[2].content.trimEnd()).to.equal(criteriaTestGolden.trimEnd());
    const criteriaBindingGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'criteria',
        'DomainProcessBinding.FishCompanySlogans10_10Criteria.md-meta.xml'
      ),
      'utf8'
    );
    expect(criteriaPlan.artifacts[4].content.trimEnd()).to.equal(criteriaBindingGolden.trimEnd());

    const actionNames = buildActionNames({
      className: 'DefaultAccountSloganBasedOnNameAction',
      sobjectApiName: 'Account',
      processName: 'FishCompanySlogans',
      order: '10.20',
    });
    const actionPlan = buildActionPlan({
      names: actionNames,
      flavor: 'at4dx',
      apiVersion: '62.0',
      triggerOperation: 'Before_Insert',
      orderOfExecution: '10.2',
      description: 'Review generated action binding for DefaultAccountSloganBasedOnNameAction.',
      paths,
    });
    expect(actionPlan.artifacts.map((a) => a.id)).to.deep.equal([
      'actionClass',
      'apexClassMeta',
      'actionUnitTest',
      'apexClassMeta',
      'domainProcessBinding',
    ]);
    expect(actionPlan.artifacts[0].relativePath).to.equal(
      'main/classes/actions/DefaultAccountSloganBasedOnNameAction.cls'
    );
    expect(actionPlan.artifacts[2].relativePath).to.equal(
      'test/classes/actions/DefaultAccountSloganBasedOnNameActioTest.cls'
    );
    const actionBindingGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'action',
        'DomainProcessBinding.FishCompanySlogans10_20Action.md-meta.xml'
      ),
      'utf8'
    );
    const actionClassGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'action',
        'DefaultAccountSloganBasedOnNameAction.cls'
      ),
      'utf8'
    );
    expect(actionPlan.artifacts[0].content.trimEnd()).to.equal(actionClassGolden.trimEnd());
    const actionTestGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'action',
        'DefaultAccountSloganBasedOnNameActioTest.cls'
      ),
      'utf8'
    );
    expect(actionPlan.artifacts[2].content.trimEnd()).to.equal(actionTestGolden.trimEnd());
    expect(actionPlan.artifacts[4].content.trimEnd()).to.equal(actionBindingGolden.trimEnd());
  });

  it('builds field-injection plan with expected artifacts and golden content', () => {
    const names = buildFieldInjectionNames({ sobjectApiName: 'Account' });
    const plan = buildFieldInjectionPlan({
      names,
      flavor: 'at4dx',
      fieldNames: ['Name', 'Industry'],
      label: 'SelectorInclusion_AccountFields',
      description: 'Generated selector field inclusion for Account.',
      paths: new PathResolver(),
    });
    expect(plan.artifacts.map((a) => a.id)).to.deep.equal([
      'selectorInclusionFieldSet',
      'selectorConfigFieldSetInclusionBinding',
    ]);
    expect(plan.artifacts[0].relativePath).to.equal(
      'main/schema/objects/Account/fieldSets/SelectorInclusion_AccountFields.fieldSet-meta.xml'
    );
    const fieldSetGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'fieldInjection',
        'SelectorInclusion_AccountFields.fieldSet-meta.xml'
      ),
      'utf8'
    );
    expect(plan.artifacts[0].content.trimEnd()).to.equal(fieldSetGolden.trimEnd());
    const bindingGolden = readFileSync(
      join(
        'test',
        'fixtures',
        'aep',
        'golden',
        'at4dx',
        'injection',
        'fieldInjection',
        'SelectorConfig_FieldSetInclusion.SelectorInclusion_AccountFields.md-meta.xml'
      ),
      'utf8'
    );
    expect(plan.artifacts[1].content.trimEnd()).to.equal(bindingGolden.trimEnd());
  });
});
