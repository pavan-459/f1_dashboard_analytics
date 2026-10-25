// Shared by the smoke and load scripts: build once, serve dist/ with `vite preview` on a free port.
import { build, preview } from 'vite';

/** @returns {Promise<{ url: string, close: () => Promise<void> }>} */
export async function serveBuild({ rebuild = true } = {}) {
  if (rebuild) await build({ logLevel: 'warn' });
  const server = await preview({
    preview: { port: 0, strictPort: false, open: false },
    logLevel: 'warn',
  });
  const url = server.resolvedUrls.local[0].replace(/\/$/, '');
  return { url, close: () => new Promise((resolve) => server.httpServer.close(resolve)) };
}
