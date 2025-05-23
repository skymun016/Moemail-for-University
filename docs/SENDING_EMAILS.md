# 发送邮件功能配置指南

## 功能概述

MoEmail 现在支持通过 Brevo (原 SendinBlue) SMTP API 发送邮件。用户可以在邮件列表界面点击发件按钮，撰写并发送邮件。

## 配置步骤

### 1. 获取 Brevo API 密钥

1. 访问 [Brevo](https://www.brevo.com/) 并注册账号
2. 登录后访问 [API Keys 页面](https://app.brevo.com/settings/keys/api)
3. 创建一个新的 API 密钥
4. 复制生成的 API 密钥

### 2. 配置环境变量

在项目根目录的 `.env` 文件中添加：

```env
BREVO_API_KEY="your-brevo-api-key-here"
```

### 3. 使用发件功能

1. 在邮件列表界面，点击刷新按钮旁边的发件按钮（笔形图标）
2. 在弹出的撰写界面中：
   - 发件人：自动填充当前选中的邮箱地址
   - 收件人：输入收件人邮箱地址
   - 主题：输入邮件主题
   - 内容：输入邮件正文
3. 点击"发送"按钮发送邮件

## 注意事项

1. **发件人验证**：确保发件邮箱地址已在 Brevo 中验证，否则可能无法发送
2. **API 限制**：免费账户每天有发送限制（通常为 300 封/天）
3. **邮件格式**：系统会自动将纯文本转换为 HTML 格式，换行符会被转换为 `<br>` 标签

## 故障排除

### 常见错误

1. **"邮件服务配置错误"**
   - 检查是否正确配置了 `BREVO_API_KEY` 环境变量
   - 确保 API 密钥有效且未过期

2. **"发送邮件失败"**
   - 检查发件人邮箱是否已在 Brevo 中验证
   - 检查收件人邮箱格式是否正确
   - 查看 Brevo 控制台的错误日志

3. **"未授权"**
   - 确保用户已登录
   - 检查用户是否有权限使用该邮箱

## API 端点

发送邮件的 API 端点：

```
POST /api/emails/{emailId}/send
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
  "messageId": "brevo-message-id"
}
``` 