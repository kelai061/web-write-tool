// ============================================================
//   新建文章脚本 —— 像写记事本一样写网站文章
// ------------------------------------------------------------
//   双击「新建文章.bat」运行（会弹输入框问标题）
//   或命令行：node new-post.cjs "标题" [类目名]
//   它会：建好 .md 文件 + 填好开头 + 用记事本打开
//   你打字、Ctrl+S 保存，浏览器（开着的话）自动刷新
// ============================================================
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

const DOCS = path.join(__dirname, 'src', 'content', 'docs');

// 时间戳做文件名，URL 干净
function timestampName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) + '-' +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

function makePost(title, folder, openEditor) {
  const dir = folder ? path.join(DOCS, folder) : DOCS;
  fs.mkdirSync(dir, { recursive: true });

  const filepath = path.join(dir, timestampName() + '.md');
  const content =
    '---\n' +
    `title: ${title}\n` +
    '---\n\n' +
    `# ${title}\n\n` +
    '从这里开始写。直接打字就行，空一行就是新段落。\n';

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('\n✓ 已创建：' + filepath);
  if (openEditor) {
    console.log('正在用记事本打开，写完按 Ctrl+S 保存即可。\n');
    // detached + 不等待，让脚本立刻退出，不卡住
    const child = exec(`notepad "${filepath}"`);
    child.unref();
  }
}

// === 入口 ===
// 默认建到 posts/ —— 这是侧边栏"文章"分组对应的文件夹
// 想换类目：node new-post.cjs "标题" guide   （或 getting-started）
const args = process.argv.slice(2);
if (args.length >= 1) {
  makePost(args[0], args[1] || 'posts', false);
  process.exit(0);
} else {
  try {
    const ps = `powershell -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('请输入文章标题（中文也行）：', '新建文章', '我的新文章')"`;
    const out = execSync(ps, { encoding: 'utf8' }).trim();
    if (out) {
      makePost(out, 'posts', true);
    } else {
      console.log('\n未输入标题，已取消。');
    }
  } catch (e) {
    console.log('\n已取消。');
  }
  process.exit(0);
}
