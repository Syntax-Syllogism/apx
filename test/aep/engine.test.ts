import { mkdtempSync, readFileSync } from 'node:fs';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect } from 'chai';
import { GenerationEngine } from '../../src/aep/engine/engine.js';
import type { GenerationPlan } from '../../src/aep/model/types.js';

const exists = async (pathValue: string): Promise<boolean> => {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
};

describe('aep generation engine', () => {
  it('writes files and returns manifest', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apx-engine-'));
    const plan: GenerationPlan = {
      artifacts: [
        {
          id: 'serviceInterface',
          relativePath: 'main/classes/services/IFooService.cls',
          content: 'public interface IFooService {}',
        },
      ],
    };

    const manifest = await GenerationEngine.execute(plan, { baseDir: dir, overwrite: 'overwrite' });
    expect(manifest.created).to.have.length(1);
    expect(readFileSync(join(dir, 'main/classes/services/IFooService.cls'), 'utf8')).to.include('IFooService');
    await rm(dir, { recursive: true, force: true });
  });

  it('supports dry-run without writing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apx-engine-'));
    const plan: GenerationPlan = {
      artifacts: [{ id: 'serviceInterface', relativePath: 'main/classes/services/IFooService.cls', content: 'x' }],
    };
    const manifest = await GenerationEngine.execute(plan, { baseDir: dir, dryRun: true });
    expect(manifest.wouldCreate).to.have.length(1);
    expect(await exists(join(dir, 'main/classes/services/IFooService.cls'))).to.equal(false);
    await rm(dir, { recursive: true, force: true });
  });

  it('detects duplicate relative paths before writes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apx-engine-'));
    const plan: GenerationPlan = {
      artifacts: [
        { id: 'serviceInterface', relativePath: 'dup.cls', content: 'a' },
        { id: 'serviceInterface', relativePath: 'dup.cls', content: 'b' },
      ],
    };
    try {
      await GenerationEngine.execute(plan, { baseDir: dir });
      expect.fail('Expected duplicate relativePath error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).to.include('duplicate relativePath');
    }
    expect(await exists(join(dir, 'dup.cls'))).to.equal(false);
    await rm(dir, { recursive: true, force: true });
  });

  it('supports overwrite=skip', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apx-engine-'));
    const target = join(dir, 'main/classes/services/IFooService.cls');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, 'existing', 'utf8');
    const plan: GenerationPlan = {
      artifacts: [{ id: 'serviceInterface', relativePath: 'main/classes/services/IFooService.cls', content: 'new' }],
    };

    const manifest = await GenerationEngine.execute(plan, { baseDir: dir, overwrite: 'skip' });
    expect(manifest.created).to.have.length(0);
    expect(manifest.skipped).to.deep.equal([target]);
    expect(readFileSync(target, 'utf8')).to.equal('existing');
    await rm(dir, { recursive: true, force: true });
  });

  it('supports overwrite=error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'apx-engine-'));
    const target = join(dir, 'main/classes/services/IFooService.cls');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, 'existing', 'utf8');
    const plan: GenerationPlan = {
      artifacts: [{ id: 'serviceInterface', relativePath: 'main/classes/services/IFooService.cls', content: 'new' }],
    };

    try {
      await GenerationEngine.execute(plan, { baseDir: dir, overwrite: 'error' });
      expect.fail('Expected overwrite error');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).to.include('Refusing to overwrite existing file');
    }
    await rm(dir, { recursive: true, force: true });
  });
});
