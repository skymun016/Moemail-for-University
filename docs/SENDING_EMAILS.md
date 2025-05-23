# 发送邮件功能配置指南

## 功能概述

MoEmail 现在支持通过 SMTP 协议发送邮件。用户可以在邮件列表界面点击发件按钮，撰写并发送邮件。

## 配置步骤

### 1. 准备 SMTP 服务器信息

您需要准备以下SMTP服务器信息：

- **SMTP Server（服务器地址）**: 例如 `smtp.gmail.com`, `smtp.outlook.com`, `smtp.qq.com` 等
- **Port（端口）**: 通常为 `587`（TLS）或 `465`（SSL）或 `25`（无加密）
- **Login（登录名）**: 您的邮箱地址或用户名
- **Master Password（密码）**: 您的邮箱密码或应用专用密码

#### 常用SMTP服务器配置示例

**Gmail:**
- 服务器: `smtp.gmail.com`
- 端口: `587`
- 需要开启"两步验证"并使用"应用专用密码"

**Outlook/Hotmail:**
- 服务器: `smtp-mail.outlook.com`
- 端口: `587`

**QQ邮箱:**
- 服务器: `smtp.qq.com`
- 端口: `587`
- 需要开启SMTP服务并使用授权码

### 2. 配置环境变量

#### 本地开发环境

在项目根目录的 `.env` 文件中添加：

```env
SMTP_SERVER="您的SMTP服务器地址"
SMTP_PORT="587"
SMTP_LOGIN="您的邮箱地址"
SMTP_PASSWORD="您的邮箱密码或应用专用密码"
```

#### Cloudflare Pages 部署环境

**方式一：通过 Cloudflare Dashboard**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入您的 Pages 项目
3. 点击 "Settings" 标签
4. 滚动到 "Environment variables" 部分
5. 分别添加以下变量：
   - Variable name: `SMTP_SERVER`, Value: 您的SMTP服务器地址
   - Variable name: `SMTP_PORT`, Value: `587`
   - Variable name: `SMTP_LOGIN`, Value: 您的邮箱地址
   - Variable name: `SMTP_PASSWORD`, Value: 您的邮箱密码
   - Environment: 选择 `Production` 和/或 `Preview`
6. 点击 "Save"

**方式二：通过 GitHub Actions Secrets（推荐用于 CI/CD）**

1. 在 GitHub 仓库中，进入 "Settings" > "Secrets and variables" > "Actions"
2. 点击 "New repository secret"
3. 分别添加以下 secrets：
   - Name: `SMTP_SERVER`, Secret: 您的SMTP服务器地址
   - Name: `SMTP_PORT`, Secret: `587`
   - Name: `SMTP_LOGIN`, Secret: 您的邮箱地址
   - Name: `SMTP_PASSWORD`, Secret: 您的邮箱密码
4. 在部署脚本中，这些环境变量会自动传递给 Cloudflare Pages

**方式三：通过 Wrangler CLI**

```bash
# 设置环境变量到 Cloudflare Pages
wrangler pages secret put SMTP_SERVER --project-name=your-project-name
wrangler pages secret put SMTP_PORT --project-name=your-project-name
wrangler pages secret put SMTP_LOGIN --project-name=your-project-name
wrangler pages secret put SMTP_PASSWORD --project-name=your-project-name
```

### 3. 验证配置

部署后，如果环境变量配置正确，发送邮件时应该能正常工作。如果提示"邮件服务配置错误"，请检查：

1. 环境变量名称是否正确：`SMTP_SERVER`, `SMTP_PORT`, `SMTP_LOGIN`, `SMTP_PASSWORD`
2. SMTP服务器信息是否正确
3. 邮箱密码是否正确（建议使用应用专用密码）
4. SMTP服务是否已在邮箱提供商处开启
5. Cloudflare Pages 环境变量是否已正确设置

### 4. 使用发件功能

1. 在邮件列表界面，点击刷新按钮旁边的发件按钮（笔形图标）
2. 在弹出的撰写界面中：
   - 发件人：自动填充当前选中的邮箱地址
   - 收件人：输入收件人邮箱地址
   - 主题：输入邮件主题
   - 内容：输入邮件正文
3. 点击"发送"按钮发送邮件

## 注意事项

1. **发件人验证**：确保使用的发件邮箱地址与SMTP登录邮箱一致，否则可能被拒绝
2. **应用专用密码**：建议使用应用专用密码而不是主密码，增强安全性
3. **邮件格式**：系统会自动将纯文本转换为 HTML 格式，换行符会被转换为 `<br>` 标签
4. **发送限制**：请遵守邮箱提供商的发送限制，避免被误判为垃圾邮件
5. **安全性**：请妥善保管SMTP密码，不要在代码中硬编码

## 故障排除

### 常见错误

1. **"邮件服务配置错误，请检查 SMTP 环境变量"**
   - 检查是否在 Cloudflare Pages 中正确配置了所有SMTP环境变量
   - 确保环境变量名称拼写正确
   - 验证SMTP服务器信息是否正确

2. **"SMTP认证失败"**
   - 检查用户名和密码是否正确
   - 确认是否需要使用应用专用密码
   - 验证SMTP服务是否已在邮箱提供商处开启

3. **"发送邮件失败"**
   - 检查发件人邮箱是否与SMTP登录邮箱一致
   - 检查收件人邮箱格式是否正确
   - 确认网络连接正常
   - 检查是否超出发送限制

4. **"未授权"**
   - 确保用户已登录
   - 检查用户是否有权限使用该邮箱

5. **GitHub Actions 部署失败**
   - 确保在 GitHub Secrets 中设置了所有SMTP相关变量
   - 检查部署脚本是否正确传递环境变量到 Cloudflare

## API 端点

发送邮件的 API 端点：

```
POST /api/emails/{id}/send
```

请求体：
```json
{
  "to": "recipient@example.com",
  "subject": "邮件主题",
  "content": "邮件内容",
  "from": "sender@example.com"
}
```

响应：
```json
{
  "success": true,
  "messageId": "smtp-message-id"
}
```

## 环境变量说明

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `SMTP_SERVER` | SMTP服务器地址 | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP端口号 | `587` |
| `SMTP_LOGIN` | SMTP登录用户名 | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP登录密码 | `your-app-password` |

## 从 Brevo API 迁移

如果您之前使用的是 Brevo API，需要进行以下更改：

1. 删除 `BREVO_API_KEY` 环境变量
2. 添加上述四个SMTP环境变量
3. 重新部署应用

新的SMTP方式更加通用，支持任何标准的SMTP服务提供商。 