---
title: "第三轮 Bugfix · 三 Bug 联合修复计划"
---

# 第三轮 Bugfix · 三 Bug 联合修复计划

> 制定日期：2026-06-22
> 任务来源：用户两轮反馈，共 6 个问题（去重后 5 个修复点）。
> 执行 AI：请按 Bug1（P0）→ Bug3（P1）→ Bug2（P2）→ Bug4（P3）→ Bug5（仅当 Bug1 修完仍卡时）顺序执行。
> 
> **6 个问题去重后的实际修复点**：
> | 用户反馈 | 实际归属 | 在哪修 |
> |---|---|---|
> | ① 切换代码丢失 | 独立 bug | 第一部分 Bug1 |
> | ② 秒表不显示 | 独立 bug | 第一部分 Bug2 |
> | ③ 拖动难用 | Resizer 组件 | 第一部分 Bug3 |
> | ④ 没有可爱字体 | 功能缺失，照搬电脑版 first | 第二部分 Bug4 |
> | ⑤ 手机端无法拖动 | 大概率是 ① 的连锁 | 第二部分 Bug5（兜底） |
> | ⑥ 分窗口拖动困难 | = ③，同一 Resizer | 已由 Bug3 覆盖，无需重复 |
> 
> 每改完一个 bug 先单独验证，再做下一个，便于定位回退。

---

## 〇、通用前置

工作目录：`E:\AI\antigravity\stady-code\zcode-andraw\andraw`

每个 bug 改完后都要跑：

```bash
pnpm build        # TS 不能报错
```

全部改完后做真机/模拟器验证（见各 bug 的"验证"小节 + 文末总验证清单）。

---

## 🔴 Bug 1 · 切换题目/tab 时代码丢失（最严重）

### 1.1 根因（3 层，已查证）

**主因（~70%）—— `SolveContainer` 缺 `key`，切换题目时 controller 的 state 不重置**

- `src/views/solve/SolveContainer.tsx:14-44` 调用 `useSolveController({ historyId, ... })`。
- `src/views/solve/useSolveController.ts:29` 内部 `const [currentHistoryId, setCurrentHistoryId] = useState(historyId)`，**只在首次挂载读一次**。
- 全文 grep 确认：`setCurrentHistoryId` 只在第 322 行（新建历史项分支）被调用，**没有 `useEffect` 把 prop `historyId` 的变化同步进内部 state**。
- `SolveContainer` 在 `PhoneShell.tsx:11-19` / `TabletShell.tsx` 的 viewMap 里是**静态映射、没有 `key`**。
- 后果：用户进 A 题 → 返回 → 进 B 题，React 复用同一个 `SolveContainer` 实例，`useSolveController` 内部 `codeTabs` / `activeTabId` / `chatMessages` / `notesContent` 全部停留在 A 题的旧快照 → 编辑器拿到错的/空的 codeTabs → "代码不见了"。
- 这吻合用户原话"切换的时候代码就不见了，甚至题目都没切换只是切换一小部分"。

**次因 1（~20%）—— 初始 tab id 恒为 `"1"`，跨题共享 Monaco model URI**

- `useSolveController.ts:61` 初始 tab 写死 `id: "1"`。
- `src/components/CodeEditor.tsx:316` 用 `inmemory:///${tab.id}.${ext}` 作 Monaco model URI，而 Monaco 的 model **按 URI 全局缓存**。
- 多个题目的初始 tab 都叫 `"1"`，URI 都是 `inmemory:///1.cpp`，存在跨题 model 串味的隐患。

**次因 2（~10%）—— syncModels 用 React state 反向覆盖 Monaco model**

- `CodeEditor.tsx:326-328`：每次 `[tabs, activeTabId]` 变化跑 syncModels，若 `model.getValue() !== tab.code` 就 `model.setValue(tab.code)`。
- 当主因导致传入的 `tab.code` 是旧/空时，这一步把编辑器里真实的代码**反向覆盖成空**——这是"代码消失"的直接执行者。

### 1.2 修法（3 处，按顺序）

#### 修法 A（主修，必做）：给 `SolveContainer` 加 `key={historyId}`

文件：`src/views/solve/SolveContainer.tsx`

当前 `SolveContainer` 是被 `PhoneShell` / `TabletShell` 的 viewMap 静态引用的（`solve: <SolveContainer />`），无法直接给它加 key。**正解是改 `PhoneShell.tsx` 和 `TabletShell.tsx`，把 solve 这一项从 viewMap 里拿出来，单独按 `activeHistoryId` 渲染并加 key。**

**改 `src/layouts/PhoneShell.tsx`**：

当前结构（line 11-19 + line 52-65）：

```tsx
const viewMap = {
  home: <PhoneHome />,
  input: <PhoneInput />,
  ...
  solve: <SolveContainer />,   // ← 拿掉
  ...
};
...
{viewMap[route.dest] || <PhoneHome />}
```

改为：

1. 从 `viewMap` 里删除 `solve` 那一行。

