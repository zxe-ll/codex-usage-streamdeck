import { build } from 'esbuild';
import { copyFileSync } from 'node:fs';
// Icons and layouts are source assets, maintained in the plugin directory.
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.txt']) {
  copyFileSync(file, `com.ayato.codexusage.sdPlugin/${file}`);
}
await build({ entryPoints: ['./src/plugin.ts'], bundle: true, platform: 'node',
  format: 'esm', target: 'node24', outfile: 'com.ayato.codexusage.sdPlugin/bin/plugin.js',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
