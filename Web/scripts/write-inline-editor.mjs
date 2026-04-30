import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const htmlFiles = (await readdir(dist)).filter((file) => file.endsWith('.html'));
const htmlPath = path.join(dist, htmlFiles.includes('app.html') ? 'app.html' : htmlFiles[0]);

let html = await readFile(htmlPath, 'utf8');

html = html.replace(/<link rel="modulepreload"[^>]*>\s*/g, '');

html = await replaceAsync(
  html,
  /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  async (_match, href) => {
    const cssPath = path.join(dist, href.replace(/^\.\//, ''));
    const css = await readFile(cssPath, 'utf8');
    return `<style>\n${css}\n</style>`;
  }
);

html = await replaceAsync(
  html,
  /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
  async (_match, src) => {
    const jsPath = path.join(dist, src.replace(/^\.\//, ''));
    const js = await readFile(jsPath, 'utf8');
    return `<script type="module">\n${js}\n</script>`;
  }
);

await writeFile(path.join(root, 'editor-live.html'), html, 'utf8');

async function replaceAsync(input, regex, replacer) {
  const replacements = await Promise.all(Array.from(input.matchAll(regex), (match) => replacer(...match)));
  let index = 0;
  return input.replace(regex, () => replacements[index++]);
}