2. 在渲染区改成：
   
   ```tsx
   {route.dest === "solve" ? (
   <SolveContainer key={activeHistoryId || "empty"} />
   ) : (
   (viewMap as any)[route.dest] || <PhoneHome />
   )}
   ```
   
   注意 `activeHistoryId` 已经从 store 取了（line 33）。`key` 用 `activeHistoryId`，切换题目时 React 会销毁旧 `SolveContainer`、重建新的，`useSolveController` 的所有 useState 重新按新 `historyId` 初始化——主因消除。

**改 `src/layouts/TabletShell.tsx`**：

`TabletShell` 用的是 `renderMainContent()` switch（line 59-84），case "solve" 直接 `<SolveContainer ... />`。给它加 key：

```tsx
case "solve":
  return (
    <SolveContainer
      key={route.params?.historyId || "empty"}   // ← 加这一行
      showAssistSheet={showAssistSheet}
      setShowAssistSheet={setShowAssistSheet}
      width={width}
    />
  );
```

确认 `route.params.historyId` 是当前题目的 id（看 `useAppStore.ts` 的 Route 类型 / navigate 实现，应已存在；若没有就从 store 的 `activeHistoryId` 取）。

> ⚠️ **红线提醒**：这里加的 `key` 在 **`SolveContainer`** 上（按**题目 id**），不是加在 `CodeEditor` 上（按 tab id）。HANDOVER 第 117 行禁止的是后者，本计划不碰 `CodeEditor` 的 key。

#### 修法 B（次修，建议做）：消除初始 tab id 冲突

文件：`src/views/solve/useSolveController.ts:44-70`

当前初始 tab `id: "1"`（line 61）。改为用 `historyId` 派生的稳定唯一 id：

```tsx
// 在 useState 初始化器里
const initialTabId = `${currentHistoryId || "tmp"}_1`;   // ← 新增

return [
  {
    id: initialTabId,                                   // ← 原 "1" 改成这个
    name: `代码 1 (${language.toUpperCase()})`,
    ...
  },
];
```

同步改 line 72：

```tsx
const [activeTabId, setActiveTabId] = useState<string>(activeTabIdSaved || initialTabId);
```

注意 `initialTabId` 需要在 useState 外层先算好（或用 `useRef` 缓存，避免每次 render 重算）。推荐：

```tsx
const initialTabIdRef = useRef<string>(`${historyId || "tmp"}_1`);
// 后续用 initialTabIdRef.current
```

这样每个题目的初始 tab id 都带 historyId 前缀，Monaco model URI 不再撞车。

#### 修法 C（防御，可选但建议）：syncModels 不用空值覆盖

文件：`src/components/CodeEditor.tsx:325-332`

当前：

```tsx
} else {
  if (model.getValue() !== tab.code) {
    model.setValue(tab.code);
  }
  ...
}
```

加一个守卫，**当 tab.code 为空但 model 有内容时不覆盖**（防止 React state 还没加载完时把编辑器清空）：

```tsx
} else {
  // 只有当 React state 有实际内容、且与 model 不一致时才覆盖
  // 避免 state 尚未加载（空字符串）时把编辑器真实内容清空
  if (tab.code && tab.code.length > 0 && model.getValue() !== tab.code) {
    model.setValue(tab.code);
  }
  if (model.getLanguageId() !== normalizedLang) {
    monaco.editor.setModelLanguage(model, normalizedLang);
  }
}
```

⚠️ 这是个保守守卫，副作用：如果用户真的把代码全删光（tab.code = ""），model 不会同步成空。可接受（用户删光后切换 tab 再切回，仍显示原内容，但下次 onChange 会纠正）。如果执行 AI 觉得风险大，可以**跳过修法 C**，只做 A+B，主因已消除。

### 1.3 验证

浏览器 `pnpm dev`：

1. 新建题目 A，在编辑器输入 "AAA"，切换到"题目描述"tab 再切回"编写代码"——代码 "AAA" 应保留。
2. 不返回，直接从列表点进题目 B（如果 UI 支持），编辑器应显示 B 的初始模板，不是 A 的 "AAA"。
3. 从 B 返回列表，再进 A，"AAA" 应还在（auto-save + 重新加载）。
4. 建 2 个 code tab，在 tab1 输入"111"、tab2 输入"222"，来回切换——各自内容不丢。

真机：重复上述 4 步。

### 1.4 成功率

- 修法 A 单独：~90%
- A+B：~93%
- A+B+C：~95%
- 替换方案（不做 A，改用 useEffect 监听 historyId 手动重置 N 个 state）：~70%，不推荐，易漏 state。

---

## 🟢 Bug 3 · 拖动难用（最容易，先做立竿见影）

### 3.1 根因（`src/components/Resizer.tsx`，3 个明确问题）

