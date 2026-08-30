---
title: CTFhub HTTP Writeup
date: 2026-08-28 09:05:00
categories:
  - CTF wp
tags:
  - CTF
  - CTFhub
description: CTFhub HTTP Writeup
---


## CTFHUB-CTF-Web-Web前置技能-HTTP协议

## 一、请求方式

#### 1.打开Burp的代理服务（默认：127.0.0.1:8080)

#### 2.打开所给网站，根据提示，Method应该为CTF**B的形式

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-17 221949.png" style="zoom:25%;" />

#### 3.修改Method为"CTFHUB"

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-17 222739.png" style="zoom: 25%;" />

#### 4.发送（Forward）修改后的请求

#### 5.看Response(响应)，找flag{XXXXX}

#### 6.如果没有找到，根据提示，应在URL为"index.php"的相应里找，所以需要多次进行尝试，一直到找到flag

- #### HTTP/1.1协议定义的8种请求方法：

- GET（直接获取），POST（发送数据），PUT（新增数据记录），DELETE（删除）,HEAD（判断是否存在/获取响应头）,OPTIONS（获取支持的请求方式）,TRACE（修改）,CONNECT（建立与代理服务器的隧道连接）.

## 二、Cookie

#### 1.代理，拦截，请求后，在响应中找到Cookie相关信息admin:=0

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-17 221240.png" style="zoom: 33%;" />

#### 2.将响应中的内容放入“重发器”（Repeater)中，在左侧写上“Cookie： admin=0”，通过“Upgrade-Insecure-Requests: 1”提示得出，应修改admin=1，再次发送（send),得到flag     {可通过看上面的Edited是否是✓，状态码是不是200（成功）}

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-17 224725.png" style="zoom: 25%;" />

- “Upgrade-Insecure-Requests” 是现代浏览器中一个重要的安全机制，通常出现在 HTTP 头部或 HTML 元标签中，其核心作用是将网页中的非安全（HTTP）请求自动升级为安全（HTTPS）请求。

## 三、 302跳转（重定向）

- 3xx（重定向状态码）：302（临时重定向），请求的资源临时移动到新的 URL 。

#### 1.代理，多次请求，拦截，在URL为“index.html”的响应中提示**“<a href="index.php”>"**

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-18 230752.png" style="zoom:25%;" />

- `href`是 HTML 中的一个重要属性，主要用于为`<a>`（超链接）、`<link>`（外部资源链接）等标签指定链接目标

- 1.<a>标签后的href

```html
<!-- 外部URL -->
<a href="https://example.com">访问示例网站</a>

<!-- 相对路径 -->
<a href="about.html">关于我们</a>
<a href="docs/report.pdf">下载PDF文档</a>

<!-- 邮箱链接 -->
<a href="mailto:contact@example.com">发送邮件</a>

<!-- 电话链接 -->
<a href="tel:+123456789">拨打号码</a>

<!-- 页面内锚点 -->
<a href="#section2">跳转到第二部分</a>
```

- 2.`<link>`标签中的`href`

```html
<!-- 引入外部CSS -->
<link href="styles.css" rel="stylesheet">

<!-- 引入字体 -->
<link href="https://fonts.googleapis.com/css2?family=Open+Sans" rel="stylesheet">

<!-- 设置网站图标 -->
<link href="favicon.ico" rel="icon">
```

#### 2.将响应内容放入“重发器”（Repeater)中，将URL（index.html)改为index.php，发送后，可得flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-18 230743.png" style="zoom:25%;" />

- URL：**统一资源定位符**，用于定位网络上的资源，格式为 “协议:// 主机名：端口号 / 路径？查询参数 #片段标识符”，例如 “https://www.example.com/index.html?name=user#section1”。

#### 3.或者直接用 curl 命令访问 index.php 即可得到 flag

######                                                                                                            <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-06-18 231935.png" style="zoom:25%;" />  

- curl使用方法:
- 基本语法：curl [选项] [URL]

