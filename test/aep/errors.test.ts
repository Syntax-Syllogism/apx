import { SfError } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { ApxError, isApxError, type ApxErrorCode } from '@syntax-syllogism/apx-core';
import { expect } from 'chai';
import sinon from 'sinon';
import { describeTargetForCli, toCliError } from '../../src/aep/errors.js';
import ApxGenerateSelector from '../../src/commands/apx/generate/selector.js';

describe('core errors at the CLI boundary', () => {
  let exitCode: typeof process.exitCode;

  beforeEach(() => {
    process.env.SF_DISABLE_LOG_FILE = 'true';
    exitCode = process.exitCode;
  });

  afterEach(() => {
    sinon.restore();
    process.exitCode = exitCode;
  });

  for (const code of ['duplicate-path', 'file-exists', 'write-failed', 'template-missing', 'template-empty'] as const) {
    it(`keeps ${code} as a plain Error with the original message`, () => {
      const error = toCliError(new ApxError(code, 'original message', { internal: 'data' }));
      expect(error.name).to.equal('Error');
      expect(error.message).to.equal('original message');
      expect(error).to.not.have.property('code');
      expect(error).to.not.have.property('data');
    });
  }

  it('keeps the pairing invariant as SfError', () => {
    const error = toCliError(new ApxError('test-pairing-invariant', 'Test pairing invariant failed for Service.'));
    expect(error).to.be.instanceOf(SfError);
    expect(error).to.include({ name: 'SfError', message: 'Test pairing invariant failed for Service.', exitCode: 1 });
    expect((error as SfError).code).to.equal('SfError');
  });

  it('restores generic describe failures without losing Salesforce details', () => {
    const cause = Object.assign(new Error('Session expired'), {
      name: 'INVALID_SESSION_ID',
      errorCode: 'INVALID_SESSION_ID',
    });
    expect(toCliError(new ApxError('describe-failed', cause.message, { cause }))).to.equal(cause);
    expect(
      toCliError(new ApxError('describe-failed', 'unknown failure', { cause: 'unknown failure' })).message
    ).to.equal('unknown failure');
  });

  it('leaves existing CLI and unrelated errors alone', () => {
    for (const error of [new SfError('Missing flag'), new Error('Unrelated failure')]) {
      expect(toCliError(error)).to.equal(error);
    }
  });

  it('lets core handle describe conversion errors', async () => {
    let caught: unknown;
    try {
      await describeTargetForCli({ describeSObject: sinon.stub().resolves(undefined) }, 'Account');
    } catch (error) {
      caught = error;
    }
    expect(isApxError(caught)).to.equal(true);
    expect(caught).to.have.property('code', 'describe-failed');
  });

  for (const name of ['NOT_FOUND', 'INVALID_SESSION_ID']) {
    it(`preserves the original ${name} API payload through describe and JSON rendering`, async () => {
      const data = { errorCode: name, message: 'API failure', fields: ['Account'] };
      const apiError = Object.assign(new Error(data.message), { name, errorCode: name, data });
      const describeSObject = sinon.stub().rejects(apiError);
      const org = {
        refreshAuth: sinon.stub().resolves(),
        getConnection: sinon.stub().returns({ describeSObject }),
      };
      sinon.stub(ApxGenerateSelector.prototype as unknown as Record<string, unknown>, 'parse').resolves({
        flags: { 'target-org': org, sobject: 'Account', fflib: true },
      } as never);
      const logJson = sinon.stub(SfCommand.prototype as unknown as Record<string, unknown>, 'logJson');
      let caught: unknown;
      try {
        await ApxGenerateSelector.run(['--json']);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.include({ name, message: data.message, code: '1', exitCode: 1 });
      expect(logJson.firstCall.args[0]).to.include({ name, message: data.message, code: '1', status: 1, exitCode: 1 });
      expect(logJson.firstCall.args[0]).to.have.property('data').that.deep.equals(data);
      expect(org.refreshAuth.calledBefore(describeSObject)).to.equal(true);
    });
  }

  const failures: Array<{ code: ApxErrorCode; name: string; cliCode: string }> = [
    { code: 'duplicate-path', name: 'Error', cliCode: '1' },
    { code: 'test-pairing-invariant', name: 'SfError', cliCode: 'SfError' },
    { code: 'sobject-not-found', name: 'NOT_FOUND', cliCode: '1' },
  ];

  for (const failure of failures) {
    it(`keeps JSON error fields for ${failure.code} through SfCommand.catch`, async () => {
      sinon
        .stub(ApxGenerateSelector.prototype as unknown as Record<string, unknown>, 'run')
        .rejects(new ApxError(failure.code, 'original message'));
      const logJson = sinon.stub(SfCommand.prototype as unknown as Record<string, unknown>, 'logJson');
      let caught: unknown;
      try {
        await ApxGenerateSelector.run(['--json']);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.include({
        name: failure.name,
        message: 'original message',
        code: failure.cliCode,
        exitCode: 1,
      });
      expect(logJson.calledOnce).to.equal(true);
      expect(logJson.firstCall.args[0]).to.include({
        name: failure.name,
        message: 'original message',
        code: failure.cliCode,
        status: 1,
        exitCode: 1,
      });
      expect(logJson.firstCall.args[0]).to.not.have.property('data');
    });
  }
});