- **命中区太小**：line 78-79 `width/height: 6px`。手指/触控笔根本点不准那条 6px 的缝。Apple HIG / Material 推荐触摸目标 ≥ 44pt。
- **拖动时 width/height 在做 transition 动画**：line 82 `transition: "background 0.2s, width 0.2s, height 0.2s"`。拖动时尺寸在 0.2s 缓动，视觉"粘滞、跟手慢"——这就是"灵敏度低"的真实体感。
- **缺 `touch-action: none`**：触摸拖动时浏览器可能抢去滚屏，导致拖不动或乱跳。

### 3.2 修法

文件：`src/components/Resizer.tsx`

**改动 1：扩大触摸命中区，视觉线条仍保持细**

把 line 73-92 的根 div style 改成（用透明 padding 撑大命中区，视觉用 `::before` 或内部元素保持细线）：

```tsx
return (
  <div
    onMouseDown={handleMouseDown}
    onTouchStart={handleTouchStart}
    style={{
      // 命中区撑大到 28px（视觉透明），手指容易点中
      width: direction === "horizontal" ? "28px" : "100%",
      height: direction === "horizontal" ? "100%" : "28px",
      cursor: direction === "horizontal" ? "col-resize" : "row-resize",
      background: "transparent",            // ← 命中区透明
      // 只对 background 做 transition，不再 transition 尺寸（去掉粘滞感）
      transition: "background 0.15s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      zIndex: 50,
      position: "relative",
      touchAction: "none",                 // ← 关键：禁止浏览器抢占触摸滚动
      ...style,
    }}
    className="resizer-bar"
  >
    {/* 视觉线条仍保持 6px 宽的彩色细条，命中区是 28px 但看起来还是细线 */}
    <div
      style={{
        width: direction === "horizontal" ? "4px" : "24px",
        height: direction === "horizontal" ? "24px" : "4px",
        backgroundColor: active ? "var(--accent-color)" : "var(--border-color)",
        borderRadius: "2px",
        transition: "background 0.15s",
      }}
    />
  </div>
);
```

**改动 2（可选，若用户反馈仍不够灵敏）：加灵敏度倍率**

在 `handleMouseMove` / `handleTouchMove` 里把 delta 乘个倍率（line 36-38、44-46）：

```tsx
const SENSITIVITY = 1.0;   // 1.0 = 原样；调大到 1.3 可让拖动更"快"
const delta = (currentPos - startPos.current) * SENSITIVITY;
```

**默认建议保持 1.0**（去掉 transition 粘滞后体感已经好很多），若用户仍嫌慢再调 1.2~1.5。把 `SENSITIVITY` 提成模块顶部常量方便调。

### 3.3 验证

浏览器 + 真机：

1. 平板做题页：拖动"题目区/编辑器区"之间的横线——跟手、无粘滞、无滚屏抢占。
2. 平板做题页（宽布局）：拖动"编辑器/辅助面板"之间的竖线——同上。
3. 平板抽屉宽度调整（`TabletDrawer.tsx` 用的也是 Resizer）——同上。
4. 手机端若用到 Resizer（grep 确认），同样验证。

### 3.4 成功率

~95%。替换方案是引入 `react-resizable-panels` 库，但 HANDOVER 红线禁止非必要新依赖，**不推荐**。

---

## 🟡 Bug 2 · 秒表不显示

### 2.1 根因

- 计时逻辑本身是好的：`useSolveController.ts:216-237` 有完整 setInterval，依赖 `timerEnabled`（默认 true）。
- 渲染条件：`PhoneSolveLayout.tsx:41` `{timerEnabled && controller.timerVisible && (...)}`。
- `controller.timerVisible` 初始值（`useSolveController.ts:131-133`）：`localStorage.getItem("timerVisible") !== "false"`。
- **两个嫌疑**：
  - **嫌疑 A**：localStorage 里 `timerVisible` 曾被（误操作或 Bug1 连锁）设为 `"false"`，秒表被隐藏。
  - **嫌疑 B（更可能）**：秒表 sub-header 视觉太不起眼（6px padding、12px 字号、夹在 48px 顶栏和 44px tab 栏之间），用户**其实开着但没看见**；叠加 Bug1 状态混乱可能让它条件不满足。

### 2.2 修法

文件：`src/views/solve/PhoneSolveLayout.tsx`

**改动 1：渲染条件不再依赖易误触的 localStorage `timerVisible`**

当前 line 41：

```tsx
{timerEnabled && controller.timerVisible && (
```

改为（让 `timerEnabled` 开关直接决定显示，去掉 `timerVisible` 这层容易被搞坏的中间态）：

```tsx
{timerEnabled && (
```

**改动 2：把秒表 sub-header 做得显眼一点**

当前 sub-header（line 42-70）padding `6px 12px`、字号 12px、灰色背景。改为更易识别：

