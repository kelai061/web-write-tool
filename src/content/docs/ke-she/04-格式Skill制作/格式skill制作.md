---
title: "Word 报告 Skill"
description: "通过大语言模型定制开发的 Word 报告自动化生成 Skill。包含本地 Carbon 截图排错与 python-docx 装配实战。"
---

## 页面摘要
- **核心定位**：使用大语言模型全自动整理个人课设与代码，并装配输出符合规范的 Docx Word 文档的 Skill。
- **重点成果**：本地 Carbon 服务与 Puppeteer 无头浏览器集成实现代码截图，python-docx 自动组装，支持多人课设报告批量生成。
- **关键看点**：AI 绘图幻觉纠错（padding 设置、不要边框）、环境隔离与调试、命令行自动化脚本运行。

## 推荐阅读
- [核心使用教程](#核心使用教程)
- [Carbon 本地离线渲染机制](#carbon-介绍)
- [附录：完整原始开发与排错对话记录](#附录完整原始开发与排错对话记录)

---

## 核心使用教程

该 Skill 已经完全集成在你的智能体助手里了。以下是**针对不同场景的使用方法**：

### 1. 场景一：直接在对话中让我帮你整理（推荐）
你不需要运行任何命令，直接在对话框里发给我你的材料即可。

**步骤**：
1. **发送你的个人信息和课设草稿**，例如：
   > "帮我把这些整理成课设报告。我是软件 2201 班的学生丙，学号 20220808XXXX。下面是我的课设草案和代码：……[粘贴你的草稿、类设计说明、核心 Java 代码等]……"
2. **AI 会自动处理**：
   - 自动检测并提取班级、学号、姓名等封面字段。
   - 自动分析你发来的代码段，将其通过本地 Carbon 服务渲染为精美的代码截图（单次长度不超过 30 行以保证观感）。
   - 自动按照中原工学院的规范骨架，将你的文字归入对应章节（绝不修改或润色你的原文）。
   - 自动装配并输出一份格式完全对齐的 `.docx` 报告文件，并告诉你保存的绝对路径。
   - 告诉你需要手动补充的图（例如系统类图、运行截图），等把图片发送给 AI 后，可以自动装配进文档。

---

### 2. 场景二：如果你想在本地手动执行脚本
如果你希望通过命令行手动处理已整理好的 JSON 数据，可以使用我们已经配置并测试通过的底层脚本：

#### 第一步：确保本地 Carbon 服务处于启动状态
代码截图需要用到本地渲染服务，请确保它在后台运行：
```powershell
# 在 carbon 目录下运行开发服务器
cd E:\AI\antigravity\stady-code\Supplement\carbon
npx yarn dev
```

#### 第二步：准备你的数据文件 `content.json`
在 `assets/mock_content.json` 的基础上，编写你的课设内容（包含封面、章节树、以及要截图的代码路径等）。

#### 第三步：手动运行截图脚本（如有新代码）
如果你有新的代码段需要生成精美截图：
```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
node scripts/screenshot.js --code <代码文件路径> --lang java --out assets/new_code.png
```

#### 第四步：手动装配 Word 报告
使用 Python 3.13 解释器一键装配最终的 Word 文档：
```powershell
C:\Users\user\AppData\Local\Programs\Python\Python313\python.exe scripts/build_docx.py --content <你的content.json路径> --template assets/template.docx --out E:\AI\zcode\object\skills\course-design-report\我的课程设计报告.docx
```

---

## Carbon 介绍

### 1. Carbon 本质是一个 Web 前端应用
Carbon 并不是一个像 GCC 或 Pandoc 那样可以直接在命令行后台输出结果的二进制可执行程序。它是一个基于 React / Next.js 构建的网页应用。它的代码高亮、Mac 窗口按钮装饰、代码行号排版等视觉效果，都是**由浏览器的 CSS 样式和 JS 引擎在网页加载时动态计算并渲染出来的**。

### 2. 本地“调取网页”是唯一的无损截图方式
为了自动化、批量地生成符合 Carbon 视觉规范的图片，脚本（`screenshot.js`）的实现原理是：
1. **本地网页托管**：我们在本地启动 Carbon 项目（在 `localhost:3000` 运行），将其作为图片生成引擎。
2. **浏览器模拟加载**：脚本启动一个无头（Headless）浏览器（Puppeteer），在后台“调取并打开”本地这个网页，并通过 URL 参数（如 `http://localhost:3000/?code=...&l=java&t=one-light`）将需要截图的代码传递给网页。
3. **DOM 节点截图**：等本地网页渲染出漂亮的代码容器后，浏览器对该容器（`.export-container` 元素）进行区域截图，保存为 PNG。

### 3. 这依然是 100% 本地部署（支持离线）
- **不依赖外部网络**：虽然看起来像是在“调取网页”，但请求的目标地址是 `localhost`（即 `127.0.0.1` 本机）。整个过程完全在您本机的内存和本地网络中完成，**不需要连接互联网**。
- **为什么会有外网请求的警告？**：在 Puppeteer 的控制台日志中，可能会看到尝试请求 `cdn.jsdelivr.net` 字体失败的跨域报错。这是因为 Carbon 的默认前端模板里硬编码了远程字体文件（如 Hack Font）。如果本机处于离线状态，这些远程字体会加载失败，但浏览器会**自动降级使用本机自带的等宽字体**，这完全不影响本地网页的正常加载、渲染与最终截图。

---

## 附录：完整原始开发与排错对话记录

> 原始标题：课程设计格式 Skill 制作

### 1. 初始阶段提示词与大纲设计
```markdown
这是一个 Skill 的文件夹，你要做的是制作 skill 工具，并且是新建文件夹，然后保存在里面

接下来我希望你分析这个文档
"C:\Users\user\Documents\WXWork\1688856071809634\Cache\File\2026-06\课程设计格式2026---指导教师2026.6.12.doc"
提取格式特点，并重新制定一份模板文件
其中里面的代码换成这个项目的一个截图
配置：没有背景边框，mac，水印user，白色
项目地址：E:\AI\antigravity\stady-code\Supplement\carbon

这个 skill 的功能就是输入一大堆信息，让 AI 进行分析，并根据指定格式把相关内容写进新文档，重新输出一份文档出来。

注意：
用户内容的语言文字不要更改，不要尝试润色，仅作格式上的整理，和整体的归类，要求宁可多加一些信息也不要少了什么信息

你对这个Skill还有什么疑问吗？我们可以探讨一下
```

#### 补充需求与方案确认
```markdown
还是 Skill 每次运行时，把用户材料里的代码实时渲染成 Carbon 风格截图再插入
哦，对了，这里我补充一点，代码不用一次性弄太多，还是分开来弄，啊，这里需要让AI来指导一下哪些应该转换成图片然后贴进去，并且即使是AI也不能一次放太多的，比如不超过30个行吧，因为太长的话，嗯观感不怎么好

代码的话只放图片，替换代码嘛，这样更好看
封面这些让我自由输入，如果我输入不全让AI问我

❓ 4. 类图 / ER 图 / 运行结果截图这些图怎么办？ 用户材料里自带图就插入；没有的话：留「[此处插入 XX 图]」占位文字？还是干脆由 AI 用文字描述代替图？
这里我觉得相对来说比较复杂，留空之后，AI应该告诉我需要什么样的结果图片，然后我去手动的截图，然后告诉AI，AI再填充进去

 5. 用户材料缺章节 / 多章节 怎么处理？ 你说"宁可多加也不要少"——我理解为：
这里我说的可能不全面，像刚才的代码那部分，因为用图片代替了，所以就不需要重复了，懂我意思吧？
另外，如果文档里少了内容，先直接忽略，让整体更加完整，不要留空缺。最后反馈给用户，用户根据这些反馈可能会提供相关内容，也可能不提供。所以这个时候要保证整体是比较完善的，没有缺口或者遗漏。

❓ 6. 输出格式 Skill 输出 .docx（推荐）对吧？模板文件我也用 .docx 存在 Skill 目录里。
ok
```

#### 初版截图尝试

![ZCode.exe_20260622_223606](../assets/ZCode.exe_20260622_223606.png)
*图：初次测试 ZCode 自动代码截图渲染效果*

---

### 2. 多轮排错与 AI 指令纠偏

由于进度太慢并且服务器持续性的卡顿，启动了换 AI 协作的交接计划：
```markdown
现在写一个计划，因为你的 Token 消耗太快，所以我打算让其他 AI 代为你来执行。你现在要做的是详细写下你的进度，用 Markdown 写，然后再写下你的计划，尽可能详细地描述一下，以及验收的一个目标。
```

相关资料：
- **交接计划**：[HANDOFF 进度记录](/ke-she/04-格式skill制作/引用文件/HANDOFF/)
- **AI 脑力日志**：
  - [Skill-AI 执行计划](/ke-she/04-格式skill制作/引用文件/gemini日志/skill初版-计划/)
  - [Skill-AI 工作日志](/ke-she/04-格式skill制作/引用文件/gemini日志/skill初版-工作日志/)

---

#### 核心排错第一轮：修复错误的图片插入

原始指令：
```markdown
输出一个样板文件我看看
```

![有问题的图片插入](../assets/局部截取_20260623_012654.png)
*图：初次输出的 Word 样板，带有多余的边框与异常间距*

此时，AI 的图片插入样板非常糟糕，可能是模块接入的异常情况，亦或者是我表达的不清晰导致的。

---

#### 核心排错第二轮：纠正 AI 绘图幻觉与配置

原始指令：
```markdown
第3轮依然没有修复掉这个bug
```
```markdown
这不对的啊，你看不出区别吗？你跟我说说你是怎么做到这个图片的，我看看哪里的问题
```
```markdown
不要这上面那里的信息  
另外的我要说明，你的做法不是根据脚本来合成一个大图然后截图的  
而是通过AI自己（也就是你）自己先判断哪些代码该拆分开，然后发送拆分开的代码给carbon，返回一个有标志性mac的三个点的图片，粘贴，然后AI判断下一个代码的量，交给carbon。。。
```

针对 AI 的谜之幻觉，使用一段测试代码进行连续截图验证：
```markdown
你先生成这个代码的图片我看看  
const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)

const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

const unfold = (f, seed) => {
const go = (f, seed, acc) => {
const res = f(seed)
return res ? go(f, res[1], acc.concat([res[0]])) : acc
}
return go(f, seed, [])
}  
逐次检验一下
```

![测试代码截图效果](../assets/test_user_code.png)
*图：针对测试代码生成的 Mac 三点风格截图*

针对上图仍然存在的边框，发出排错指令：
```markdown
修复，不要边框，在carbon设置里把这两个拉到最低：padding的vert和horiz
```

![去除边框后的正确效果](../assets/test_user_code%201.png)
*图：完全去除内边距和背景边框后的理想渲染图*

确认正确后更新 Skill 指令：
```markdown
是的非常好，这个图片非常好，现在更新一下skill，让所有的图片都保持这样的风格和设置，放在文档里的就是这个图片，你懂吗？
然后课设重新输出一个样板出来
```

---

#### 核心排错第三轮：环境隔离排查

课设再次输出时依然失败了。我意识到应该是最开始的计划出现了问题，需要排查错误：
```markdown
课设还是不对，完全的不对  
把carbon生成图专门放到一个文件夹里作为一个模块化的文件，表示这个模块我验证了没有问题  
ok？先做这个，写好更新的markdown文档写到这里  
E:\AI\zcode\object\skills\course-design-report\AI-debug
```
AI 输出验证报告后，我追问：
```markdown
carbon模块在哪？
```
此时我才发现，Carbon 在其他的文件夹项目里，并没有过来，并没有保持环境隔离。

发出了环境隔离的强制指令：
```markdown
保持环境隔离，复制过来  
另外说明：这里的图片都是有问题的，并不是carbon的图片  
E:\AI\zcode\object\skills\course-design-report\scratch\extracted_media

补充：
1：这个项目应该可以本地部署的，为什么要试调取网页呢？计划错误还是什么？

2：E:\AI\zcode\object\skills\course-design-report\AI-debug  
每一次你的改动都整理在这里，这里是你的工作日志，方便后续让我查看你做了什么
```

---

### 3. 正式测试与批量处理

以 Java 基础多态教学为主题，进行了新一轮的测试生成，效果开始达标。我安排了整体封装：
```markdown
重新生成一个样板，代码自己生成，主题是java基础多态教学
```
```markdown
好的，现在开始封装整个skill，不用的移动到AI-debug目录下，完善skill，并确保使用精简的文字
```
发现 AI 仍然有偷懒行为（没有更改原始 SKILL.md 模板）：
```markdown
"E:\AI\zcode\object\skills\course-design-report\SKILL.md"  
这里你没有改呀，不要偷懒，再阅读一遍项目
```

相关资料：
- **最终集成的 Skill**：[SKILL.md](/ke-she/04-格式skill制作/引用文件/SKILL/)
- **审计反馈与排错汇总**：[REVIEW.md 评审](/ke-she/04-格式skill制作/引用文件/REVIEW/)
- **测试验证日志**：[VERIFICATION.md 验证](/ke-she/04-格式skill制作/引用文件/VERIFICATION/)

---

#### 批量课设处理测试一 (学生乙)
在新 AI 窗口中测试实际课设数据的全自动整理：
```markdown
"E:\AI\zcode\object\skills\course-design-report\SKILL.md"  
这是你的skill  
我提供的信息是：  
"C:\Users\user\Downloads\课程设计格式2026---指导教师2026.6.12.doc"

"C:\Users\user\Downloads\代码部分.md"  
输出  
C:\Users\user\Downloads\输出课设  

学生乙，20250806XXXX
```
运行中途 AI 查找源码：
```markdown
E:\AI\zcode\object\ke-she\dist\GenshinRPG
源码在这里，以及我给你提供的md里面就是负责的源码部分，不是全部！！！！
```

相关资料：
- **学生乙测试 AI 执行计划**：[课设正式测试-计划](/ke-she/04-格式skill制作/引用文件/gemini日志/课设正式测试-计划/)

紧急纠偏：
```markdown
停！！！源码部分就是这里的"C:\Users\user\Downloads\代码部分.md"
```
（原因为用户自己忘记保存了）

---

#### 批量课设处理测试二 (学生甲)

```markdown
"E:\AI\zcode\object\skills\course-design-report\SKILL.md"  
这是你的skill  
我提供的信息是：  
E:\AI\zcode\object\skills\课设1.md"名字是学生甲，20250806XXXX  
输出  
C:\Users\user\Downloads\输出课设  
```

为防人设雷同和缓存穿透：
```markdown
环境保持隔离啊，加入skill之后把样板移动到AI-debug，并且说明不要让调用skill的AI读这个文件
```

#### 学生甲测试最终执行结果：
1. **输出文件**：`课程设计报告_学生甲_20250806XXXX.docx`（已输出至 `C:\Users\user\Downloads\输出课设\`）。
2. **生成代码截图 (6张)**：
   - 图 2-1 MainFrame 核心声明与字段
   - 图 2-2 MainFrame 构造函数
   - 图 2-3 `initGameData()` 游戏数据初始化
   - 图 2-4 `showPanel()` 面板自动存档切换
   - 图 2-5 登录注销方法
   - 图 2-6 世界等级数值缩放公式
3. **占位补充项**：类图、数据库 ER 图、运行截图占位完成。

![最终课设处理截图](../assets/局部截取_20260623_030214%201.png)
*图：批量生成文档时，无头浏览器 Carbon 渲染生成的代码图片对比*

---

## 相关资料
- **附件与链接索引**：见 [链接整理/链接索引.md](/ke-she/assets/链接索引/)
- **原始备份**：见 [原始备份_课设内容大分级/格式skill制作.md](/ke-she/04-格式skill制作/原始备份_课设内容大分级/格式skill制作/)