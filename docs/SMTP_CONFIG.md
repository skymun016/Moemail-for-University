# SMTP 配置说明

## 环境变量配置

为了使用SMTP发送邮件功能，您需要配置以下环境变量：

### 必需的SMTP环境变量

```bash
# SMTP 邮件发送配置
SMTP_SERVER="smtp.gmail.com"           # SMTP服务器地址
SMTP_PORT="587"                        # SMTP端口号
SMTP_LOGIN="your-email@gmail.com"      # SMTP登录用户名
SMTP_PASSWORD="your-app-password"      # SMTP登录密码
```

### 常用邮箱服务商配置

#### Gmail
```bash
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_LOGIN="your-email@gmail.com"
SMTP_PASSWORD="your-16-digit-app-password"
```

**注意事项：**
- 需要开启两步验证
- 使用应用专用密码而不是账户密码
- 生成应用专用密码：Google账户 > 安全性 > 应用专用密码

#### Outlook/Hotmail
```bash
SMTP_SERVER="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_LOGIN="your-email@outlook.com"
SMTP_PASSWORD="your-account-password"
```

#### QQ邮箱
```bash
SMTP_SERVER="smtp.qq.com"
SMTP_PORT="587"
SMTP_LOGIN="your-email@qq.com"
SMTP_PASSWORD="your-authorization-code"
```

**注意事项：**
- 需要在QQ邮箱设置中开启SMTP服务
- 使用授权码而不是QQ密码

#### 163邮箱
```bash
SMTP_SERVER="smtp.163.com"
SMTP_PORT="587"
SMTP_LOGIN="your-email@163.com"
SMTP_PASSWORD="your-authorization-code"
```

#### 126邮箱
```bash
SMTP_SERVER="smtp.126.com"
SMTP_PORT="587"
SMTP_LOGIN="your-email@126.com"
SMTP_PASSWORD="your-authorization-code"
```

## 在不同环境中配置

### 本地开发环境

1. 在项目根目录创建 `.env` 文件
2. 添加上述环境变量

### GitHub Actions（CI/CD）

在GitHub仓库设置中添加以下Secrets：
- `SMTP_SERVER`
- `SMTP_PORT`
- `SMTP_LOGIN`
- `SMTP_PASSWORD`

### Cloudflare Pages

#### 方法1：通过Dashboard
1. 登录Cloudflare Dashboard
2. 进入Pages项目
3. Settings > Environment variables
4. 添加上述四个变量

#### 方法2：通过Wrangler CLI
```bash
wrangler pages secret put SMTP_SERVER
wrangler pages secret put SMTP_PORT
wrangler pages secret put SMTP_LOGIN
wrangler pages secret put SMTP_PASSWORD
```

## 安全建议

1. **使用应用专用密码**：避免使用主账户密码
2. **定期更换密码**：定期更新SMTP密码
3. **限制访问权限**：只给必要的应用分配SMTP权限
4. **监控使用情况**：定期检查邮件发送日志
5. **备用配置**：准备多个邮箱作为备用

## 故障排除

### 常见问题

1. **认证失败**
   - 检查用户名和密码是否正确
   - 确认是否需要使用应用专用密码
   - 验证SMTP服务是否已开启

2. **连接失败**
   - 检查SMTP服务器地址和端口
   - 确认网络连接正常
   - 验证防火墙设置

3. **发送失败**
   - 检查发件人地址是否与登录邮箱一致
   - 确认收件人地址格式正确
   - 检查是否超出发送限制

### 测试SMTP配置

您可以使用以下在线工具测试SMTP配置：
- SMTP测试工具
- 邮箱客户端配置测试

## 从Brevo API迁移

如果您之前使用Brevo API，需要：

1. 删除 `BREVO_API_KEY` 环境变量
2. 添加上述四个SMTP环境变量
3. 重新部署应用

SMTP方式的优势：
- 更加通用，支持任何SMTP服务商
- 不依赖第三方API服务
- 更高的可控性和可靠性 