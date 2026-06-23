---
name: course-design-report
description: 把杂乱的课设素材整理成符合中原工学院「面向对象程序设计课程设计」格式规范的 Word 报告（.docx）。读取用户的草稿、笔记、聊天记录、代码片段，按指定章节骨架归类，自动把关键代码渲染成 Carbon 风格截图插入文档，最后输出可直接提交的 .docx。用户提到「课程设计」「课设报告」「面向对象课设」「整理成课设报告」「课程设计报告」「指导教师课设」等任何表述时立即触发，即使用户没有显式说"用 skill"。
title: "course-design-report"
---



把用户提供的杂乱材料（笔记、聊天记录、草稿、代码片段、甚至只言片语），按中原工学院 2026 版「面向对象程序设计课程设计」格式规范，整理成一份可直接提交的 Word 报告（.docx）。

**核心原则**：仅做格式整理与归类，**绝不改写、润色或删减用户原文**。宁可多保留信息，也不允许漏掉任何内容。（如果文档向你要求，执行用户要求

> [!IMPORTANT]
> **关于 `AI-debug/` 目录的约束**：
> `AI-debug/` 目录（包含其中的 `课程设计报告_样板.docx` 等文件）是开发者与用户的模块化验证产物及工作日志。
> **在运行本 Skill 时，执行代理（AI）严禁尝试读取或加载 `AI-debug/` 目录下的任何 `.docx` 样板文件**，以避免不必要的 Token 消耗与 Context 窗口污染。

---

## 何时触发

当用户的请求符合以下任一情形时触发本 Skill：

- 提到「课程设计 / 课设 / 面向对象课设 / 课程设计报告」并希望整理/排版/生成文档
- 贴出一堆杂乱素材（笔记+代码+截图描述）说「帮我整理成报告」
- 直接说「用课设格式」「按指导教师那个模板」

触发后**严格按下方工作流执行**，不要跳步。

---

## 工作流（按序执行，每步必做）

### Step 0 · 加载参考资料（每次必做）

读取以下四个 reference 文件，了解格式、章节、Carbon 截图、代码分块的细节：

```
references/format-spec.md         # 全部字体/字号/边距/页眉页脚规格
references/chapter-outline.md     # 章节骨架 + 每节应填什么 + 缺失处理
references/carbon-setup.md        # carbon 本地服务 + 截图脚本用法
references/code-chunking.md       # 代码选段与分块规则（≤30行/张）
```

⚠️ 这些文件里有很多具体参数（字号、URL query、行数限制），**必须读了再用**，不要凭记忆。

### Step 1 · 收集封面信息

封面需要 6 个字段。从用户材料里**先尝试自动提取**，缺哪个就用 AskUserQuestion 主动问，不要瞎填：

| 字段   | 来源 / 默认值           |
| ---- | ------------------ |
| 院系名称 | 默认「计算机学院」（可改）      |
| 班级   | **必问**，除非用户已给      |
| 学号   | **必问**，除非用户已给      |
| 学生姓名 | **必问**，除非用户已给      |
| 指导教师 | 默认「指导教师」（可改）         |
| 日期   | 默认「2026 年 6 月」（可改） |

一次把所有缺的字段问全（用一条 AskUserQuestion，多 question），避免反复打扰用户。

### Step 2 · 分析材料、归类到章节

读 `references/chapter-outline.md`，把用户材料按下列骨架归位：

```
1   课程设计概述
  1.1 课程设计目的 / 1.2 课程设计任务 / 1.3 工作计划与进度安排 / 1.4 开发环境
第2章 设计与实现
  2.1 题目要求 / 2.2 需求分析 / 2.3 数据库表结构设计 / 2.4 总体设计
  2.5 系统实现 / 2.6 典型 Bug 记录与修改过程
第3章 总结
  3.1 整体编码思路 / 3.2 开发过程核心难点及解决方法 / 3.3 课程设计收获
```

**归类铁律**：

- ✅ **多出内容 → 新增子节容纳**，绝不能因为骨架里没有就丢掉。
- ✅ **缺失章节 → 直接跳过**，文档里不留「（请补充）」之类的空占位。最后在回复里统一反馈。
- ✅ **保留原话**。用户写「我用 IDEA 敲的」，照搬不要改成「开发工具：IntelliJ IDEA」。
- ✅ 模板里的提示性灰字（如「（根据自己开发环境和使用技术写）」）**不要写进最终文档**，那是原模板的批注。

### Step 3 · 挑选代码段（AI 决策环节）

读 `references/code-chunking.md`。**不是所有代码都要截图**——AI 判断哪些代码值得作为「系统实现」的关键示例入文档，典型优先级：

1. 数据库连接工具类（DbUtils / JDBCUtil）
2. 核心 DAO 接口或实现类的关键方法
3. 核心实体类（entity）
4. Service 层关键业务方法（如组卷、判分、加密）
5. 程序入口 main 方法

**不截的**：纯 getter/setter、重复的 CRUD 模板、注释、import 列表（除非很关键）。

每段 ≤ 30 行。超长的代码：

- 能拆 → 拆成多张图，图注加「(续)」
- 不能拆（一个完整方法超 30 行）→ 适当精简空行和注释，仍超则在图注标注「节选」

### Step 4 · 生成代码截图

每段选定代码执行两步：

