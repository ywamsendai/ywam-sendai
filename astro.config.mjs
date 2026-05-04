import { defineConfig } from 'astro/config';
import tailwindv4 from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // site: 'https://www.ywamsendai.org',
  base: '/',
  output: 'server',
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },

  adapter: cloudflare({
    platformProxy: { 
      enabled: true,
      configPath: 'wrangler.jsonc', 
    },
    prerenderEnvironment: 'node',
  }),

  vite: {
    plugins: [tailwindv4()],
    css: {
      devSourcemap: true,
    },
  },
});