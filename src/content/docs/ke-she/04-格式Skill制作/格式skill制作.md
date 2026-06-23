---
title: "格式 Skill 制作"
description: "通过大语言模型定制开发的 Word 报告自动化生成 Skill。包含本地 Carbon 截图排错与 python-docx 装配实战。"
---

## 项目介绍

### 这个项目是什么？
这是一个基于大语言模型（LLM）定制开发的自动化报告排版工具（简称 Skill）。该工具接收用户粗糙的文字草稿、班级姓名以及代码片段，自动进行内容结构划分，并在本地调用网页 Carbon 服务生成 Mac 窗口风格的代码截图，最终装配并输出一份格式完全符合学术规范的 Word（.docx）课程设计报告。

### 做成了什么？
- **本地 Carbon 代码截图集成**：通过在本地托管 React/Next.js 的 Carbon 前端服务，配合 Puppeteer 无头浏览器进行 DOM 节点截取，实现了高质量、离线的 Mac 三点控制栏代码图片渲染。
- **python-docx 自动组装引擎**：基于 Python 脚本，自动化解析 JSON 格式的项目结构树，将文本与生成的代码截图按照中原工学院的课设封面与章节骨架完美拼装。
- **多轮排错与工程隔离**：解决了图片插入质量差、大模型产生“以文字代表图片”的幻觉、Carbon 边框内边距过大等问题，成功实现多名学生课设报告的批量输出。

### 值得看什么？
- **从繁琐工作到 AI Skill 的沉淀**：展示了如何把“格式排版、代码截图、文件拼装”这一复杂流程标准化为 AI 可以自动识别并调用的 Skill 规范。
- **绘图幻觉与渲染排错过程**：详实记录了如何纠正大模型在画图上的幻觉、进行环境隔离，以及优化本地 Puppeteer 无头浏览器的调试历程。

---

## 核心使用教程

该 Skill 已集成在智能体助手里，支持对话运行与本地脚本运行两种场景：

### 1. 场景一：直接在对话中让我帮你整理（推荐）
你不需要运行任何命令，直接在对话框里发给我你的材料即可。

**步骤**：
1. **提供信息**，例如：
   > “帮我把这些整理成课设报告。我是软件 2201 班的张三，学号 202208080101。下面是我的课设草案和代码：……[粘贴你的草稿、类设计说明、核心 Java 代码等]……”
2. **AI 自动处理**：
   - 自动检测并提取班级、学号、姓名等封面字段。
   - 自动分析你发来的代码段，将其通过本地 Carbon 服务渲染为精美的代码截图（避免超长代码影响观感，每张图控制在 30 行内）。
   - 自动按照规范骨架，将你的文字归入对应章节（绝不修改或润色你的原文）。
   - 自动装配并输出一份格式完全对齐的 `.docx` 报告文件，并告知绝对路径。
   - 提示需要手动补充的图（例如系统类图、数据库 ER 图等占位符）。

---

### 2. 场景二：在本地手动执行脚本
如果希望通过命令行手动处理已整理好的 JSON 数据，可以使用已经配置并通过测试的底层脚本：

#### 步骤 1：本地启动 Carbon 服务
代码截图需要用到本地渲染服务，请确保它在后台运行：
```powershell
# 在 carbon 目录下运行开发服务器
cd E:\AI\antigravity\stady-code\Supplement\carbon
npx yarn dev
```

#### 步骤 2：准备数据文件 `content.json`
在 `assets/mock_content.json` 的基础上，编写你的课设内容（包含封面、章节树以及要截图的代码路径等）。

#### 步骤 3：手动运行截图脚本
如果有新的代码段需要生成截图：
```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
node scripts/screenshot.js --code <代码文件路径> --lang java --out assets/new_code.png
```

#### 步骤 4：一键装配 Word 报告
使用 Python 3.13 解释器一键装配最终的 Word 文档：
```powershell
C:\Users\kelai\AppData\Local\Programs\Python\Python313\python.exe scripts/build_docx.py --content <你的content.json路径> --template assets/template.docx --out E:\AI\zcode\object\skills\course-design-report\我的课程设计报告.docx
```

