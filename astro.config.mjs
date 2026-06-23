// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// ============================================================
//   Astro + Starlight 写作模板配置
// ------------------------------------------------------------
//   - Astro 5     : 静态站点引擎
//   - Starlight   : 文档主题（自带 Pagefind 全文搜索 + Expressive Code 代码高亮）
//   - 全中文界面，多类目侧边栏分组（写大教程用）
// ============================================================
export default defineConfig({
  // 部署上线前改成你的正式域名（影响 sitemap、canonical 链接）
  site: 'https://www.klee.cyou',

  integrations: [
    starlight({
      // 站点标题（显示在左上角和浏览器标签）
      title: '课设作品集与展示',
      customCss: ['./src/styles/theme.css'],

      // 默认中文，可选 'en' / 'zh-cn' / 'zh-tw' 等
      defaultLocale: 'zh-cn',
      locales: {
        // 不做多语言时也建议显式声明 root，避免某些功能被锁定
        root: { label: '简体中文', lang: 'zh-CN' },
      },

      social: [],

      // ============================================================
      //   侧边栏 —— 写一个教程 / 一个类目靠的就是这里
      // ============================================================
      sidebar: [
        // —— 主入口 ——
        {
          label: '开始',
          items: [
            { label: '关于本站', link: '/about/' },
          ],
        },

        // —— 课设项目（自动扫描所有文件） ——
        {
          label: '00 - 总览',
          autogenerate: { directory: 'ke-she/00-总览' },
        },
        {
          label: '01 - 基础课设 (GenshinRPG)',
          autogenerate: { directory: 'ke-she/01-基础课设-GenshinRPG' },
        },
        {
          label: '02 - 代码学习工具 (Supplement)',
          autogenerate: { directory: 'ke-she/02-代码学习工具-Supplement' },
        },
        {
          label: '03 - 课设展示网站',
          autogenerate: { directory: 'ke-she/03-课设展示网站' },
        },
        {
          label: '04 - 格式 Skill 制作',
          autogenerate: { directory: 'ke-she/04-格式Skill制作' },
        },
      ],

      // —— 内置功能（无需手写，开箱即用）——
      //   ✅ Pagefind 全文搜索（右上角搜索框 + Ctrl/Cmd+K）
      //   ✅ Expressive Code 代码块高亮 + 复制按钮 + 行号
      //   ✅ 暗/亮/跟随系统 三种主题切换
      //   ✅ 响应式布局 + 自动目录 + 上一篇/下一篇
      //   ✅ 自动生成 sitemap.xml
    }),
  ],
});
