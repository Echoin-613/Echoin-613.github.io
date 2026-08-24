---
title: PHP 反序列化学习
date: 2026-08-24 11:00:00
categories:
  - Web安全
tags:
  - PHP
  - 反序列化
description: PHP 反序列化学习
---


## 1.什么是序列化和反序列化

序列化是将对象转换为字符串以便存储传输的一种方式。而反序列化恰好就是序列化的逆过程,反序列化会将字符串转换为对象供程序使用。在PHP中序列化和反序列化对应的函数分别为serialize()和unserialize()。

## 2.什么是反序列化漏洞

当程序在进行反序列化时，会自动调用一些函数，例如__wakeup(),__destruct()等函数，但是如果传入函数的参数可以被用户控制的话，用户可以输入一些恶意代码到函数中，从而导致反序列化漏洞。

## 3.序列化函数（serialize）



当我们在php中创建了一个对象后，可以通过serialize()把这个对象转变成一个字符串，用于保存对象的值方便之后的传递与使用

例如

![image-20250408185312347](https://s2.loli.net/2025/05/11/hvPzNTeWZrR4ixS.png)

查看结果

![img](https://s2.loli.net/2025/04/08/hyNr3UtCMQg7fsY.png)

![image-20250410194750774](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410194750869.png)

## 4反序列化(unserialize)

 unserialize()可以从序列化后的结果中恢复对象（object）为了使用这个对象，在下列代码中用unserialize重建对象.

测试代码：

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250413184156400.png" alt="image-20250413184156289" style="zoom:33%;" />

查看结果

![img](https://gitee.com/crx12345/my-image-host/raw/master/images/20250408185932691.png)

![image-20250410194700011](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410194700159.png)

## 5.什么是PHP魔术方法

魔术方法是PHP面向对象中特有的特性。它们在特定的情况下被触发，都是以双下划线开头，利用魔术方法可以轻松实现PHP面向对象中重载（Overloading即动态创建类属性和方法）。 问题就出现在重载过程中，执行了相关代码

## 6.一些常见的魔术方法

![image-20250408190155326](https://gitee.com/crx12345/my-image-host/raw/master/images/20250408190155443.png)

wakeup() //执行unserialize()时，先会调用这个函数
sleep() //执行serialize()时，先会调用这个函数
destruct() //对象被销毁时触发
call() //在对象上下文中调用不可访问的方法时触发
callStatic() //在静态上下文中调用不可访问的方法时触发
get() //用于从不可访问的属性读取数据或者不存在这个键都会调用此方法
set() //用于将数据写入不可访问的属性
isset() //在不可访问的属性上调用isset()或empty()触发
unset() //在不可访问的属性上使用unset()时触发
toString() //把类当作字符串使用时触发
__invoke() //当尝试将对象调用为函数时触发

## 7.魔术方法的利用

测试代码：

![image-20250408190515538](https://gitee.com/crx12345/my-image-host/raw/master/images/20250408190515727.png)

测试结果为

![img](https://gitee.com/crx12345/my-image-host/raw/master/images/20250408190550343.png)

## 8.绕过部分正则

**preg_match('/^O:\d+/')匹配序列化字符串是否是对象字符串开头**,这在曾经的CTF中也出过类似的考点

利用加号绕过（注意在url里传参时+要编码为%2B）
serialize(array(a ) ) ; 

a为要反序列化的对象(序列化结果开头是a，不影响作为数组元素的$a的析构)


![](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410210122611.png)

![image-20250410210625335](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410210625547.png)

# php反序列化演示

### 1类

#### 类的演示

![image-20250410221255069](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410221255244.png)

![image-20250410221321983](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410221322072.png)

#### 类的实例化

![image-20250410222152809](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410222152940.png)

![image-20250410222210954](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410222211133.png)

![image-20250410222702101](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410222702154.png)

#### 类的修饰符介绍

![image-20250410222403737](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410222404101.png)

![image-20250410222537997](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410222538293.png)

![image-20250410222844592](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410222844789.png)

protected和private外部都不可用所以无法输出

![image-20250410223108043](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410223108294.png)

由于sex属性为private所以在子类内部不可用

### 2序列化基础知识

#### 1.序列化的作用

将对象或者数组转化为储存/传输的字符串

#### 2.序列化的演示

![](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410223939469.png)

以上是针对不同数据类型，进行了序列化演示

![image-20250410224249695](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410224250000.png)

当定义为一个**数组**时，序列化的内容相对复杂

![image-20250410224527573](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410224527632.png)

下面进行对象的序列化

![image-20250410224827638](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410224827919.png)

对象只包含成员属性，不包含成员方法

当修饰符变为私有属性时，在变量名前会加%00和类名

![image-20250410225409501](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410225409608.png)

为了表示私有属性，在类名前后会加上00字段

![image-20250410225932264](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410225932431.png)

当解释符变为受保护的为，前面就会加上一个*号

![image-20250410230126920](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410230127013.png)

![image-20250410230202842](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410230203044.png)

长度为6是因为在*号前后也会加上00

成员属性调用对象

![image-20250410230516139](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410230516255.png)

我们发现时把后面的一个对象赋值给一个成员属性（ben），这样在序列化test2时也会把test包含进去，

![image-20250410230809327](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410230809734.png)

### 3反序列化知识

#### 1.反序列化的作用

将序列化的参数还原成实例化的对象

#### 2.反序列化的演示

![image-20250410231604458](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410231604583.png)

首先，先把test这一类实例成一个对象（d）并对该对象进行序列化

在进行序列化之前先看看$d里面是什么

![image-20250410232136271](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410232136498.png)

可以看到注释符不一样，它的输出也不一样

![image-20250410232623162](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410232624093.png)

**反序列化之后的内容为一个对象**

还有一个重要的点就是，**反序列化后生成的对象的值，由反序列化里的值$d决定，与原有类预定义的值无关（test）**

**反序列化不改变类的成员方法，需要调用后才能触发**，当我调用displayvar时，test这个类必须存在，且调用后里面的值只由$d决定跟test无关

### 4反序列化漏洞利用例题

![image-20250410233900167](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410233900274.png)

输入一个benben的字符串，赋值给get，将get值进行反序列化，通过调用方法来执行代码，如果我们要执行命令，就必须要改动$a里的值

先简单构造payload，假设我们要改动a里的值为 ：$a=‘system("id")’；

则：‘o:4:"test":1:{s:1:"a";s:13:"system("id");";}'

![image-20250410235919422](https://gitee.com/crx12345/my-image-host/raw/master/images/20250410235919930.png)

### 5魔术方法构造和析构

#### 1魔术方法简介

##### 什么是魔术方法

一个预定好的，在特定情况下自动触发的行为方法

##### 魔术方法的作用

![image-20250411000629713](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411000630220.png)

![image-20250411000742973](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411000743531.png)

##### _construct()函数

![image-20250411001230778](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411001230887.png)

实例化一个对象的时候，会触发一个construct

![image-20250411001433055](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411001433540.png)

##### _destruct函数

析构函数，在对象所有引用被删除或者当对象被显示销毁式执行的魔术方法



![image-20250411001842778](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411001842935.png)

在代码执行反序列化时覆盖原有的test，触发了一次，最后文件结束销毁了再触发一次

相当于序列化把代码按格式编码了，反序列化相当于又解码，解码后自动识别php代码，再次触发

![image-20250411002759977](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411002800883.png)

##### sleep和wakeup介绍

sleep

![image-20250411003153436](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411003154516.png)

![image-20250411003408771](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411003408950.png)

发现结果并没有输出password，说明sleep函数被触发了，整体流程为，先定义了new user，导致触发了construct函数，接着要序列化user，这时sleep函数被自动触发，不输出password

weakup函数

![image-20250411004351381](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411004351627.png)

该代码说明，在对该属性进行反序列化之前会触发weakup函数，password和username都会被执行，接着反序列unserialize执行再输出nickname，但我们发现password并没有赋值，所以这时候回显的时user里那两个私有注释的值

##### toString和invoke函数

###### tostring函数：

表达方式错误时调用该魔术方法

![image-20250411170632382](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411170639583.png)

可以看到输出test，可是test是个对象，并不是字符串，这样导致格式错误，触发toString函数

###### invoke函数

是把对象当成了一个函数从而触发

![image-20250411170941018](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411170941172.png)

这里的test()，说明把对象当成了函数进行调用

#### 错误调用相关魔术方法

##### _call()函数

![image-20250411171548019](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411171548278.png)

##### _callstatic函数

![image-20250411171917784](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411171918138.png)

![](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411172046809.png)

可以看出在静态调用或调用成员常量时，触发，跟上一个函数差不多，就是要加：：

##### _get()函数

![image-20250411172321592](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411172321829.png)

##### _set()函数

![image-20250411172614752](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411172614915.png)

该代码说明当给一个不存在的成员属性赋值时，就会触发_set函数

给var2赋值但发现不存在该属性，那么就会触发函数，将arg1赋为var2，将arg2赋值为1，输出它们俩

##### _isset函数

![image-20250411173151836](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411173152072.png)

当对不可访问属性使用isset或empty函数时，会触发_isset函数。

改代码说明：var这个属性，是私有的，只能在子内部调用，isset是在外部访问，这是不可能的，由此函数触发

##### _unset函数

![image-20250411173819183](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411173819440.png)

举例说明

![image-20250411173952587](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411173952694.png)

var这个成员属性是私有的，按理来说不可访问，但使用unset函数，导致魔术方法触发

将var赋值给了arg1

##### _clone函数

![image-20250411174250457](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411174250702.png)

当拷贝完成一个对象后，会触发_clone魔术方法

##### 总结

![image-20250411174404838](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411174405133.png)

![image-20250411174424656](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411174425024.png)

### 6.pop链前置知识

##### 了解调用链

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250411174829097.png" alt="image-20250411174828973" style="zoom:50%;" />

先看这道简单的例题

1. 先找到利用点，也就是我们的eval
2. eval()调用的是test2这个成员方法，但是action这函数并不会凭空执行
3. 我们发现destruct这个魔术方法下有我们的action，而这个魔术方法，是通过调用test来实现的

利用反推法实现

![image-20250411175919802](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411175920148.png)

当实行反序列化函数时，会触发destruct方法，给test赋值成evil就可执行底下这个action这个函数。前面也学到过当执行序列化和反序列化时_construct这个魔术方法不会触发，所以不必理会。

则我们的payload可以是，test2=system("ls");,test=new evil();

第一种方法，在原来的类里面进行构造

![image-20250411185957320](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411185957443.png)

第二种

![image-20250411202247870](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411202248001.png)

##### 魔术方法触发规则

![image-20250411202517449](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411202517719.png)

魔术方法触发的前提是：魔术方法所在类(或对象)被调用

![image-20250411203458992](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411203459319.png)

![image-20250411203644695](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411203644809.png)

##### pop链构造解释

![image-20250411204526739](https://gitee.com/crx12345/my-image-host/raw/master/images/20250411204526834.png)



<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250411204442219.png" alt="image-20250411204442157" style="zoom:33%;" />

首先分析这个题目，flag在flag.php中

1. 目标：触发echo，调用$flag
2. 触发_invoke调用append函数，使$var=flag.php
3. _invoke触发的条件是把对象当作函数执行
4. 给p赋值一个对象Modifier，从而当成函数调用
5. 触发get(触发条件：调用不存在的成员属性)
6. 给str赋值一个对象test，test里面吗没有source，触发_get函数
7. 触发tostring魔术方法(把对象当作字符串)
8. 给source这个赋值为对象show，从而触发tostring
9. 触发wakeup，反序列化



![image-20250412182306424](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412182307149.png)

具体构造如下

![image-20250412184718518](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412184718902.png)

O:4:"Show":2:{s:6:"source";r:1;s:3:"str";O:4:"Test":1:{s:1:"p";O:8:"Modifier":1:{s:13:"Modifiervar";s:8:"flag.php";}}} 

要注意的var是一个私有属性，记得加上%00

构造payload

?pop=O:4:"Show":2:{s:6:"source";r:1;s:3:"str";O:4:"Test":1:{s:1:"p";O:8:"Modifier":1:{s:13:"%00Modifier%00var";s:8:"flag.php";}}} 

结果如下

![image-20250412185254700](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412185254864.png)

### 7字符串逃逸基础

##### 字符串逃逸基础_减少

![image-20250412185939282](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412185939417.png)

![image-20250412193533682](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412193533968.png)

简单看一段代码

![image-20250412194114011](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412194114395.png)

执行str_replace函数后，system()就会被吃掉，造成字符串逃逸减少，字符串缺失，识别的11位就到了v，显然反序列化data是不能执行的

可以通过构造，将功能代码全部吃掉，只执行后面的123，此时的字符串就会当作功能代码执行

##### 字符串逃逸基础_增多

![image-20250412195604556](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412195604762.png)

简单来说就是，将字符串变成功能代码执行

##### 字符串逃逸增多例题

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250412200833205.png" alt="image-20250412200833064" style="zoom:50%;" />

分析代码

1. 判断是否为escaping，如果是则输出flag.php
2. 通过get注入param，并将其实例化test成为一个对象，并进其序列化，触发_construct这个魔术方法赋值给user
3. 对$param值进行安全检查，filter把"flag" "php"替换为了"hack",在进行反序列化，将多余的字符串变成有效代码执行

解题思路

1. 字符串是增多了，由php变成hack

2. 构造代码，先将pass值变为escaping

   ![image-20250412204754336](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412204754538.png)

3. $user的值是可控的

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250412210744591.jpg" alt="img" style="zoom: 33%;" />

3. 构造payload

   ![image-20250412212346912](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412212347021.png)

?param=phpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphpphp";s:4:"pass";s:8:"escaping";}

右键查看源代码

![image-20250412212459878](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412212500016.png)

##### 字符串逃逸减少例题

![image-20250412212649255](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412212649376.png)

分析代码

1. 判断vip是否为true，如果是则输出flag.php
2. 我们只能通过user和pass来解决这个问题，然后user和pass会被实例化成一个对象并进行序列化，接着跳到过滤并进行反序列化
3. 这里是把php替换成了hk

解题步骤

1. 先对user和pass进行简单赋值并序列化

![image-20250412213920186](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412213920449.png)

接着我们开始分析

![image-20250412223640799](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412223641034.png)

### 8wakeup魔术方法绕过

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250412223944351.png" alt="image-20250412223944229" style="zoom:33%;" />

如果$cmd为空则显示源代码，不为空，进行正则表达，o后面不能出现数字

目标是反序列化后调用destruct,并将file定义成flag.php输出

必须要绕过wakeup方法不然file又会变成index.php

解题：

把成员属性数量值写成2，即可绕过

o后面不能跟数字，所以后面可以跟个+号

![image-20250412225418318](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412225418403.png)

先构造我们的payload

![image-20250412230503196](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412230503344.png)

### 9引用的利用方式

类似于c语言的指针

![image-20250412231115492](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412231115883.png)

我们进行实例化对象并赋值给a

![image-20250412231637481](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412231637611.png)

可以看到enter为空，secret的值等于enter的值

构造payload

?pass=O:8:"just4fun":2:{s:5:"enter";N;s:6:"secret";R:2;}

![image-20250412232012640](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412232012800.png)

注意：&加上一个$就是引用

### 10session反序列化漏洞介绍

![image-20250412234422317](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412234430676.png)

php格式

![image-20250412235518948](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412235519489.png)

php_serialize格式

![image-20250412235809798](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412235809988.png)

php_binary格式

![image-20250412235928649](https://gitee.com/crx12345/my-image-host/raw/master/images/20250412235928882.png)

如何造成反序列化漏洞

![image-20250413001212685](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413001213208.png)

### 11session反序列化例题

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250413001523045.png" alt="image-20250413001522918" style="zoom: 50%;" />

提示有hint.php说明这个页面应该能访问，name=her时，输出flag

但是发现该页面并没有注入点，但有session_start，意味着可以从session里读，进行反序列化

再看一下另外一个页面hint.php

![image-20250413001952434](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413001952680.png)

发现这个页面里面有注入点a

这里我们会用到之前提的引用

![image-20250413002421070](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413002421194.png)

观察第二个页面，是php_serialize格式，所以输入的时候要在前面加入管道符

?a=|O:4:"Flag":2:{s:4:"name";N;s:3:"her";R:2;}

![image-20250413002710714](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413002710997.png)

刷新第一个页面发现flag

ctfstu{5c202c62-7567-4fa0-a370-134fe9d16ce7}



### 12phar反序列化漏洞的介绍

phar可以简单理解为压缩包

![image-20250413003414349](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413003414773.png)

![image-20250413003838830](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413003839485.png)

phar反序列化漏洞原理

![image-20250413003951146](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413003951858.png)

接下来，看一道例题

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250413004157451.png" alt="image-20250413004157339" style="zoom:50%;" />

有个file_exists函数是判断filename是否存在

我们检查一下看是否存在

![image-20250413004534562](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413004534735.png)

发现存在，说明可以调用phar伪协议

可以使用以下模板

```
<?phphighlight_file(__FILE__);
class Testobj{  
var $output='';}@unlink('test.phar');  //删除之前的test.par文件(如果有)
$phar=new Phar('test.phar'); //创建一个phar对象，文件名必须以phar为后缀
$phar->startBuffering(); //开始写文件
$phar->setStub('<?php __HALT_COMPILER(); ?>'); //写入stub$o=new Testobj();
$o->output='eval($_GET["a"]);';
$phar->setMetadata($o);//写入meta-data$phar->addFromString("test.txt","test");
//添加要压缩的文件
$phar->stopBuffering();?>
```

![image-20250413005540960](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413005541687.png)

phar条件

![image-20250413005806568](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413005806899.png)

具体可参考

https://blog.csdn.net/csjjjd/article/details/135888292?fromshare=blogdetail&sharetype=blogdetail&sharerId=135888292&sharerefer=PC&sharesource=chenxi_co&sharefrom=from_link

### 13phar反序列化例题讲解

<img src="https://gitee.com/crx12345/my-image-host/raw/master/images/20250413005944211.png" alt="image-20250413005943949" style="zoom:50%;" />

分析题目，只有进行反序列化触发_destruct方法，输出flag，但是显然并没有反序列化的函数

通过post注入file来判断文件是否存在，发现是可以的

![image-20250413010509358](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413010509935.png)

![image-20250413010722208](https://gitee.com/crx12345/my-image-host/raw/master/images/20250413010723491.png)

### 14原生类

### 什么是php原生类

> 原生类就是php内置类，不用定义php自带的类，即不需要在当前脚本写出，但也可以实例化的类

### 文件与目录读取

##### 1. DirectoryIterator

![image-20250414203202937](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414203203115.png)



首先解释一下foreach，它跟echo的区别是它能回显很多文件，echo只能回显当前的第一个内容

传入参数：cmd=glob:///*.php ;相当于模式匹配

这里传入的不只是协议，还有路径；

会创建一个指定目录的迭代器。当执行到echo函数时，会触发DirectoryIterator类中的 `__toString()` 方法，输出指定目录里面经过排序之后的第一个文件名

##### 2.FilesystemIterator

![image-20250414204621426](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414204621527.png)

用法和DirectoryIterator一样，在手册中可以看到Filesystemterator extends DirectoryIterator implements Seekablerterator;也就是说FilesystemIterator与DirectoryIterator是子类与父类的关系；测试php代码中调用的是FilesystemIterator继承自Directoryiterator的_tostring()方法;FilesystemIterator: current()是Filesys temIterator 自身用于回显目录信息的方法

##### 3.glob://协议与魔术匹配

glob://查看匹配的文件目录格式

##### 4GlobIterator

![image-20250414205450511](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414205450595.png)

与之前两个类的作用和使用方法类似；不同点在于其行为类似于glob()，可以通过横式匹配来寻找文件路径(前两个需要利用glob://协议才可以模式匹配）；

##### 5可遍历目录类绕过open_basedir



Qpen basedir限制目显：将PHP所能打开的文件限制在指定的目录树，包括文件本身;

使用DirectoryIterator类或FilesystemIterator类，与glob://协议结合将无视open basedi对目录的限制，可以用来列举出指定目录下的文件:使用GlobIterator类，通过模式匹配来寻找文件路径
![image-20250414210251873](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414210251989.png)

##### 6.SplFileobject

传入参数cmd=index.php ;回显了当前页面的内容；和上面的目录回显一样，要移动指针；传入的字符串可以自录穿越，在这里里用到的是：SplFileobject::_tostring；还可以用splFileobject:：current ;

![image-20250414210744355](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414210744409.png)

当用文件目录遍历到了敏感文件时，可以用`SplFileObject`类，同样通过echo触发`SplFileObject`中的`__toString()`方法。(该类不支持通配符，所以必须先获取到完整文件名称才行)，而且这个方法只能读一行



##### 7.ZipArchive::open()

比较常考的文件删除

![image-20250414211045789](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414211045835.png)

这样就删除了test.zip文件;ZIPARCHIVE::OVERWRITE ：总是以一个新的压缩包开始，此模式下如果已经存在则会被覆盖。这是个常数项，
值ZIPARCHIVE::OVERURITE=8

##### 8.Reflection

读取文件信息，在文件操作(读取)里

![image-20250414211728893](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414211729004.png)

需要注意:注释文本须符合/**开头的规范，否则无法识别

### ssrf

##### SoapClient::_call()

SOAP(简单对象访问协议)是连接或Web服务或客户端和Web服务之间的接口；其采用HTTP作为底层通讯协议，XML作为数据传送的格式，仅限http/https协议:SOAP消息基本上是从发送端到接收端的单向传输，但它们常常结合起来执行类似于请求/应答的模式：如
果想要使用SoapClient类需要在php.ini配置文件里面开启extension=php_soap.dll选项

模拟发送请求

![image-20250414212631800](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414212631946.png)

### XXE

#### SimplexMLElement

适用于PHP5,PHP7,PHP8
利用实例化该类的对象来传入xml代码进行xxe攻击，进而读取文件内容和命令执行

![image-20250414212824030](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414212824246.png)

官方文档中对于SimpleXMLElement类的构造方法simpleXMLElement::_construct的定义如下:
参数

![image-20250414213349047](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414213349359.png)

### xss

#### Error

![image-20250414213701021](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414213701138.png)

#### Exception

![image-20250414213908758](https://gitee.com/crx12345/my-image-host/raw/master/images/20250414213908888.png)

### 命令执行

如果有eval的话就可以rce

```php
<?php
$a = $_GET['a'];
$b = $_GET['b'];
eval("echo new $a($b());");
?>
```
