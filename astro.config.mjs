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
  site: 'https://web-write-tool.pages.dev',

  integrations: [
    starlight({
      // 站点标题（显示在左上角和浏览器标签）
      title: '我的文档站',

      // 默认中文，可选 'en' / 'zh-cn' / 'zh-tw' 等
      defaultLocale: 'zh-cn',
      locales: {
        // 不做多语言时也建议显式声明 root，避免某些功能被锁定
        root: { label: '简体中文', lang: 'zh-CN' },
      },

      social: [
        // 右上角社交图标，不需要就留空数组 []
        { label: 'GitHub', icon: 'github', href: 'https://github.com/' },
      ],

      // ============================================================
      //   侧边栏 —— 写一个教程 / 一个类目靠的就是这里
      // ------------------------------------------------------------
      //   两种写法：
      //   (A) 自动生成：autogenerate，扫描子目录里所有 .md/.mdx
      //   (B) 手动指定：links，精确控制每一条标题、顺序、链接
      //   一个 sidebar 数组 = 侧边栏里一个分组（带标题的可折叠区块）
      // ============================================================
      sidebar: [
        // —— 分组 0：文章（默认放这里，随便写随便发）——
        //    不归类的单篇文章都进这个分组。新建文件默认就建到 posts/。
        {
          label: '文章',
          autogenerate: { directory: 'posts' },
        },

        // —— 分组 1：入门 ——
        {
          label: '入门',
          // 扫描 src/content/docs/getting-started/ 下所有文章
          // 文章顺序由每篇文章顶部的 sidebar.frontmatter.order 决定
          autogenerate: { directory: 'getting-started' },
        },

        // —— 分组 2：教程 ——
        {
          label: '进阶教程',
          autogenerate: { directory: 'guide' },
        },

        // —— 分组 2.5：课设项目 ——
        {
          label: '课设项目',
          autogenerate: { directory: 'ke-she' },
        },

        // —— 分组 3：手动指定的示例（想精确控制顺序时用这种）——
        {
          label: '其它',
          items: [
            { label: '关于本站', link: '/about' },
          ],
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