```tsx
<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "var(--bg-tertiary)",
    borderBottom: "1px solid var(--border-color)",
    fontSize: "13px",                          // ← 12 → 13
    fontWeight: 500,                           // ← 加粗一点
    color: "var(--text-secondary)",
    flexShrink: 0,
  }}
>
  <Clock size={14} />                          // ← 12 → 14
  <span>累计做题用时</span>
  <span
    style={{
      fontFamily: "var(--font-mono)",
      fontWeight: "bold",
      color: controller.activeTabObj?.solvedTimestamp ? "var(--accent-success)" : "var(--accent-color)",
      backgroundColor: "rgba(79, 143, 247, 0.12)",   // ← 让数字更显眼
      padding: "2px 8px",
      borderRadius: "4px",
    }}
  >
    {controller.timeText}
  </span>
</div>
```

**改动 3（防御）：清除可能卡住的 localStorage 坏值**

在 `useSolveController.ts:131-133`，把 `timerVisible` 初始逻辑改成"只要没显式设过 false 就当 true"，并删掉这个 state（如果改动 1 已让它没用）。如果执行 AI 不想动 controller 结构，至少确保：

```tsx
// 可选：启动时强制重置一次，清掉历史坏值
useEffect(() => {
  if (localStorage.getItem("timerVisible") === null) {
    localStorage.setItem("timerVisible", "true");
  }
}, []);
```

### 2.3 验证

浏览器 `pnpm dev` → 进做题页：

1. 设置里"做题秒表计时器"开关 = 开 → 做题页顶部应显示"累计做题用时 00:00:01"且每秒跳动。
2. 关掉开关 → 秒表消失。再开 → 重新出现。
3. 数字清晰可见（不再是细细一条缝）。

### 2.4 成功率

~95%。替换方案：在顶栏右侧加常驻计时器 chip（更显眼），但属于功能新增而非修 bug，本计划不做，留给后续。

---

## 四、总验证清单（三个 bug 全改完后必跑）

### 4.1 构建

```bash
cd E:\AI\antigravity\stady-code\zcode-andraw\andraw
pnpm build
```

TS 不能报错。若报 `'initialTabId' is not defined` 之类，是 Bug1 修法 B 变量作用域没处理好。

### 4.2 浏览器 `pnpm dev`（localhost:1420）

- [ ] **Bug1**：建 2 题切换代码不丢；建 2 个 code tab 切换内容不丢。
- [ ] **Bug2**：秒表显示且每秒跳动，开关可控。
- [ ] **Bug3**：平板做题页拖动"题目/编辑器"横线、"编辑器/辅助"竖线，跟手无粘滞。

### 4.3 真机/模拟器

```bash
pnpm build
npx cap sync android
cd android
./gradlew assemblePhoneDebug
./gradlew assembleTabletDebug
```

- [ ] 手机（phone flavor）：Bug1 切题不丢码、Bug2 秒表可见、（若用到 Resizer）Bug3 拖动顺滑。
- [ ] 平板（tablet flavor）：三个 bug 全过。

### 4.4 回归检查（别改坏了别的）

- [ ] 编辑器仍能输入中文（IME composition 不受影响）。
- [ ] 自动保存仍工作（输入后 1.5s localStorage 有更新）。
- [ ] 平板抽屉宽度调整仍工作（用的也是 Resizer）。
- [ ] 主题切换、字号调整不受影响。

---

## 五、关键文件地图

| Bug        | 文件                                                  | 改动点                                                              |
| ---------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Bug1 A     | `src/layouts/PhoneShell.tsx`                        | viewMap 拆出 solve，加 `key={activeHistoryId}`                       |
| Bug1 A     | `src/layouts/TabletShell.tsx`                       | renderMainContent 的 solve case 加 `key={route.params?.historyId}` |
| Bug1 B     | `src/views/solve/useSolveController.ts:44-72`       | 初始 tab id 从 "1" 改为 `${historyId}_1`                              |
| Bug1 C（可选） | `src/components/CodeEditor.tsx:325-332`             | syncModels 加空值守卫                                                 |
| Bug3       | `src/components/Resizer.tsx:73-104`                 | 命中区 28px、去尺寸 transition、加 touch-action:none                      |
| Bug2       | `src/views/solve/PhoneSolveLayout.tsx:41-70`        | 渲染条件去 timerVisible、样式加显眼度                                        |
| Bug2       | `src/views/solve/useSolveController.ts:131-133`（可选） | 清 localStorage 坏值                                                |

## 六、红线（不要做）

- ❌ 不要给 `CodeEditor` 加 `key={tabId}`（HANDOVER 第 117 行明确禁止，会毁 Monaco 单实例性能）。本计划的 key 加在 `SolveContainer` 上，按题目 id，不是按 tab id。
- ❌ 不要改 `useSolveController.ts` 的业务逻辑（HANDOVER 第 117 行），只改 state 初始化（Bug1 B）和渲染条件（Bug2），不动 verify/chat/explain 流程。
- ❌ 不要改 `services/api.ts`、`services/history.ts`（业务资产）。
- ❌ 不要引入新依赖（`react-resizable-panels` 之类），Resizer 自研改 3 行即可。
- ❌ 不要在浏览器里测"沉浸式状态栏遮挡"——那是上一轮（round-2）的事，本轮 3 个 bug 都能在浏览器复现和验证。

