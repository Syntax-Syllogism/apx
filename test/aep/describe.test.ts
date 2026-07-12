import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';
import { toDescribeView } from '../../src/aep/describe/describe.js';

describe('aep describe mapper', () => {
  it('filters out IsDeleted, textarea, and non-filterable fields', () => {
    const raw = JSON.parse(readFileSync(join('test', 'fixtures', 'aep', 'describe', 'account.json'), 'utf8')) as {
      name: string;
      custom: boolean;
      fields: Array<{ name: string; type: string; filterable: boolean }>;
    };
    const view = toDescribeView(raw);
    expect(view.apiName).to.equal('Account');
    expect(view.isCustom).to.equal(false);
    expect(view.fieldNames).to.deep.equal(['Id', 'Name', 'OwnerId']);
  });
});
