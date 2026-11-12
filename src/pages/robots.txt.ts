import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response(import.meta.env.VERCEL_ENV === 'production' ? 'User-agent: *\nAllow: /\nSitemap: https://peptides.ybwdaisy.com/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
