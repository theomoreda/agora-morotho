// Copies the Agora AI Noise Suppression WASM files into public/ (served at /agora-denoiser/).
// They are under Agora's SDK licence, so they are not committed — this runs before dev/build.
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const from = 'node_modules/agora-extension-ai-denoiser/external';
const to = 'public/agora-denoiser';
if (!existsSync(from)) {
  console.warn(`[denoiser] ${from} not found — run pnpm install. Hub will fall back to native noise suppression.`);
  process.exit(0);
}
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log(`[denoiser] copied WASM assets to ${to}`);