## 七、风险与回退

- **Bug1 修法 A 加 key 后**，切题时 `SolveContainer` 会卸载重建，`useSolveController` 的 unmount auto-save（line 184-204）会触发——这正好把旧题目代码存盘，**是期望行为**。但要确认 unmount auto-save 在 React 18 strict mode 下不会双重触发导致数据错乱，验证时留意。
- **Bug1 修法 B 改初始 tab id** 会影响**已存在的旧 history**（它们的 codeTabs 里存的还是 `id:"1"`）。读取时旧数据仍能用（activeTabIdSaved 仍指向 "1"），但若用户对旧题目"新建 tab"，新旧 id 体系混在一起。**可接受**，因为只要同一题目内 id 唯一即可，跨题不撞。执行 AI 若担心，可在加载 codeTabs 时给没前缀的 id 补前缀（可选增强）。
- **回退**：每个 bug 独立，git 分开 commit，任一出问题可单独回退。

## 八、完成后更新 HANDOVER

在 `E:\AI\antigravity\stady-code\zcode-andraw\ai-tasks\HANDOVER.md` 的"当前实际进度"表加：

```
| 第三轮 bugfix（代码丢失/秒表/拖动） | ✅ 已完成（SolveContainer key + 初始tab id + Resizer 命中区 + 秒表渲染） |
```

---

---

# 第二部分 · 补充 Bug 修复（用户第二轮反馈）

> 用户补充反馈 3 个问题：
> 
> 1. 手机端无法拖动界面（滚动）
> 2. 没有可爱字体
> 3. 分窗口拖动困难（与第一部分 Bug3 是同一组件，已覆盖）
> 
> 经核实：
> 
> - 补充问题 3（分窗拖动）= 第一部分 Bug3，**无需重复修**，修了 Resizer 三处全好。
> - 补充问题 2（可爱字体）= **功能缺失**，电脑版 `first`（`E:\AI\antigravity\stady-code\first`，Tauri 桌面版，与 andraw 是同一 App 的不同端）已有完整成熟实现，**本计划照搬 first 的方案到 andraw**。
> - 补充问题 1（手机端滚动）= **大概率是 Bug1 的连锁反应**，建议先修 Bug1 再回头测，若仍卡则按下方独立修法兜底。

---

## 🟡 Bug 4 · 可爱字体（照搬电脑版 first 的方案）

### 4.0 决策已定（用户拍板）

- **字体文件**：`乐米小奶泡体.ttf`（4.6MB，用户提供的 `C:\Users\kelai\Downloads\乐米小奶泡体_猫啃网.zip` 解压后即得）
- **加载方式**：本地打包（`@font-face` + 资产随包），离线可用
- **应用范围**：文章/说明区使用可爱字体，编辑器和 mono 代码区保持原样

### 4.1 参考范本（电脑版 first 的实现，逐行已核实）

电脑版已经把这套方案做成熟了，**直接照搬**：

| first 文件                              | 行       | 内容                                                                                                                                                                | 作用                                        |
| ------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `src/assets/fonts/lemi_font.ttf`      | -       | 4.6MB 字体文件                                                                                                                                                        | 字体资产（与用户给的 zip 包里的 `乐米小奶泡体.ttf` **完全一致**） |
| `src/App.css`                         | 3-8     | `@font-face { font-family:'LemiFont'; src:url('./assets/fonts/lemi_font.ttf')... }`                                                                               | 字体声明                                      |
| `src/App.css`                         | 10-32   | `.lemi-font { font-family: var(--explain-font-family,'LemiFont',var(--font-sans)) !important; font-size: calc(var(--explain-font-scale,1.22)*1em) }` + h1-h4 分级字号 | 可爱字体 class，含字号缩放                          |
| `src/App.tsx`                         | 266-273 | `explainFontScale` / `explainFontEnabled` state（localStorage 持久化）                                                                                                 | 开关 + 缩放状态                                 |
| `src/App.tsx`                         | 323-333 | useEffect 把 state 同步到 CSS 变量 `--explain-font-scale` / `--explain-font-family`                                                                                     | 运行时切换                                     |
| `src/components/MarkdownRenderer.tsx` | 95-102  | h1→`lemi-font md-h1`、p→`lemi-font`                                                                                                                                | **说明区（题目/解释 Markdown）应用可爱字体**             |
| `src/components/SolveView.tsx`        | 1439    | `<div className="lemi-font">`                                                                                                                                     | 做题页部分区域                                   |
| `src/components/SettingsDrawer.tsx`   | 135-150 | "解释区手写字号缩放" slider + "可爱字体开关"                                                                                                                                     | 设置面板入口                                    |

### 4.2 修法（在 andraw 端复刻 first 的方案）

工作目录：`E:\AI\antigravity\stady-code\zcode-andraw\andraw`

#### 步骤 1：放入字体资产

