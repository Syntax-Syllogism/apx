import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';
import { toDescribeView } from '../../src/aep/describe/describe.js';
import { buildSelectorMethodNames, buildServiceNames, buildSObjectNames } from '../../src/aep/naming/naming.js';
import { PathResolver } from '../../src/aep/paths/paths.js';
import {
  buildDomainPlan,
  buildSelectorMethodPlan,
  buildSelectorPlan,
  buildServicePlan,
  combinePlans,
} from '../../src/aep/plan/planBuilders.js';

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

const assertHouseStyle = (content: string, relativePath: string): void => {
  expect(content, `${relativePath}: no tabs`).not.to.match(/\t/);
  expect(content, `${relativePath}: no trailing whitespace`).not.to.match(/[ \t]+$/m);
};

describe('aep apex template house style', () => {
  it('renders generated Apex with consistent whitespace conventions', () => {
    const accountDescribe = readJson<{
      name: string;
      custom: boolean;
      fields: Array<{ name: string; type?: string; filterable?: boolean }>;
    }>(join('test', 'fixtures', 'aep', 'describe', 'account.json'));
    const propertyDescribe = readJson<{
      name: string;
      custom: boolean;
      fields: Array<{ name: string; type?: string; filterable?: boolean }>;
    }>(join('test', 'fixtures', 'aep', 'describe', 'property__c.json'));

    const accountView = toDescribeView(accountDescribe);
    const propertyView = toDescribeView(propertyDescribe);
    const accountNames = buildSObjectNames({ apiName: accountView.apiName, isCustom: accountView.isCustom });
    const propertyNames = buildSObjectNames({ apiName: propertyView.apiName, isCustom: propertyView.isCustom });
    const serviceNames = buildServiceNames({ basename: 'LimitMonitors' });
    const selectorMethodNames = buildSelectorMethodNames({
      className: 'SelectBySloganMethod',
      sobjectApiName: 'Account',
      sobjectSelectorClassName: 'AccountsSelector',
    });
    const paths = new PathResolver();

    const plan = combinePlans(
      buildSelectorPlan({
        names: accountNames,
        view: accountView,
        flavor: 'fflib',
        apiVersion: '62.0',
        paths,
        includeBinding: false,
      }),
      buildSelectorPlan({
        names: propertyNames,
        view: propertyView,
        flavor: 'at4dx',
        apiVersion: '62.0',
        paths,
        includeBinding: false,
      }),
      buildDomainPlan({
        names: propertyNames,
        view: propertyView,
        flavor: 'at4dx',
        apiVersion: '62.0',
        paths,
        includeBinding: false,
      }),
      buildServicePlan({
        names: serviceNames,
        flavor: 'at4dx',
        apiVersion: '62.0',
        paths,
        includeBinding: false,
      }),
      buildSelectorMethodPlan({
        names: selectorMethodNames,
        flavor: 'at4dx',
        apiVersion: '62.0',
        paths,
      })
    );

    for (const artifact of plan.artifacts) {
      if (artifact.relativePath.endsWith('.cls') || artifact.relativePath.endsWith('.trigger')) {
        assertHouseStyle(artifact.content, artifact.relativePath);
      }
    }
  });

  it('keeps fflib selector conventions aligned with apex-common sample code', () => {
    const accountDescribe = readJson<{
      name: string;
      custom: boolean;
      fields: Array<{ name: string; type?: string; filterable?: boolean }>;
    }>(join('test', 'fixtures', 'aep', 'describe', 'account.json'));
    const accountView = toDescribeView(accountDescribe);
    const accountNames = buildSObjectNames({ apiName: accountView.apiName, isCustom: accountView.isCustom });

    const selectorPlan = buildSelectorPlan({
      names: accountNames,
      view: accountView,
      flavor: 'fflib',
      apiVersion: '62.0',
      paths: new PathResolver(),
      includeBinding: false,
    });
    const selectorClass = selectorPlan.artifacts.find((a) => a.relativePath.endsWith('/AccountsSelector.cls'))?.content;
    expect(selectorClass).to.include('super(false, fflib_SObjectSelector.DataAccess.USER_MODE);');
    expect(selectorClass).to.include('return (List<Account>) selectSObjectsById(idSet);');
  });
});
