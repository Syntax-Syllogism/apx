import { expect } from 'chai';
import sinon from 'sinon';
import { BINDING_SOURCES, scanBindings } from '../../src/dead/bindings.js';
import type { DeadConnection } from '../../src/dead/types.js';

const connection = (query: sinon.SinonStub): DeadConnection => ({
  query,
  tooling: { autoFetchQuery: sinon.stub() },
});

describe('scanBindings', () => {
  afterEach(() => sinon.restore());

  it('queries all binding objects through standard SOQL and normalizes class names', async () => {
    const query = sinon.stub();
    query.callsFake(async (soql: string) => {
      if (soql.includes('ServiceBinding'))
        return { records: [{ DeveloperName: 'IAccountService', 'To__c': '  AccountServiceImpl ', 'BindingInterface__c': 'IAccountService' }] };
      if (soql.includes('SelectorBinding')) return { records: [{ DeveloperName: 'Accounts', 'To__c': 'AccountsSelector' }] };
      if (soql.includes('DomainBinding')) return { records: [{ DeveloperName: 'Accounts', 'To__c': null }] };
      return { records: [{ DeveloperName: 'Fish10Criteria', 'ClassToInject__c': 'CriteriaClass' }] };
    });

    const result = await scanBindings(connection(query));

    expect(query.callCount).to.equal(4);
    expect(result.boundClasses.get('accountserviceimpl')).to.include('IAccountService');
    expect(result.boundClasses.get('iaccountservice')).to.include('IAccountService');
    expect(result.boundClasses.get('criteriaclass')).to.include('Fish10Criteria');
    expect(result.reports).to.deep.equal(BINDING_SOURCES.map(({ object }, index) => ({
      object,
      available: true,
      recordCount: index === 2 ? 1 : 1,
    })));
  });

  it('skips missing custom metadata types and continues scanning', async () => {
    const query = sinon.stub();
    query.callsFake(async (soql: string) => {
      if (soql.includes('ServiceBinding')) throw Object.assign(new Error('missing type'), { code: 'INVALID_TYPE' });
      return { records: [] };
    });

    const result = await scanBindings(connection(query));

    expect(result.boundClasses).to.be.empty;
    expect(result.reports[0]).to.include({ available: false, recordCount: 0 });
    expect(result.reports.slice(1).every((report) => report.available)).to.equal(true);
  });
});