```bash
# 从用户下载的 zip 解压出 ttf，复制到 andraw 的 assets 目录
# 源：C:\Users\kelai\Downloads\乐米小奶泡体_猫啃网.zip 解压后得到 乐米小奶泡体/乐米小奶泡体.ttf
# 目标：E:\AI\antigravity\stady-code\zcode-andraw\andraw\src\assets\fonts\lemi_font.ttf
```

执行 AI 操作：

1. 若 andraw 没有 `src/assets/fonts/` 目录，先创建。
2. 把 zip 包里的 `乐米小奶泡体.ttf` 复制（重命名）为 `src/assets/fonts/lemi_font.ttf`。
3. （可选优化）用 `woff2_compress` 或在线工具把 4.6MB 的 ttf 压缩成 woff2（通常能压到 1.5-2MB），改善包体积。**若不会转 woff2，直接用 ttf 也能用**。

> **快捷路径**：first 项目里已经有现成的 `lemi_font.ttf`（路径 `E:\AI\antigravity\stady-code\first\src\assets\fonts\lemi_font.ttf`，4.6MB），**直接从这里复制到 andraw 即可**，不用再解压 zip。

#### 步骤 2：声明字体和 class

文件：`src/styles/base.css`（在文件顶部 reset 之后、`:root` 之前加入）

```css
/* 可爱字体（照搬电脑版 first 的方案） */
@font-face {
  font-family: 'LemiFont';
  src: url('../assets/fonts/lemi_font.ttf') format('truetype');
  /* 若步骤 1 做了 woff2 转换，改用：
   * src: url('../assets/fonts/lemi_font.woff2') format('woff2');
   */
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.lemi-font {
  font-family: var(--explain-font-family, 'LemiFont', var(--font-sans)) !important;
  font-size: calc(var(--explain-font-scale, 1.22) * 1em);
}

h1.lemi-font { font-size: calc(var(--explain-font-scale, 1.22) * 1.5em); }
h2.lemi-font { font-size: calc(var(--explain-font-scale, 1.22) * 1.25em); }
h3.lemi-font { font-size: calc(var(--explain-font-scale, 1.22) * 1.1em); }
h4.lemi-font { font-size: calc(var(--explain-font-scale, 1.22) * 1.0em); }
```

注意 `url()` 路径是相对于 `base.css` 所在的 `src/styles/`，所以是 `../assets/fonts/lemi_font.ttf`。

#### 步骤 3：状态管理（开关 + 缩放，localStorage 持久化）

文件：`src/app/useAppStore.ts`

在 `DEFAULT_SETTINGS`（约 line 60-80）里加两个字段：

```ts
const DEFAULT_SETTINGS: AppSettings = {
  // ... 已有字段
  explainFontEnabled: true,    // 可爱字体开关，默认开
  explainFontScale: 1.22,      // 字号缩放，默认 1.22（与 first 一致）
};
```

注意确保 `AppSettings` 类型定义（`useAppStore.ts` 顶部 interface）也加这两个字段。

#### 步骤 4：运行时把 state 同步到 CSS 变量

文件：`src/app/AppProviders.tsx`

在现有的 `useEffect(() => { ... }, [isDarkMode])`（line 23-32）旁边新增一个 effect：

```tsx
const explainFontEnabled = useAppStore((s) => s.settings.explainFontEnabled);
const explainFontScale = useAppStore((s) => s.settings.explainFontScale);

useEffect(() => {
  const fontFamily = explainFontEnabled
    ? "'LemiFont', var(--font-sans)"
    : "var(--font-sans)";
  document.documentElement.style.setProperty("--explain-font-family", fontFamily);
}, [explainFontEnabled]);

useEffect(() => {
  document.documentElement.style.setProperty("--explain-font-scale", explainFontScale.toString());
}, [explainFontScale]);
```

这样关掉开关时 `--explain-font-family` 回退到 `var(--font-sans)`，可爱字体立即消失，符合预期。

#### 步骤 5：在说明区（Markdown）应用 class

文件：`src/components/markdown/MarkdownRenderer.tsx`（约 line 43 附近的 components 对象）

参考 first 的 `MarkdownRenderer.tsx:95-102`，给 h1-h4 和 p 加 `lemi-font` class：

```tsx
components={{
  h1: ({ children }) => <h2 className="lemi-font md-h1">{children}</h2>,
  h2: ({ children }) => <h3 className="lemi-font md-h2">{children}</h3>,
  h3: ({ children }) => <h4 className="lemi-font md-h3">{children}</h4>,
  h4: ({ children }) => <h4 className="lemi-font md-h4">{children}</h4>,
  p: ({ children }) => <p className="lemi-font" style={{ lineHeight: 1.7 }}>{children}</p>,
  // ... 其他保持不变
}}
```

`LineSelectableMarkdown.tsx`（line 250 等）用的是 mono 字体，**不要动**，保持代码字体不变。

#### 步骤 6：设置面板加开关和滑块

