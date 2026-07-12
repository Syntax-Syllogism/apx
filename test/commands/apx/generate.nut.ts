import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import { expect } from 'chai';

const execFile = promisify(execFileCb);

const exists = async (pathValue: string): Promise<boolean> => {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
};

describe('apx generate NUT', () => {
  it('runs selector-method generation and verifies files when enabled', async function () {
    if (process.env.NUT_AEP_ENABLE !== 'true') this.skip();

    const outputPath = `generated-nut-${Date.now()}`;
    const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
    const projectDir = await mkdtemp(join(tmpdir(), 'apx-nut-'));
    await writeFile(
      join(projectDir, 'sfdx-project.json'),
      JSON.stringify(
        {
          packageDirectories: [{ path: 'force-app', default: true }],
          namespace: '',
          sourceApiVersion: '62.0',
        },
        null,
        2
      ),
      'utf8'
    );

    await execFile(
      'node',
      [
        join(repoRoot, 'bin', 'run.js'),
        'apx',
        'generate',
        'selector',
        'method',
        '--class-name',
        'SelectBySloganMethod',
        '--sobject-selector-class-name',
        'AccountsSelector',
        '--sobject',
        'Account',
        '--output-path',
        outputPath,
      ],
      { cwd: projectDir, env: { ...process.env, SF_DISABLE_LOG_FILE: 'true' } }
    );

    expect(await exists(join(projectDir, outputPath, 'main/classes/selectors/SelectBySloganMethod.cls'))).to.equal(
      true
    );
    expect(await exists(join(projectDir, outputPath, 'test/classes/selectors/SelectBySloganMethodTest.cls'))).to.equal(
      true
    );

    await rm(projectDir, { recursive: true, force: true });
  });
});
