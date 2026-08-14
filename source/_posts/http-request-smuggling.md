---
title: HTTP 请求走私
date: 2026-08-14 14:30:00
categories:
  - Web安全
tags:
  - HTTP请求走私
description: HTTP请求走私漏洞原理、类型与利用方式
---
**HTTP请求走私**是一种攻击技术，利用前端和后端服务器对HTTP请求的解析差异，将恶意请求夹带在合法请求中，从而绕过安全控制，访问敏感数据或攻击其他用户。

#### 漏洞原理：
HTTP请求走私漏洞的产生主要是因为HTTP规范提供了两种不同的方法来指定请求的结束位置：**Content-Length**头和**Transfer-Encoding**头。前端和后端服务器可能对这两种头的处理方式不同，从而导致请求边界的不同步。

Content-Length头

```plain
POST /search HTTP/1.1
Host: normal-website.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 11

q=smuggling
```

Transfer-Encoding头

```plain
POST /search HTTP/1.1
Host: normal-website.com
Content-Type: application/x-www-form-urlencoded
Transfer-Encoding: chunked

b
q=smuggling
0
```

**常见的HTTP请求走私类型**

1. **CL-TE漏洞**：前端服务器使用Content-Length头，而后端服务器使用Transfer-Encoding头。
2. **TE-CL漏洞**：前端服务器使用Transfer-Encoding头，而后端服务器使用Content-Length头。
3. **TE-TE漏洞**：前端和后端服务器都使用Transfer-Encoding头，但可以通过混淆头来诱导其中一台服务器不处理它。

#### 入口点:
HTTP请求走私的攻击入口主要存在于**前端代理服务器与后端应用服务器之间的连接链路**上，常见的入口场景包括：

##### 1. 反向代理 / 负载均衡器
+ Nginx、Apache、HAProxy、F5、Cloudflare 等反向代理或负载均衡设备与后端 Tomcat、Jetty、Node.js 等应用服务器之间
+ 代理层负责连接复用（keep-alive），将多个前端请求复用到同一条后端 TCP 连接上

##### 2. CDN / WAF 后端
+ CDN 节点与源站服务器之间
+ WAF（Web应用防火墙）仅检查前端可见的请求部分，走私的恶意请求被后端单独解析从而绕过 WAF 检测

##### 3. 支持 HTTP 管道化 / 连接复用的网关
+ API 网关、微服务网关（如 Kong、Zuul、Spring Cloud Gateway）
+ 任何将多个 HTTP 请求复用到同一后端 TCP 连接的中间件

##### 4. 常见可利用的页面/接口
+ 登录接口、用户认证页面（可走私出其他用户的会话）
+ 搜索、评论等反射型输入点（可配合 XSS 扩大危害）
+ 静态资源缓存节点（可实施缓存投毒）

---

#### 利用思路:
基本原理回顾

攻击者构造一个包含**两个请求边界**的特制请求：前端服务器按一种方式解析（认为是一个请求），后端服务器按另一种方式解析（认为是两个请求），从而将第二个"隐藏请求"走私到后端。

##### 三类漏洞的利用方式
###### CL-TE 漏洞（前端用CL，后端用TE）
+ **思路**：前端根据 `Content-Length` 认为请求已结束，将完整请求转发给后端；后端按 `Transfer-Encoding: chunked` 解析，第一个 chunk 结束后，剩余内容被当作**下一个独立请求**处理
+ **利用**：在请求体中嵌入第二个请求，后端会单独处理该走私请求

```plain
POST / HTTP/1.1
Host: target.com
Content-Length: 50
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
Host: target.com
X: 
```

###### TE-CL 漏洞（前端用TE，后端用CL）
+ **思路**：前端按 chunked 解析，读到 `0\r\n\r\n` 认为请求结束；后端根据 `Content-Length` 判断请求长度，超出部分被拼接到**下一个用户的请求**前面
+ **利用**：走私的请求前缀会污染下一个请求，影响其他用户

```plain
POST / HTTP/1.1
Host: target.com
Content-Length: 4
Transfer-Encoding: chunked

5c
GET /admin HTTP/1.1
Host: target.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0
```

###### TE-TE 漏洞（两端都用TE，但可混淆）
+ **思路**：前后端都支持 chunked，但通过**混淆 Transfer-Encoding 头**（如加空格、大小写变体、重复头、前缀后缀），让其中一台服务器不识别该头，转而使用 Content-Length 或忽略
+ **常见混淆手法**：
    - `Transfer-Encoding: xchunked`（加前缀）
    - `Transfer-Encoding : chunked`（冒号后多空格）
    - `Transfer-Encoding: chunked, identity`（多值）
    - 重复的 Transfer-Encoding 头
    - 大小写变体：`transfer-encoding`、`TRANSFER-ENCODING`

##### 进阶利用场景
| 利用场景 | 说明 |
| --- | --- |
| **绕过访问控制** | 走私请求直接访问被前端/WAF拦截的路径（如 /admin） |
| **缓存投毒** | 将恶意响应写入缓存，影响所有访问该缓存的用户 |
| **会话劫持** | 通过走私请求窃取其他用户的请求头中的 Cookie / Token |
| **XSS 升级** | 将反射型 XSS 转化为存储型/扩散型危害 |
| **凭据窃取** | 走私请求诱导后端将下一个用户的请求内容返回给攻击者 |


---

#### 代码特点
##### 1. 同时存在两种长度标识
请求中**同时出现** `Content-Length` 和 `Transfer-Encoding` 头，且两端服务器对优先级处理不一致：

+ 有的服务器优先使用 Content-Length
+ 有的服务器优先使用 Transfer-Encoding
+ 有的服务器在两者共存时报错，有的则静默选择其中一个

##### 2. Transfer-Encoding 解析不严格
后端代码对 Transfer-Encoding 头的解析存在**宽松匹配**问题：

```java
// 不安全的解析示例：未严格校验头格式
if (header.contains("chunked")) {
    useChunked = true;
}
// 应使用严格的 equals 或规范化后比较
```

##### 3. 前后端使用不同的 HTTP 解析库
+ 前端用 Nginx（C 语言解析），后端用 Tomcat（Java 解析）
+ 不同语言、不同库对 HTTP 规范的实现细节存在差异
+ 特别是对**模糊边界情况**（重复头、空格、大小写）的处理不一致

##### 4. 代理层未正确规范化请求头
+ 代理服务器在转发请求前，没有**移除或规范化**歧义的请求头
+ 安全的代理应在检测到 CL + TE 共存时，优先以 TE 为准并移除 CL，或直接拒绝请求

##### 5. Chunked 编码边界处理缺陷
+ 对 chunk size 的解析不严格（允许前导零、空白字符）
+ 对最后一个 chunk（`0\r\n\r\n`）的尾部处理不完善
+ chunk 扩展字段（chunk extensions）处理逻辑存在漏洞