1. 发送HTTP请求 要获取某个URL的内容，直接使用`curl [URL]`即可：

   ```bash
   curl https://example.com
   ```

   若想将内容保存到文件，可使用`-o`或`--output`选项： 

   ```bash
   bash curl -o output.html https://example.com
   ```

2. 发送带请求头的HTTP请求 借助`-H`或`--header`选项，能够添加自定义请求头：

   ```bash
    bash curl -H "Content-Type: application/json" https://api.example.com/data 
   ```

3. POST请求 使用`-X POST`指定请求方法，并用`-d`或`--data`传递请求体： 

   ```bash
   bash curl -X POST -d "param1=value1&param2=value2" https://api.example.com/submit
   ```

    若要发送JSON数据，可这样操作： 

   ```bash
   bash curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' https://api.example.com/json
   ```

4. 处理认证 对于需要用户名和密码的基本认证，可使用`-u`或`--user`选项： 

   ```bash
   bash curl -u username:password https://api.example.com/protected
   ```

5. 跟随**重定向** 当遇到HTTP重定向时，使用`-L`或`--location`选项可以让`curl`自动跟随： 

   ```bash
   bash curl -L https://example.com/redirect
   ```

6. 显示响应头信息 使用`-i`或`--include`选项，能够在输出中包含响应头： 

   ```bash
   bash curl -i https://example.com 
   ```

7. 下载文件 若要显示下载进度条，可使用`-#`选项： 

   ```bash
   bash curl -# -o file.zip https://example.com/file.zip
   ```

   若想断点续传已下载的文件，则使用`-C -`选项：

   ```bash
   curl -C - -o file.zip https://example.com/file.zip
   ```

8. 设置超时时间 通过`-m`或`--max-time`选项，可以设置整个请求的最大超时时间（单位为秒）： 

   ```bash
   bash curl -m 10 https://example.com
   ```

9. 代理设置 使用`-x`或`--proxy`选项，能够通过代理服务器发送请求： 

   ```bash
   bash curl -x proxy.example.com:8080 https://example.com
   ```

10. 其他常用选项 - `-s`或`--silent`：静默模式，不显示进度条和错误信息。 - `-k`或`--insecure`：跳过SSL证书验证。 - `-v`或`--verbose`：显示详细的通信过程，便于调试。 这些都是`curl`的常见用法。实际使用时，你可以根据具体需求组合不同的选项。如果想了解更多详细信息，可通过`curl --help`查看帮助文档，或查阅`man curl`获取完整手册。

## 四、基础认证

#### 1.代理，拦截。

- #### 在响应中发现“Do u know admin?”，猜测用户名应该为admin。

- #### 其请求中中，Basic 表示是`基础认证`, 后面的 `YWRtaW46NjUOMzIx==` 用 `base64` 解码后是 `aaa:bbb` 的形式, 也就是我们之前输入的 `账号:密码`，使用 BurpSuite 进行基础认证爆破。

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-07-15 205412.png" style="zoom: 25%;" />

#### 2.将请求发送到Intruder里（如图）：

1. #### 将 Basic 后面 base64 部分添加为 payload position

2. #### 在 Payloads 选项卡下，选择 Payload Type 为 SimpleList, 然后在 Payload Options 中点击 load 加载密码字典

3. #### Payload Processing -> Add-> Add Prefix（添加前缀）-> 输入 `admin:`

4. #### Payload Processing -> Add-> Encode（添加一个编码方式）-> 选择 Base64 Encode

5. #### Payload Encode 取消勾选的 URL-encode, 否则 base64 之后的 = 会被转成 %3d

6. #### 然后按 Start Attack ，然后按 Status 排序，看到状态码出现 200 的，即爆破成功

7. #### 在对应的响应中，找到flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-07-15 205402.png" style="zoom:25%;" />

####                                     <img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-07-15 205226.png" style="zoom:25%;" />

## 五、响应包源代码

- 考点：响应包源代码**查看**

#### 1.代理，拦截。

#### 2.查看响应包，在其中找到flag

<img src="C:\Users\HP\Pictures\Screenshots\屏幕截图 2025-07-15 211343.png" style="zoom:25%;" />
