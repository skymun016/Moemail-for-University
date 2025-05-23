import { NextRequest, NextResponse } from "next/server"
import { createDb } from "@/lib/db"
import { emails } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { getUserId } from "@/lib/apiKey"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { createSMTPClient } from "@/lib/smtp"

export const runtime = "edge"

interface SendEmailRequest {
  to: string
  subject: string
  content: string
  from: string
}

interface SMTPApiResponse {
  messageId: string
}

interface SMTPApiError {
  error?: string
  message?: string
  code?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  
  if (!userId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  try {
    const db = createDb()
    const { id } = await params
    
    // 验证用户拥有该邮箱
    const email = await db.query.emails.findFirst({
      where: and(
        eq(emails.id, id),
        eq(emails.userId, userId)
      )
    })

    if (!email) {
      return NextResponse.json({ error: "邮箱不存在或无权限" }, { status: 404 })
    }

    const body = await request.json() as SendEmailRequest
    const { to, subject, content, from } = body

    if (!to || !subject || !content || !from) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "收件人邮箱格式不正确" },
        { status: 400 }
      )
    }

    // 从 Cloudflare 环境变量获取 SMTP 配置
    const env = getRequestContext().env
    const smtpServer = env.SMTP_SERVER
    const smtpPort = env.SMTP_PORT
    const smtpLogin = env.SMTP_LOGIN
    const smtpPassword = env.SMTP_PASSWORD

    if (!smtpServer || !smtpPort || !smtpLogin || !smtpPassword) {
      console.error("未配置 SMTP 参数")
      return NextResponse.json(
        { error: "邮件服务配置错误，请检查 SMTP 环境变量" },
        { status: 500 }
      )
    }

    // 创建 SMTP 客户端并发送邮件
    const smtpClient = createSMTPClient({
      server: smtpServer,
      port: parseInt(smtpPort),
      login: smtpLogin,
      password: smtpPassword
    })

    const result = await smtpClient.sendEmail({
      from,
      to,
      subject,
      content
    })

    if (!result.success) {
      console.error("SMTP 发送错误:", result.error)
      return NextResponse.json(
        { error: result.error || "发送邮件失败" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      messageId: result.messageId
    })
  } catch (error) {
    console.error("发送邮件错误:", error)
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    )
  }
} 