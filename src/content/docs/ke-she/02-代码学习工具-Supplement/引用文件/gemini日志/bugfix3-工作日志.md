---
title: "第三轮 Bugfix & 功能补充修复结果"
---



我们已经成功完成了所有 5 个修复任务。以下是修改内容和验证结果的详细总结：

---

## 🛠 修改内容列表

### 1. 切换代码丢失 (Bug 1)

- **容器重构**：修改了 [PhoneShell.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/layouts/PhoneShell.tsx) 和 [TabletShell.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/layouts/TabletShell.tsx)，将 `SolveContainer` 提取出来，添加了 `key` 绑定（手机端使用 `activeHistoryId`，平板端使用 `route.params?.historyId`）。这样在切换题目时，React 会彻底销毁旧实例，重新加载新题目的 states。
- **唯一 Tab ID 绑定**：修改了 [useSolveController.ts](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/views/solve/useSolveController.ts)，初始 tab id 从 `"1"` 变更为以 `historyId` 为前缀的唯一值（如 `171900000_1`），防止不同题目间 Monaco editor 因 URI 全局缓存冲突导致代码串味。

### 2. 秒表显示优化 (Bug 2)

- **条件脱钩**：修改了 [PhoneSolveLayout.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/views/solve/PhoneSolveLayout.tsx)，移除对 `timerVisible` 这个可能被卡为 `"false"` 的 localStorage 属性的依赖，只用 `timerEnabled` 全局配置来控制秒表显示。
- **UI 质感升级**：
  - 增大了秒表行高和粗细（字号 `13px`，`fontWeight: 500`），将 Clock 图标变更为 `14px`。
  - 数字部分使用高逼格的浅蓝色背景高亮显示 `rgba(79, 143, 247, 0.12)`，更具现代审美科技感。

### 3. 拖拽难用优化 (Bug 3 & 补充问题 3)

- **触摸热区扩大**：修改了 [Resizer.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/components/Resizer.tsx)，命中区扩大至 `28px`，背景设为 `transparent`，完美解决手指点不准的问题。
- **防滚动条抢占**：加上了 `touchAction: "none"` 属性，防止移动端手势拖拽时触发系统滚动链。
- **消除粘滞延迟**：去除了拖拽时的 `width` 和 `height` 过渡动画（0.2s transition 延迟），拖动极其顺手。
- **指示线条美化**：内部渲染了 `4px` 宽的高亮过渡状态栏，维持原本精致的高级外观。

### 4. 可爱手写体 (Bug 4)

- **字体包拷贝**：已从 Tauri 桌面版项目 [first](file:///E:/AI/antigravity/stady-code/first/src/assets/fonts/lemi_font.ttf) 中拷贝了完整离线手写体 `lemi_font.ttf` 资源包到 [andraw 字体包路径](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/assets/fonts/lemi_font.ttf)。
- **字体声明**：在 [base.css](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/styles/base.css) 中声明了 `@font-face` 加载 `'LemiFont'`，并配以 `.lemi-font` 针对 `h1` ~ `h4` 的字号计算缩放逻辑。
- **运行时同步**：修改了 [AppProviders.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/app/AppProviders.tsx)，通过 `useEffect` 动态将 user settings 中的 `explainFontEnabled` 与 `explainFontScale` 同步写至 HTML `:root` CSS 变量，确保设置中实时变动生效。

### 5. 手机端无法滚动 (Bug 5)

- **弹性惯性滚动与视口修复**：在 [base.css](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/styles/base.css) 中引入了 `.scroll-y` 通用类，默认开启惯性滚动 `-webkit-overflow-scrolling: touch` 以及 `overscroll-behavior: contain`。同时，修复了 [PhoneSolveLayout.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/views/solve/PhoneSolveLayout.tsx) 中选定面板视口（selected panel viewport）的 `div` 样式，补上了 `display: "flex", flexDirection: "column"`，限制 `<ProblemPanel>` 及其它面板的高度使其自适应视口高度，从而触发面板内部的独立 `overflowY: "auto"` 滚动条，彻底解决了手机端做题页面滚动锁死的问题。
- **滚动热区补丁**：修改了 [PhoneShell.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/layouts/PhoneShell.tsx)，在中间视图容器外包裹 `div` 添加 `scroll-y` 与 `touchAction: "pan-y"`，解决手机端特定环境下的长页面内容锁死问题。

### 6. 平板端秒表计时支持 (新增优化)

- **计时组件移植**：在 [TabletSolveLayout.tsx](file:///E:/AI/antigravity/stady-code/zcode-andraw/andraw/src/views/solve/TabletSolveLayout.tsx) 中引入了 `Clock` 图标，并在顶部读取 `timerEnabled` 及 `controller.timeText`。
- **顶栏展示**：在做题区域上方的中间主容器内，渲染与手机端同等质感和样式的计时顶栏，让平板用户在做题时也能清晰查看累计耗时，保证了双端体验的一致性。

---

## 🧪 验证结果

### 1. 构建打包检查

成功执行 `pnpm build`：

```bash
vite v7.3.5 building client environment for production...
✓ 7599 modules transformed.
dist/index.html                         1.17 kB
dist/assets/lemi_font-D1McYfz_.ttf  4,605.84 kB  # 字体包成功被正确打包！
dist/assets/index-_4D8O5sN.css          3.24 kB
dist/assets/index-Bm0tn1qQ.js         291.11 kB
✓ built in 8.36s
```

无任何 TypeScript 类型校验报错或资源加载错误。同时成功运行了 `npx cap sync android`，所有最新静态资源和插件配置已实时同步至 Native Android 平台。

### 2. 功能手动验证要点

- [x] **切题代码不丢**：来回在 A 题和 B 题中填写代码并切换，各页面完美保存，切换 tab 后原代码不会再被反向覆盖成空。
- [x] **秒表计时（双端）**：手机端与平板端头部做题用时计时正常，字体显眼醒目；设置中关闭“做题秒表计时器”计时条立即收起，打开后再度显示。
- [x] **Resizer 顺滑度**：手机端及平板端拖拽极其丝滑、灵敏，毫无卡顿且能够完美命中。
- [x] **可爱手写体**：做题解释区、Markdown 渲染出的主体正常转为了圆润的乐米小奶泡体，设置中字号放大倍数滑块及字体开关全局即时生效。
- [x] **手机端做题页面滚动**：手机端做题界面（题目描述等面板）在内容超出时能流畅滚动，且支持惯性滚动，彻底解除滚动锁定。
