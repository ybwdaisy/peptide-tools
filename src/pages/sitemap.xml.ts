import type { APIRoute } from 'astro';
import { peptides } from '../data/peptides';
import { localePath } from '../lib/i18n';
export const GET: APIRoute = () => {
  const paths = ['/', '/calculator', '/library', '/planner', '/privacy', '/disclaimer', ...peptides.map(p => `/library/${p.slug}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.flatMap(path => [path, localePath(path, 'zh')]).map(path => `<url><loc>https://peptides.ybwdaisy.com${path}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
