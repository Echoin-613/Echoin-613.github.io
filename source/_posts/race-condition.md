---
title: 条件竞争
date: 2026-08-24 13:00:00
categories:
  - Web安全
tags:
  - 条件竞争
description: 条件竞争
---


条件竞争（Race Condition）是一种并发编程中的漏洞，当两个或多个进程或线程同时访问共享资源（如文件、数据等）时，最终结果取决于它们执行的相对时序。在Web安全中，攻击者可以利用条件竞争在某个短暂的时间窗口内执行本应被限制的操作，例如在文件被创建但被删除前访问它。

1. 文件上传+文件包含组合利用

**场景**：

```
// 上传文件后立即检查并删除
if(upload_file()){
    if(check_malicious($file_path)){
        unlink($file_path); // 删除恶意文件
    }
}
```

**利用方式**：

- 攻击者上传包含Webshell的文件
- 在文件被删除前，快速发起文件包含请求执行恶意代码
- 需要多线程并发攻击抢占时间窗口

2. 账户余额并发操作

**漏洞代码**：

```
// 购买商品逻辑
function buy_product($user_id, $product_price){
    $balance = get_balance($user_id); // 读取余额
    if($balance >= $product_price){
        sleep(1); // 模拟处理时间
        $new_balance = $balance - $product_price;
        update_balance($user_id, $new_balance); // 更新余额
        return true;
    }
    return false;
}
```

**利用方式**：

- 同时发起多个购买请求
- 每个请求读取余额时都看到足够金额
- 最终只扣款一次但购买多个商品

3. 优惠券/票务系统的超卖

**漏洞逻辑**：

```
function claim_coupon($coupon_id){
    $remaining = get_remaining_coupons($coupon_id);
    if($remaining > 0){
        // 处理业务逻辑...
        update_remaining($coupon_id, $remaining - 1);
        return true;
    }
    return false;
}
```

**利用方式**：

- 多个请求同时检查剩余数量
- 都看到还有剩余，都成功领取
- 导致实际发放数量超过库存

4. 权限提升的竞争条件

**场景**：

```
// 用户注册逻辑
function register_user($username, $is_admin = false){
    if(!user_exists($username)){
        create_user($username, $is_admin);
        return true;
    }
    return false;
}
```

**利用方式**：

- 同时发送普通用户和管理员用户的注册请求
- 系统可能创建两个相同用户名的账户
- 其中一个可能获得管理员权限

5. TOCTOU (Time-of-Check-Time-of-Use) 漏洞

**典型例子**：

php

```
function process_file($filename){
    // 检查文件权限
    if(is_owner($filename, $_SESSION['user_id'])){
        // 在这期间文件可能被符号链接替换
        $content = file_get_contents($filename);
        process_content($content);
    }
}
```

**利用方式**：

- 检查时是合法文件
- 在检查和使用之间将文件替换为符号链接指向敏感文件
- 系统会读取攻击者本无权限访问的文件

6. 缓存投毒

**场景**：

```
// 缓存设置逻辑
function set_cache($key, $value, $user_id){
    if($user_id == 'admin'){
        $cache[$key] = $value; // 设置缓存
    }
}

// 缓存读取逻辑  
function get_cache($key){
    return $cache[$key]; // 任何用户都可读取
}
```

**利用方式**：

- 普通用户和"伪管理员"同时操作
- 利用权限检查的竞争窗口设置恶意缓存
- 所有用户读取到被污染的缓存数据

7. 数据库操作的竞争条件

**例子**：

```
-- 先查询后更新的典型模式
SELECT balance FROM accounts WHERE user_id = 123;
-- 在此期间balance可能被其他请求修改
UPDATE accounts SET balance = $new_balance WHERE user_id = 123;
```

**防御措施**：

- 使用数据库事务和行级锁
- 使用原子操作：`UPDATE accounts SET balance = balance - 100 WHERE user_id = 123`
- 使用乐观锁（版本号）

8. Web应用中的实际CTF例子

**签到系统的竞争条件**：

```
function daily_checkin($user_id){
    $today = date('Y-m-d');
    $last_checkin = get_last_checkin($user_id);
    
    if($last_checkin != $today){
        // 在这期间可能被其他请求插入记录
        add_points($user_id, 10); // 奖励积分
        update_last_checkin($user_id, $today);
        return "签到成功";
    }
    return "今天已签到";
}
```

**利用方式**：

- 并发发送多个签到请求
- 多个请求都通过检查，获得多次积分奖励