---

## 附录 / 原始记录

> [!NOTE]
> 本节保留了在探索与制作该 Skill 过程中产生的多轮对话日志、缺陷调试记录以及 Carbon 服务的原理介绍。

### 1. 原始 AI 提炼需求与提示词
```markdown
# 初始需求
制作一个 Skill 工具，提取格式特点并重新制定一份模板文件。其中里面的代码换成这个项目的一个截图。
配置：没有背景边框，Mac 风格，水印 kelai，白色背景。
输入一大堆信息，让 AI 进行分析，并根据指定格式把相关内容写进新文档，重新输出一份文档出来。
用户内容的语言文字不要更改，不要尝试润色，仅作格式上的整理和整体归类。

# 代码图优化要求
- 代码只放图片，替换代码，这样更美观。
- 封面支持自由输入，输入不全时 AI 会主动询问。
- 如果少章节内容，先直接忽略以保证整体完整，没有缺口。最后反馈给用户让其选择是否补充。
```

### 2. Carbon 代码截图排错历程
在测试中发现，AI 生成的图片插入样板效果非常糟糕，出现了错误的边框和内边距，甚至有部分内容缺失。

![初始有问题的截图](../assets/局部截取_20260623_012654.png)
*图：初次生成的图片包含不必要的背景，排版较乱*

- **排错指令 1**：
  > “不要这上面那里的信息。另外我要说明，你的做法不是根据脚本来合成一个大图然后截图的，而是通过 AI 自己判断哪些代码该拆分开，然后发送拆分开的代码给 Carbon，返回一个有标志性 Mac 三个点的图片……”
- **排错指令 2**：
  > “修复，不要边框，在 carbon 设置里把这两个拉到最低：padding 的 vert 和 horiz。”

![优化边距后的截图](../assets/test_user_code.png)
*图：去除边框与内边距后的干净 Mac 风格代码图*

![最终验证截图](../assets/test_user_code%201.png)
*图：确认排版正确的最终渲染图*

### 3. 本地调试与验证路径
- 调试交接文档：[HANDOFF.md](file:///E:/AI/zcode/object/skills/course-design-report/HANDOFF.md)
- 改进审查记录：[REVIEW.md](file:///E:/AI/zcode/object/skills/course-design-report/REVIEW.md)
- 验证脚本：[VERIFICATION.md](file:///E:/AI/zcode/object/skills/course-design-report/AI-debug/VERIFICATION.md)
- 临时截图输出区：[extracted_media](file:///E:/AI/zcode/object/skills/course-design-report/scratch/extracted_media)

### 4. Carbon 本地离线渲染机制
1. **Carbon 本质是一个 Web 前端应用**：它不是一个可以直接在命令行后台输出结果的二进制可执行程序。它是一个基于 React / Next.js 构建的网页应用。它的代码高亮、Mac 窗口按钮装饰、代码行号排版等视觉效果，都是由浏览器的 CSS 样式和 JS 引擎在网页加载时动态计算并渲染出来的。
2. **本地“调取网页”是唯一的无损截图方式**：
   - **本地网页托管**：在本地启动 Carbon 项目（`localhost:3000` 运行），将其作为图片生成引擎。
   - **浏览器模拟加载**：脚本启动一个无头（Headless）浏览器（Puppeteer），在后台“调取并打开”本地这个网页，并通过 URL 参数将代码传递给网页。
   - **DOM 节点截图**：等网页渲染出漂亮的代码容器后，浏览器对该容器（`.export-container` 元素）进行区域截图，保存为 PNG。
3. **100% 本地部署（支持离线）**：整个过程完全在本机的内存和本地网络中完成，不需要连接互联网。如果在离线状态下，CDN 字体加载失败，浏览器会自动降级使用本机自带的等宽字体，不影响离线使用。