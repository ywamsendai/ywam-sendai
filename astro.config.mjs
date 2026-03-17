import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindv4 from '@tailwindcss/vite'; // 1. Import the Vite plugin

export default defineConfig({
  integrations: [
    starlight({
      title: 'YWAM Sendai Handbook',
      // ... your starlight settings
    }),
  ],
  vite: {
    plugins: [tailwindv4()], // 2. Add it here, NOT in integrations
  },
});