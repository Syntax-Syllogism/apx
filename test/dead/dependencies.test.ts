import { expect } from 'chai';
import sinon from 'sinon';
import { fetchDependencyGraph } from '../../src/dead/dependencies.js';
import type { DeadConnection } from '../../src/dead/types.js';

describe('fetchDependencyGraph', () => {
  it('batches candidate IDs and derives outbound edges from the same rows', async () => {
    const autoFetchQuery = sinon.stub().resolves({
      records: [
        {
          MetadataComponentId: 'source',
          MetadataComponentName: 'Source',
          MetadataComponentType: 'ApexClass',
          RefMetadataComponentId: 'target',
          RefMetadataComponentName: 'Target',
          RefMetadataComponentType: 'ApexClass',
        },
        {
          MetadataComponentId: 'lwc',
          MetadataComponentName: 'TargetCard',
          MetadataComponentType: 'LightningComponentBundle',
          RefMetadataComponentId: 'target',
          RefMetadataComponentName: 'Target',
          RefMetadataComponentType: 'ApexClass',
        },
        {
          MetadataComponentId: 'target',
          MetadataComponentName: 'Target',
          MetadataComponentType: 'ApexClass',
          RefMetadataComponentId: 'target',
          RefMetadataComponentName: 'Target',
          RefMetadataComponentType: 'ApexClass',
        },
      ],
    });
    const query = sinon.stub();
    const conn = { query, tooling: { autoFetchQuery } } as unknown as DeadConnection;

    const result = await fetchDependencyGraph(conn, ['source', 'target', ...Array.from({ length: 448 }, (_, index) => `id-${index}`)]);

    expect(autoFetchQuery.callCount).to.equal(3);
    expect(autoFetchQuery.firstCall.args[0]).to.include('RefMetadataComponentId IN');
    expect(result.inbound.get('target')?.map(({ id }) => id)).to.deep.equal(['source', 'lwc']);
    expect(result.outbound.get('source')?.map(({ id }) => id)).to.deep.equal(['target']);
    expect(result.outbound.has('lwc')).to.equal(false);
    expect(query.called).to.equal(false);
  });
});
