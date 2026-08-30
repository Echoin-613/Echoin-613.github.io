---
title: 代码审计 PHP
date: 2026-08-30 14:40:00
categories:
  - Web安全
tags:
  - 代码审计
  - PHP
description: 代码审计 PHP
---


## 常见函数：

isset($page):检查是否存在$page参数

is_string($page)：检查传入的$page参数是否为字符串类型

in_array($page, $whitelist)：检查是否在$whitelist中找到传入的 $page

mb_substr：截取

```php
基本用法：
mb_substr ( string $str , int $start [, int $length = NULL [, string $encoding = mb_internal_encoding() ]] ) : string

$str：要截取的原字符串
$start：起始位置（0 为首字符，负数表示从末尾开始）
$length(可选)：截取长度，省略则直到末尾
$encoding(可选)：字符编码，默认使用内部编码
    
常见场景示例:
1.截取固定长度的中文字符串
<?php
$title = "奇葩天地：http://www.qipa250.com";
echo mb_substr($title, 0, 4, 'UTF-8'); // 输出：奇葩天地
?>

2.获取最后一个中文字符
<?php
$str = "奇葩天地";
echo mb_substr($str, -1, 1, 'UTF-8'); // 输出：地
?>

注意事项:
若 $start 为负且 $length 小于或等于 $start，则返回空字符串。
未指定 $encoding 时，会使用mb_internal_encoding()的值，可通过mb_internal_encoding('UTF-8')设置。
对英文同样适用，但主要优势在于处理多字节字符集时不会截断半个字符导致乱码。
```

mb_strpos :用于在多字节字符串中查找某个子字符串首次出现的位置

```php
基本用法：
mb_strpos(string $haystack, string $needle, int $offset = 0, ?string $encoding = null): int|false

$haystack: 要搜索的目标字符串。
$needle: 要查找的子字符串。
$offset (可选): 搜索的起始位置，默认为 0。
$encoding (可选): 指定字符编码。如果未指定，将使用内部字符编码。

返回值：
如果找到 $needle，返回其在 $haystack 中首次出现的位置（从 0 开始）。
如果未找到，返回 false。
```

$REQUEST：是一个超全局数组，它包含了 `$_GET`、`$_POST` 和 `$_COOKIE` 数据的合并