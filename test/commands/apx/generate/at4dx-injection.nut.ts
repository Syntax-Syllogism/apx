import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

describe('apx at4dx injection NUT', () => {
  it('generates criteria/action/field-injection artifacts when enabled', async function () {
    if (process.env.NUT_AEP_ENABLE !== 'true') this.skip();

    const outputPath = `generated-nut-injection-${Date.now()}`;
    const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
    const projectDir = await mkdtemp(join(tmpdir(), 'apx-at4dx-injection-'));
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

    const baseArgs = [
      'node',
      [join(repoRoot, 'bin', 'run.js')],
      { cwd: projectDir, env: { ...process.env, SF_DISABLE_LOG_FILE: 'true' } },
    ] as const;

    await execFile(
      baseArgs[0],
      [
        ...baseArgs[1],
        'apx',
        'generate',
        'criteria',
        '--class-name',
        'AccountNameContainsFishCriteria',
        '--sobject',
        'Account',
        '--output-path',
        outputPath,
      ],
      baseArgs[2]
    );

    await execFile(
      baseArgs[0],
      [
        ...baseArgs[1],
        'apx',
        'generate',
        'action',
        '--class-name',
        'DefaultAccountSloganBasedOnNameAction',
        '--sobject',
        'Account',
        '--output-path',
        outputPath,
      ],
      baseArgs[2]
    );

    await execFile(
      baseArgs[0],
      [
        ...baseArgs[1],
        'apx',
        'generate',
        'selector',
        'field-injection',
        '--sobject',
        'Account',
        '--fields',
        'Name,Industry',
        '--output-path',
        outputPath,
      ],
      baseArgs[2]
    );

    const expectedFiles = [
      'main/classes/criteria/AccountNameContainsFishCriteria.cls',
      'test/classes/criteria/AccountNameContainsFishCriteriaTest.cls',
      'main/schema/custommetadata/applicationFactoryBindings/domainProcessBindings/DomainProcessBinding.AccountNameContainsFishCriteria.md-meta.xml',
      'main/classes/actions/DefaultAccountSloganBasedOnNameAction.cls',
      'test/classes/actions/DefaultAccountSloganBasedOnNameActionTest.cls',
      'main/schema/custommetadata/applicationFactoryBindings/domainProcessBindings/DomainProcessBinding.DefaultAccountSloganBasedOnNameAction.md-meta.xml',
      'main/schema/objects/Account/fieldSets/SelectorInclusion_AccountFields.fieldSet-meta.xml',
      'main/schema/custommetadata/applicationFactoryBindings/selectorConfigFieldSetInclusions/SelectorConfig_FieldSetInclusion.SelectorInclusion_AccountFields.md-meta.xml',
    ];

    const checks = await Promise.all(
      expectedFiles.map(async (relativePath) => {
        const fullPath = join(projectDir, outputPath, relativePath);
        return {
          relativePath,
          found: await exists(fullPath),
          content: await readFile(fullPath, 'utf8'),
        };
      })
    );
    for (const check of checks) {
      expect(check.found, `${check.relativePath} should exist`).to.equal(true);
      expect(check.content.trim().length > 0, `${check.relativePath} should be non-empty`).to.equal(true);
    }

    await rm(projectDir, { recursive: true, force: true });
  });
});
