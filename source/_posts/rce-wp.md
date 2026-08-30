---
title: RCE Writeup
date: 2026-08-28 08:50:00
categories:
  - CTF wp
tags:
  - CTF
  - RCE
description: RCE Writeup
---


根据代码中ping可知，这题应该用ping命令攻击者注入：`127.0.0.1; ls /`（127.0.0.1为本地ip），本题用&链接ls命令，得到一个PHP文件

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 154552.png" style="zoom:25%;" />

试着用cat命令打开php文件，但是打不开，考虑应该是文件中包含特殊字符，使用管道运行base64加密内容，所以用`127.0.0.1 & cat 1374098296700.php | base64`，得到一串编码

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 155026.png" style="zoom:25%;" />

用base64解码得到flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 155052.png" style="zoom:25%;" />

------

## 补充：linux中命令的链接符号

1.每个命令之间用;隔开
说明：各命令的执行给果，不会影响其它命令的执行。换句话说，各个命令都会执行，但不保证每个命令都执行成功。

2.每个命令之间用&&隔开
说明：若前面的命令执行成功，才会去执行后面的命令。这样可以保证所有的命令执行完毕后，执行过程都是成功的。

3.每个命令之间用||隔开
说明：||是或的意思，只有前面的命令执行失败后才去执行下一条命令，直到执行成功一条命令为止。

4.| 是管道符号。管道符号改变标准输入的源或者是标准输出的目的地。

5.& 是后台任务符号。 后台任务符号使shell在后台执行该任务，这样用户就可以立即得到一个提示符并继续其他工作。

------

## 补充：Linux 基础命令

1. **文件和目录操作命令**

- **ls**：列出目录内容，如 “ls -l” 以长格式显示文件和目录信息。

- **cd**：切换目录，“cd /home” 切换到 home 目录，“cd..” 返回上一级目录。

- **mkdir**：创建目录，“mkdir test” 创建名为 test 的目录。

- **rmdir**：删除空目录，“rmdir test” 删除 test 目录（目录必须为空）。

- **rm**：删除文件或目录，“rm -r test” 递归删除 test 目录及其内容。

- **cp**：复制文件或目录，“cp file1.txt file2.txt” 复制 file1.txt 为 file2.txt。

- **mv**：移动或重命名文件或目录，“mv file1.txt dir1/” 将 file1.txt 移动到 dir1 目录，“mv file1.txt file3.txt” 重命名 file1.txt 为 file3.txt。

  

  2.**文件内容查看命令**

- **cat**：查看文件内容，“cat file.txt” 显示 file.txt 的全部内容。

- **more**：分页显示文件内容，按空格键向下翻页。

- **less**：功能与 more 类似，但支持向前翻页（按 b 键）等更多操作。

3.**系统信息查看命令**

- **uname**：显示系统信息，“uname -a” 显示详细的系统信息。
- **top**：实时显示系统中各个进程的资源占用情况。
- **df**：查看磁盘空间使用情况。
- **free**：查看系统内存使用情况。

4.**用户和权限管理命令**

- **useradd**：添加用户，“useradd newuser” 添加名为 newuser 的用户。
- **passwd**：设置或修改用户密码，“passwd newuser” 修改 newuser 的密码。
- **chmod**：修改文件或目录权限，“chmod 777 file.txt” 赋予文件所有者、所属组和其他用户读、写、执行权限。

------

# 过滤cat

先127.0.0.1&ls打开目录，发现flag相关php文件，因为代码中有cat过滤，所以不能用cat查看文件内容，就要使用more或less命令

```php
if (!preg_match_all("/cat/", $ip, $m)) {
$cmd = "ping -c 4 {$ip}";
exec($cmd, $res);  }
```

与上题类似，用管道运行base64打开文件，再用base64解码

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 160736.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 161334.png" style="zoom:25%;" />

得到flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 161403.png" style="zoom:25%;" />

------

## 补充：linux查看文本的命令

cat 由第一行开始显示内容，并将所有内容输出
tac 从最后一行倒序显示内容，并将所有内容输出
more 根据窗口大小，一页一页的现实文件内容
less 和more类似，但其优点可以往前翻页，而且进行可以搜索字符
head 只显示头几行
tail 只显示最后几行
nl 类似于cat -n，显示时输出行号
tailf 类似于tail -f

------

# 过滤空格

根据代码，本题需要过滤空格，用<或/**/代替空格，本题用<

注入`127.0.0.1|cat<flag_247993140417425.php|base64`，其他操作同上题

------

## 补充：空格过滤常用替代符号：

1. **`${IFS}`**
   这是 Linux 系统中环境变量`IFS`（Internal Field Separator，内部字段分隔符）的引用，默认包含空格、制表符、换行符等，常用于替代**空格**。例如：
   `cat${IFS}/etc/passwd`（等效于`cat /etc/passwd`）。
   若`${IFS}`被过滤，可尝试拼接或变形，如`${IFS%??}`（利用参数扩展截断，保留空格部分）。
