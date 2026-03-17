import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindv4 from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // site: 'https://www.ywamsendai.org',
  output: 'server',

  adapter: cloudflare({
    platformProxy: { 
      enabled: true,
      configPath: 'wrangler.jsonc', 
    },
    prerenderEnvironment: 'node',
  }),

  integrations: [
    starlight({
      title: 'YWAM Sendai Guide',
      defaultLocale: 'en',
      // This is the key fix: Starlight needs to know about the 'guide' prefix
      locales: {
        en: { label: 'English', lang: 'en', dir: 'ltr' },
        ja: { label: '日本語', lang: 'ja', dir: 'ltr' },
      },
      // We explicitly tell Starlight which folder to look in for the sidebar
      sidebar: [
        {
          label: 'The Vision',
          autogenerate: { directory: 'guide/en/vision' },
        },
        {
          label: 'Staff Journey',
          autogenerate: { directory: 'guide/en/staff' },
        },
        {
          label: 'Schools',
          autogenerate: { directory: 'guide/en/students' },
        },
      ],
      // This helps prevent Tailwind from stripping Starlight's styles
      disable404Route: false, 
    }),
  ],

  vite: {
    plugins: [tailwindv4()],
    ssr: {
      // This tells Vite: "Don't try to optimize these, just load them normally"
      noExternal: ['@astrojs/starlight', 'astro-expressive-code', '@expressive-code/core'],
    },
    // If Tailwind v4 still causes issues, we can add a 'css' block here 
    // to make sure it doesn't process Starlight's internal virtual CSS.
  },
});