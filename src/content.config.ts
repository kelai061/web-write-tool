import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Astro 5 的 Content Layer API 要求显式声明集合。
// 这个 'docs' 集合名是 Starlight 约定的，不要改；
// 它会自动扫描 src/content/docs/ 下的所有 .md / .mdx 文件。
const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });

export const collections = { docs };
