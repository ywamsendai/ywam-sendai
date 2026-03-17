import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindv4 from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://www.ywamsendai.org',
  output: 'server',

  adapter: cloudflare({
    prerenderEnvironment: 'node', 
  }),

  integrations: [
    starlight({
      title: 'YWAM Sendai Handbook',
      locales: {
        root: { label: 'English', lang: 'en' },
        ja: { label: '日本語', lang: 'ja' },
      },

      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Vision & Unity', slug: 'vision' },
          ],
        },
      ],
    }),
  ],

  vite: {
    plugins: [tailwindv4()], // 2. Add it here, NOT in integrations
  },
});