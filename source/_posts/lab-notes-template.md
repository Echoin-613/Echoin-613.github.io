---
title: 靶场笔记写作模板
date: 2026-08-14 12:00:00
categories:
  - 靶场
tags:
  - 靶场
  - 模板
description: 靶场通关笔记的推荐写法与示例
---

> 这是一篇示例文章，展示靶场笔记的推荐写法。

## 靶场信息

| 项目 | 内容 |
| --- | --- |
| 靶场名称 | DVWA / sqli-labs / upload-labs / Vulnhub / HTB |
| 目标地址 | http://xxx |
| 难度 | 低 / 中 / 高 |
| 授权范围 | 本地练习 / 官方授权 |

## 环境搭建

```bash
docker run -d -p 80:80 vulnerables/web-dvwa
```

## 漏洞点分析

描述漏洞成因与触发条件。

## 利用过程

### 步骤一：xxx

```bash
sqlmap -u "http://target/?id=1" --dbs
```

### 步骤二：xxx

插入截图（图片放在与文章同名的资源文件夹中）：

```markdown
{% asset_img 1.png 截图描述 %}
```

## 防御与修复

- 过滤输入
- 使用参数化查询
- 最小权限原则
