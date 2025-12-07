import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import react from '@astrojs/react';
import clerk from '@clerk/astro';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://techinteach.com',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [tailwind(), mdx(), sitemap(), icon(), react(), clerk()],
  vite: {
    ssr: {
      noExternal: [
        '@fontsource-variable/*',
        '@fontsource/*'
      ]
    }
  }
});