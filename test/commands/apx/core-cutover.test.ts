import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SfProject } from '@salesforce/core';
import { expect } from 'chai';
import sinon from 'sinon';
import ApxGenerate from '../../../src/commands/apx/generate.js';
import ApxGenerateDomain from '../../../src/commands/apx/generate/domain.js';
import ApxGenerateSelector from '../../../src/commands/apx/generate/selector.js';
import ApxGenerateUnitOfWork from '../../../src/commands/apx/generate/unitofwork.js';
import ApxGenerateService from '../../../src/commands/apx/generate/service.js';

describe('plugin integration with apx-core', () => {
  let projectDir: string;

  beforeEach(async () => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
    projectDir = await mkdtemp(join(tmpdir(), 'apx-core-cutover-'));
    sinon.stub(SfProject, 'resolveProjectPath').resolves(projectDir);
  });

  afterEach(async () => {
    sinon.restore();
    await rm(projectDir, { recursive: true, force: true });
  });

  const commands = [ApxGenerate, ApxGenerateDomain, ApxGenerateSelector, ApxGenerateUnitOfWork];
  for (const command of commands) {
    for (const explicit of [undefined, '61.0']) {
      it(`${command.name} refreshes auth and supplies the selected connection (${
        explicit ?? 'org version'
      })`, async () => {
        const describeSObject = sinon.stub().resolves({
          name: 'Account',
          custom: false,
          fields: [{ name: 'Id', type: 'id', filterable: true }],
        });
        const getApiVersion = sinon.stub().returns('62.0');
        const conn = { describeSObject, getApiVersion };
        const org = { refreshAuth: sinon.stub().resolves(), getConnection: sinon.stub().returns(conn) };
        sinon.stub(command.prototype as unknown as Record<string, unknown>, 'parse').resolves({
          flags: {
            'target-org': org,
            sobject: 'Account',
            at4dx: true,
            'api-version': explicit,
            'output-path': 'generated',
            selector: true,
            domain: true,
            'unit-of-work': true,
          },
        } as never);

        const result = await command.run(['--json']);

        expect(org.refreshAuth.calledOnce).to.equal(true);
        expect(org.getConnection.calledOnceWithExactly(explicit)).to.equal(true);
        expect(org.refreshAuth.calledBefore(org.getConnection)).to.equal(true);
        expect(org.getConnection.calledBefore(describeSObject)).to.equal(true);
        expect(describeSObject.calledOnceWithExactly('Account')).to.equal(true);
        expect(result.baseDir).to.equal(join(projectDir, 'generated'));
        if (command !== ApxGenerateUnitOfWork) {
          const meta = result.created.find((file) => file.endsWith('.cls-meta.xml'));
          expect(meta).to.not.equal(undefined);
          expect(await readFile(meta!, 'utf8')).to.include(`<apiVersion>${explicit ?? '62.0'}</apiVersion>`);
          expect(getApiVersion.called).to.equal(explicit === undefined);
        }
      });
    }
  }

  for (const withOrg of [false, true]) {
    for (const explicit of [undefined, '61.0']) {
      it(`service preserves API-version precedence (org=${withOrg}, explicit=${explicit ?? 'none'})`, async () => {
        const getApiVersion = sinon.stub().returns('62.0');
        const org = { refreshAuth: sinon.stub().resolves(), getConnection: sinon.stub().returns({ getApiVersion }) };
        sinon.stub(ApxGenerateService.prototype as unknown as Record<string, unknown>, 'parse').resolves({
          flags: {
            'target-org': withOrg ? org : undefined,
            'service-basename': 'Weather',
            at4dx: true,
            'api-version': explicit,
            'output-path': 'generated',
          },
        } as never);

        const result = await ApxGenerateService.run(['--json']);
        const meta = result.created.find((file) => file.endsWith('.cls-meta.xml'));
        expect(meta).to.not.equal(undefined);
        expect(await readFile(meta!, 'utf8')).to.include(
          `<apiVersion>${explicit ?? (withOrg ? '62.0' : '60.0')}</apiVersion>`
        );
        expect(org.refreshAuth.called).to.equal(withOrg && explicit === undefined);
        expect(org.getConnection.called).to.equal(withOrg && explicit === undefined);
        if (withOrg && !explicit) {
          expect(org.refreshAuth.calledBefore(org.getConnection)).to.equal(true);
          expect(org.getConnection.calledOnceWithExactly(undefined)).to.equal(true);
        }
      });
    }
  }
});
