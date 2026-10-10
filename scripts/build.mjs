import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Building CookieCloud for EdgeOne...');

  // 1. 确保目录存在
  fs.mkdirSync('dist-server', { recursive: true });

  // 2. 构建 Node 云函数入口产物
  await build({
    entryPoints: ['src/edgeone-entry.ts'],
    outfile: 'dist-server/edgeone-entry.js',
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    minify: true,
    sourcemap: false,
    external: [],
  });

  // 3. 构建测试引用的 crypto 产物
  await build({
    entryPoints: ['src/utils/crypto.ts'],
    outfile: 'dist-server/utils/crypto.js',
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