2. **`$IFS`**
   直接使用环境变量`IFS`，但通常需要配合**命令分隔符**，例如：
   `cat$IFS/etc/passwd`。
3. **制表符（`\t`）**
   在 URL 编码中为`%09`，在命令行中可直接作为**分隔符**，例如：
   `cat%09/etc/passwd`（URL 提交时）或`cat\t/etc/passwd`（部分环境支持）。
4. **换行符（`\n`）**
   URL 编码为`%0a`，部分场景下可作为**分隔符**，例如：
   `cat%0a/etc/passwd`。
5. **反斜杠（`\`）**
   在部分 shell 中，反斜杠可转义空格，实际等效于空格，例如：
   `cat\/etc/passwd`（注意这里是反斜杠 + 空格的组合，实际执行时反斜杠被忽略，等同于`cat /etc/passwd`）
6. **其他特殊字符**
   如`$IFS$9`（`$9`是当前 shell 的第九个参数，通常为空，用于混淆过滤），例如：
   `cat$IFS$9/etc/passwd`。
7. **`<` 或 `>`**：重定向符号可分隔命令，如`cat</etc/passwd`
8. **`{}`**：部分 shell 支持，如`cat{/etc/passwd}`（需紧跟路径）
9. **`%20`**：URL 编码空格（基础但可能被过滤）
10. **多变量拼接**：如`a=ls;$a`（用变量间接执行，避免空格）
11. **括号**：`(ls)`（部分环境中括号内命令可执行，无需空格）

------

# 过滤目录分隔符

根据代码不能使用/。用ls打开目录，发现一个子目录flag_is_here

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 164423.png" style="zoom:25%;" />

打开这个子目录，需要`cd/flag_is_here`命令，而这道题不能用/，所以考虑可以用`127.0.0.1;cd flag_is_here;ls`,来代替这个命令，cd 进入flag_is_here目录，ls 显示flag_is_here目录里的内容。（意思可以理解为，`；`隔开命令不会影响其它命令的执行，换句话说，各个命令都会执行，所以`127.0.0.1;cd flag_is_here;ls`这个可以cd和ls命令同时执行，同时打开目录和子目录）

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 164545.png" style="zoom:25%;" />

打开子目录，发现php文件，继续用cat打开php文件，`127.0.0.1;cd flag_is_here;cat flag_22401669824094.php|base64`

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 164823.png" style="zoom:25%;" />

得到编码，base64解码得到flag

------

# 过滤运算符

根据代码，要过滤一下运算符，所以用`；ls`打开目录，在用cat打开文件，可以再接查看源代码，找到flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 170246.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 170451.png" style="zoom:25%;" />

------

# 综合过滤练习

- 在本题目中我们会用到：

  　 `%0a` 代替 `换行` ， `%09` 代替 TAB键 （因为flag被过滤了，所以我们通过TAB来补全flag_is_here）

    `%5c` 代替 `\`（用 \ 来分隔开 cat ，因为 cat 也被过滤了）

根据代码，本题过滤的字符很多，所以考虑用URL编码来字符绕过，查URL表，发现%0a表示换行，可以代替；连接ls命令，所以注入127.0.0.1%0als，但是运用了URL编码，需要在URL或在hackbar中注入

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 174449.png" style="zoom:25%;" />

出现子目录，但是flag被过滤了，所以要用到TAB补全（用%09*代替flag），得到php文件

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 180919.png" style="zoom:25%;" />

将ls换成cd,为了打开子目录，cat打开php文件，但是cat被过滤了，所以可以用%5c隔开cat，并且PHP文件中的flag也要用%09*代替

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 180801.png" style="zoom:25%;" />

打开文件，在源码中找到flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 180754.png" style="zoom:25%;" />

------

编码大全和在线解码工具：[CTF常见编码（超全） | 若狸'Blog](https://ruoli-s.github.io/posts/a36c.html#toc-heading-16)

URL速查表：![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-07 184730.png)

URL编码相关题：[CTF——URL编码问题 - 灰信网（软件开发博客聚合）](https://www.freesion.com/article/93141004932/)闲着没事看看

------

# [SWPUCTF 2021 新生赛]babyrce

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-25 093600.png)

PHP代码解读，要求cookie值为：admin=1，所以bp抓包，改cookie值

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-25 094433.png)

得到一个PHP文件，访问一下，又得到PHP代码

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-25 094501.png)

代码意思要传参url，并且不能有空格，所以是空格绕过题`?url=ls${IFS}/`获取文件目录（其中${IFS}是用来代替空格），得到flag相关目录

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-25 095148.png)

再cat获取文件内容`cat${IFS}`，得到flag

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-25 095240.png)