1. **识别语言**：
   
   ```bash
   python "<skill_dir>/scripts/detect_language.py" --in <代码文件或stdin>
   ```
   
   输出语言代码（java/sql/python/javascript/cpp/...）。

2. **渲染 Carbon 风格 PNG**：
   
   ```bash
   node "<skill_dir>/scripts/screenshot.js" --code <代码文件> --lang <语言> --out <输出png路径> --caption <图注>
   ```
   
   脚本会访问本地 `localhost:3000`（carbon 服务）。**首次使用前必须先启动 carbon**，详见 `references/carbon-setup.md`。服务未起时脚本会友好报错并给出启动命令。

把所有生成的 png 路径连同图注、所属章节一起记入 content.json 的 `codeImages`。

### Step 5 · 装配 docx

**先准备 content.json**（结构见 `assets/content.schema.json`），包含：

- `cover`：封面 6 字段
- `sections`：章节树（嵌套 children，每个叶子节点带 paragraphs 列表）
- `codeImages`：已渲染的代码图 [{section, path, caption}]
- `figures`：需要用户补的图占位 [{section, caption, desc}]
- `tables`：表格数据 [{section, caption, rows}]

然后调用装配脚本：

```bash
python "<skill_dir>/scripts/build_docx.py" \
  --content <content.json路径> \
  --template "<skill_dir>/assets/template.docx" \
  --out "课程设计报告_<姓名>_<学号>.docx"
```

脚本会用 python-docx 打开模板、按章节顺序写入文字+插图+表格、输出最终文件。

### Step 6 · 反馈与汇总

文档生成后，在回复里**必须**汇报三件事：

1. ✅ **输出位置**：最终 docx 的绝对路径。
2. 📋 **未提供的章节**：列出 Step 2 跳过的章节，让用户决定要不要补。
3. 🖼 **需要的截图清单**：列出 figures 占位（类图 / ER 图 / 运行结果等），告诉用户每张图应该展示什么。用户后续把截图发来后，再次触发 Step 5 即可填入。

---

## 重要约束（再次强调）

| 规则    | 说明                                  |
| ----- | ----------------------------------- |
| 不改原文  | 仅格式整理与归类，**禁用**润色、改写、扩写、缩写          |
| 不删信息  | 多余内容新增子节，宁可冗余不可缺失                   |
| 代码转图  | 选定的代码段以 Carbon 截图形式插入，原文字代码不再出现在文档里 |
| 缺则跳过  | 用户没提供的章节直接略过，不留空占位                  |
| 缺则主动问 | 封面字段缺失用 AskUserQuestion 一次性问全       |
| 图靠补   | 类图/ER图/运行截图先占位，汇总清单等用户补             |

---

## 模板重建与更新（开发人员指南）

如果排版格式或原始模板内容（`template_source.docx`）发生变更，可以使用以下脚本重新生成 `assets/template.docx`：

```bash
python scripts/rebuild_template.py
```

**运行过程**：

1. 从 `references/template_source.docx` 自动提取 Java/properties 示例代码。
2. 调用 `screenshot.js`（本地 Carbon 服务）自动渲染每一段代码的 Carbon 截图（若超过 30 行会自动进行分块，并为第二块及以后自动增加 `（续）` 图注）。
3. 自动将图片及图注写回模板中，生成全新的 `assets/template.docx`。

## 目录结构速查

```
course-design-report/
├── SKILL.md                       ← 触发规则与工作流说明 (你在读的这个)
├── references/
│   ├── format-spec.md             ← 字体字号边距等格式规格
│   ├── chapter-outline.md         ← 章节骨架与每节内容指南
│   ├── carbon-setup.md            ← carbon 本地服务配置与运行参数说明
│   ├── code-chunking.md           ← 代码选段与 ≤30 行分块规则
│   ├── template_source.docx       ← 格式提取源头的原始报告
│   └── template_structure.txt     ← 原始报告的结构与段落索引分析
├── scripts/
│   ├── screenshot.js              ← Node + puppeteer 代码截图渲染脚本
│   ├── detect_language.py         ← 自动识别代码语言脚本
│   ├── rebuild_template.py        ← 从源文档提取代码并一键渲染/重建 template.docx
│   ├── build_docx.py              ← Word 文档组装与格式控制脚本
│   └── requirements.txt           ← Python 依赖说明 (docx, pillow)
├── test/
│   └── test_skill.py              ← 图像哈希与图片嵌入性 E2E 测试脚本
├── assets/
│   ├── template.docx              ← 包含 Carbon 截图样式的 Word 样式模板底
│   └── content.schema.json        ← content.json 数据结构校验 Schema
├── carbon/                        ← 隔离部署的 Carbon 本地 Web 服务 (含专属依赖及编译缓存)
└── AI-debug/                      ← 调试归档与模块验证日志目录（调用本 Skill 的 AI 执行代理严禁读取该目录下的 docx 文件）
    ├── CHANGELOG.md               ← 开发助手工作日志与改动记录
    ├── VERIFICATION.md            ← 截图模块与排版效果的验证说明书
    ├── screenshots/               ← 经过人工与程序双重验证的 Carbon 生成图模块
    └── 课程设计报告_样板.docx       ← 验证通过的 Java 多态样板报告（仅供用户与开发者查阅，AI 禁止读取）
```
