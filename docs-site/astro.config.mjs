import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import {
  remarkRelativeMdLinks,
  starlightPreset,
} from '@syntax-syllogism/docs-theme';
import { fileURLToPath } from 'node:url';

const BASE = '/apx/docs';
const DOCS_ROOT = fileURLToPath(new URL('../docs', import.meta.url));

export default defineConfig({
  site: 'https://syntax-syllogism.com',
  base: BASE,
  outDir: './dist',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [[remarkRelativeMdLinks, { base: BASE, docsRoot: DOCS_ROOT }]],
    }),
  },
  integrations: [
    starlight(
      {
        ...starlightPreset({
          title: 'APX',
          base: BASE,
          toolSlug: 'apx',
          publicRepo: 'Syntax-Syllogism/apx',
          accent: 'orange',
        }),
        sidebar: ['index', 'getting-started', 'interactive-mode', 'command-details', 'dead-code'],
      },
    ),
    starlightLinksValidator(),
  ],
});
