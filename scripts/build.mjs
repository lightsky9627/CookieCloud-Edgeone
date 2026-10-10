import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Building CookieCloud for EdgeOne...');

  // 1. 确保目录存在
  fs.mkdirSync('dist-server', { recursive: true });

  // 2. 构建 Node 云函数入口产物
  await build({
    entryPoints: ['src/edgeone-entry.ts', 'src/utils/crypto.ts'],
    outdir: 'dist-server',
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    minify: true,
    sourcemap: false,
    external: [],
  });

  console.log('✓ EdgeOne backend bundle complete: dist-server/edgeone-entry.js');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