文件：`src/views/settings/PhoneSettings.tsx` 和 `src/views/settings/SettingsSheet.tsx`（两处都要加，前者手机端、后者平板抽屉）

参考 first 的 `SettingsDrawer.tsx:135-150`，在表单里加：

```tsx
<Form.Item label="可爱字体（说明区手写体）">
  <Switch
    checked={settings.explainFontEnabled}
    onChange={(v) => updateSettings({ explainFontEnabled: v })}
  />
</Form.Item>

<Form.Item label={`说明区字号缩放：${Math.round(settings.explainFontScale * 100)}%`}>
  <Slider
    min={0.8}
    max={2.0}
    step={0.02}
    value={settings.explainFontScale}
    onChange={(v) => updateSettings({ explainFontScale: v })}
  />
</Form.Item>
```

注意 `updateSettings` 要从 store 取（`useAppStore((s) => s.updateSettings)`），确认它的实现是把 settings merge 进去。

### 4.3 验证

浏览器 `pnpm dev`：

1. 进做题页，题目描述区（Markdown 渲染的标题、正文）应显示为**乐米小奶泡体**（圆润手写感），不再是默认系统字体。
2. 代码编辑器、控制台、行号仍保持 `Fira Code` mono 字体不变。
3. 设置里关掉"可爱字体"开关 → 说明区立即变回系统字体；再开 → 变回可爱字体。
4. 拖动"字号缩放" slider → 说明区字号实时变化。
5. 刷新页面 → 设置（开关 + 缩放值）保持。

真机：
6. 打包后进做题页，**离线状态下**可爱字体仍正常显示（这是本地打包方案的核心优势）。

### 4.4 成功率

- 照搬成熟方案：**~95%**
- 唯一风险点：Vite 打包时 `url()` 字体路径解析。若构建报错"cannot resolve `../assets/fonts/lemi_font.ttf`"，检查路径层级。`src/styles/base.css` → `../assets/` = `src/assets/`，路径是对的。
- 包体积：增加约 4.6MB（ttf）或 1.5-2MB（woff2）。Capacitor apk 可接受。

### 4.5 不要做

- ❌ 不要把可爱字体应用到代码编辑器（`CodeEditor.tsx:368` 的 `fontFamily: "var(--font-mono)"` 保持不动）。
- ❌ 不要应用到 `LineSelectableMarkdown.tsx`（那里是代码示例展示，必须 mono）。
- ❌ 不要用 Google Fonts CDN（离线 App 会失效，用户已明确选本地打包）。

---

## 🟢 Bug 5 · 手机端无法拖动界面（独立兜底修法，仅当 Bug1 修完仍卡时执行）

### 5.0 前置判断（重要）

> **执行 AI：先修完 Bug1（SolveContainer key + 初始 tab id），再测手机端滚动。** 大概率 Bug1 修了之后手机端滚动自然恢复，本节就不用做了。
> 
> 若修完 Bug1 + Resizer（Bug3）后手机端**仍**卡住，再执行本节。

### 5.1 根因（独立 bug 时的可能原因）

- `base.css:10` 全局 `html, body, #root { overflow: hidden; overscroll-behavior: none; }`。这套对平板分窗是对的，但手机端中间滚动容器若漏了 `overflowY: auto` + `-webkit-overflow-scrolling: touch`，整页卡住。
- `PhoneShell.tsx:56` 中间容器有 `overflowY: "auto"`，但 `PhoneSolveLayout` 内部各子区（题目区/编辑器/tab 栏）是否各自正确滚动，需实测。
- `index.html` 已确认**无**滚动锁死脚本（与 first 电脑版不同，first 有 lockScroll 但 andraw 没有，不是这个原因）。

### 5.2 修法（兜底）

#### 修法 A：给手机端所有滚动容器统一加惯性滚动

文件：`src/styles/base.css`

在 reset 块之后加一个工具规则：

```css
/* 手机端内部滚动容器统一启用 iOS 惯性滚动 + 阻止滚动链 */
.scroll-y {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;   /* iOS 惯性滚动 */
  overscroll-behavior: contain;        /* 滚到边界不传给父层 */
  touch-action: pan-y;                 /* 允许纵向触摸滚动 */
}

.scroll-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-x;
}
```

#### 修法 B：给 PhoneShell 中间容器补 className

文件：`src/layouts/PhoneShell.tsx:52-60`

当前：

```tsx
<div style={{ overflowY: "auto", minHeight: 0, width: "100%", display: "flex", flexDirection: "column" }} className="view-enter">
```

改为（补 `scroll-y` class 并显式 touch-action）：

```tsx
<div
  className="view-enter scroll-y"
  style={{
    overflowY: "auto",
    minHeight: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    touchAction: "pan-y",
    WebkitOverflowScrolling: "touch",
  }}
>
```

#### 修法 C：排查 PhoneSolveLayout 子区滚动

文件：`src/views/solve/PhoneSolveLayout.tsx`

若手机做题页（题目/编辑器纵向堆叠）某个区卡住，确认每个独立滚动区都有：

