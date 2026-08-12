import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import cloudflare from "@astrojs/cloudflare";

const SITE_URL = 'https://salihkarakaya.com';

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  adapter: cloudflare()
});