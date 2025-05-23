# MRI Mail

<div align="center">
  <h3>一个现代化的邮局服务，基于MoeMail修改</h3>
</div>

## 关于本项目

本项目基于 [beilunyang/moemail](https://github.com/beilunyang/moemail) 的源代码，根据 MIT 协议进行二次开发。感谢原作者的优秀工作！

## 功能特性

### 原有功能
- 创建临时邮箱，支持自定义有效期
- 实时接收邮件，支持 HTML 和纯文本格式查看
- 用户系统和角色权限管理
- API 接口支持，便于系统集成
- Webhook 集成支持

### 修改&新增功能
#### 管理员端
- **用户查询**：现在可以通过搜索查看用户名及等级
  ![image](https://github.com/user-attachments/assets/f9a8e735-ed76-4a6b-9580-24b3eb4fd135)
- **用户数量统计**：查看当前邮箱注册/各等级人数，支持一键删除最低等级（未授权）的账户
  ![image](https://github.com/user-attachments/assets/570e49d5-dc79-4947-b21e-2b764b415d4c)
- **禁用邮箱删除功能**：用户无法自主删除已经注册的邮箱
- **默认邮箱时限**：目前只能创建永久时限的邮箱，可以替换[beilunyang/moemail](https://github.com/beilunyang/moemail)中的app/types/email.ts文件恢复

#### 用户端
- **邮件查询**：可以在邮件列表中输入关键词（发件人、邮件内容、邮件主题）自动检索对应的邮件
  ![image](https://github.com/user-attachments/assets/7ead0f40-9aaa-456b-943e-bf9fbd637c05)
- **SMTP发件功能**：支持通过SMTP协议发送邮件，兼容各大邮箱服务商
  - 支持Gmail、Outlook、QQ邮箱、163邮箱等主流邮箱服务商
  - 使用应用专用密码确保安全性
  - 详细配置说明请参考 [SMTP配置文档](docs/SMTP_CONFIG.md)

### 未来计划
- [ ] 接入Linux Do Connect
- [ ] 更多的功能For Admin+Users

## 技术栈

- 前端：Next.js, React, Tailwind CSS
- 后端：Node.js
- 数据存储：Cloudflare KV, D1
- 部署：Cloudflare Pages, Workers

## 部署教程

### 基础部署
- 与Moemail一致，请前往 [beilunyang/moemail页面](https://github.com/beilunyang/moemail) 进行查看
- 如已部署过Moemail，可直接下载源码覆盖部署

### SMTP配置（可选）
如需使用发件功能，请配置以下环境变量：

```bash
SMTP_SERVER="smtp.gmail.com"      # SMTP服务器地址
SMTP_PORT="587"                   # SMTP端口号
SMTP_LOGIN="your-email@gmail.com" # SMTP登录用户名
SMTP_PASSWORD="your-app-password" # SMTP登录密码
```

#### GitHub Actions Secrets
在GitHub仓库设置中添加以下Secrets：
- `SMTP_SERVER`
- `SMTP_PORT` 
- `SMTP_LOGIN`
- `SMTP_PASSWORD`

详细配置说明请参考：
- [发送邮件功能配置指南](docs/SENDING_EMAILS.md)
- [SMTP配置说明](docs/SMTP_CONFIG.md)

## 从Brevo API迁移

如果您之前使用的是Brevo API，需要进行以下更改：

1. 删除 `BREVO_API_KEY` 环境变量
2. 添加上述四个SMTP环境变量
3. 重新部署应用

## 许可证

本项目遵循 [MIT 许可证](LICENSE)，与原项目保持一致。

## 致谢

- 原项目作者 [beilunyang](https://github.com/beilunyang) 提供的优秀代码基础
- 所有为本项目做出贡献的开发者