- 明确的 `height` 或 `flex` 约束（不能让内容撑开无限高）
- `overflowY: auto` + `minHeight: 0`（flex 子项滚动必需）
- 必要时套 `scroll-y` class

### 5.3 验证

真机 phone apk：

1. 首页历史列表很长时，能正常上下滑动。
2. 做题页题目描述很长时，题目区能滚动。
3. 编辑器区能滚动（代码超出一屏时）。
4. 设置页表单能上下滚动。
5. 滑动时**不触发**整体页面跳动/橡皮筋。

### 5.4 成功率

- 若是 Bug1 连锁：修 Bug1 后 100% 恢复。
- 若是独立滚动 bug：修法 A+B 后 ~85%。
- 难点：手机端某个特定子区滚动卡住，需要逐个组件实测定位。

---

## 补充：分窗口拖动（用户补充问题 3）= 第一部分 Bug3

> 用户补充的"分窗口拖动困难"与第一部分 Bug3 是**同一个 Resizer 组件**的同一个问题（命中区 6px + transition 粘滞 + 缺 touch-action）。
> 
> Resizer 用在 3 处：
> 
> - `TabletSolveLayout.tsx:136`（题目/编辑器横线）
> - `TabletSolveLayout.tsx:196`（编辑器/辅助竖线）
> - `TabletDrawer.tsx:606`（抽屉宽度）
> 
> 修了第一部分 Bug3，这 3 个拖动点**同时全部修复**，无需重复工作。

---

## 补充部分的总验证清单（追加到第四节总清单之后）

### 可爱字体（Bug4）

- [ ] 做题页题目描述区显示乐米小奶泡体，圆滚滚手写感。
- [ ] 代码编辑器/控制台/行号仍为 Fira Code mono。
- [ ] 设置开关可控，关闭后说明区变回系统字体。
- [ ] 字号 slider 实时生效。
- [ ] 刷新后设置保持。
- [ ] 真机离线状态字体正常。
- [ ] `pnpm build` 构建无字体路径错误。

### 手机端滚动（Bug5，仅当独立修时跑）

- [ ] 修完 Bug1 后先测，若已恢复则跳过。
- [ ] 首页/做题页/设置页均可正常上下滚动。
- [ ] 无整体跳动/橡皮筋。

---

## 附：分析依据（供执行 AI 复核）

### 第一部分（Bug1/2/3）

- `SolveContainer.tsx:14-44` → 调 useSolveController，无 key。
- `useSolveController.ts:29` → `useState(historyId)` 只首次读，无同步 effect。
- `useSolveController.ts:61` → 初始 tab `id:"1"`，跨题共享。
- `CodeEditor.tsx:316` → model URI 用 tab.id，Monaco 全局缓存。
- `CodeEditor.tsx:326-328` → syncModels 用 React state 覆盖 model。
- `Resizer.tsx:73-74` → 命中区 width/height = 6px。
- `Resizer.tsx:75` → transition 含 width/height 0.2s，拖动粘滞。
- `Resizer.tsx` 全文 → 无 `touch-action: none`。
- `Resizer` 用在 `TabletSolveLayout.tsx:136,196` + `TabletDrawer.tsx:606`（3 处分窗拖动全用同一组件）。
- `PhoneSolveLayout.tsx:41` → 渲染条件 `timerEnabled && timerVisible`，timerVisible 易卡 false。
- `useSolveController.ts:216-237` → 计时逻辑本身健全。

### 第二部分（Bug4/5，补充）

- 电脑版 `first/src/App.css:3-32` → 完整可爱字体方案（@font-face + .lemi-font + h1-h4 分级）。
- 电脑版 `first/src/assets/fonts/lemi_font.ttf` → 4.6MB 字体资产（与用户提供的 `乐米小奶泡体.ttf` 完全一致）。
- 电脑版 `first/src/App.tsx:266-333` → explainFontEnabled/Scale state + CSS 变量同步。
- 电脑版 `first/src/components/MarkdownRenderer.tsx:95-102` → h1-h4/p 应用 lemi-font class。
- 电脑版 `first/src/components/SettingsDrawer.tsx:135-150` → 开关 + slider 设置入口。
- andraw `src/styles/tokens.css:19-20` → 字体变量硬编码系统字体，无可爱字体（功能缺失）。
- andraw `src/app/AppProviders.tsx:60` → antd 主题 fontFamily 写死 Consolas（无可爱字体）。
- andraw `src/styles/base.css:10` → 全局 `overflow:hidden + overscroll-behavior:none`，手机端子容器漏滚动时整页卡住。
- andraw `src/layouts/PhoneShell.tsx:56` → 中间容器有 `overflowY:auto`，但 PhoneSolveLayout 子区待测。
- andraw `index.html` → 无滚动锁死脚本（排除该嫌疑）。
- 全项目 grep `cute/kawaii/可爱` → 零命中，确认可爱字体从未在 andraw 实现。
