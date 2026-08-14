---
title: CTF Writeup 写作模板
date: 2026-08-14 11:00:00
categories:
  - CTF
tags:
  - CTF
  - Writeup
  - 模板
description: 一篇标准的 CTF Writeup 应该怎么写——附模板与示例
---

> 这是一篇示例文章，展示 Writeup 的推荐写法。写完自己的 Writeup 后可以删除本文。

## 一、题目信息

| 项目 | 内容 |
| --- | --- |
| 赛事 | 某某 CTF 2026 |
| 题目 | 题目名称 |
| 类型 | Web / Pwn / Crypto / Misc / Reverse |
| 分值 | 500 |
| 难度 | ⭐⭐⭐ |

## 二、题目描述

把题目描述和附件下载链接贴在这里。

## 三、解题过程

### 3.1 信息收集

打开题目，观察页面，抓包分析：

```bash
curl -s http://target.com/ | head -20
```

### 3.2 漏洞分析

发现漏洞点，说明原理：

```python
import requests

r = requests.get('http://target.com/flag.php')
print(r.text)
```

### 3.3 漏洞利用

给出完整的利用脚本（POC / EXP）：

```bash
python3 exp.py
```

> 注意：关键 payload 记得用代码块包裹，方便读者复制。

## 四、获取 Flag

```text
flag{this_is_an_example_flag}
```

## 五、总结

- 考察的知识点
- 踩过的坑
- 相关参考链接
