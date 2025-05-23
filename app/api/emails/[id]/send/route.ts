import { NextRequest, NextResponse } from "next/server"
import { createDb } from "@/lib/db"
import { emails } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { getUserId } from "@/lib/apiKey"

export const runtime = "edge"

interface SendEmailRequest {
  to: string
  subject: string
  content: string
  from: string
}

interface BrevoApiResponse {
  messageId: string
}

interface BrevoApiError {
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

    // 从环境变量获取 Brevo API 密钥
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      console.error("未配置 BREVO_API_KEY")
      return NextResponse.json(
        { error: "邮件服务配置错误" },
        { status: 500 }
      )
    }

    // 调用 Brevo API 发送邮件
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        sender: {
          email: from,
          name: from.split("@")[0]
        },
        to: [
          {
            email: to,
            name: to.split("@")[0]
          }
        ],
        subject,
        htmlContent: `<html><body>${content.replace(/\n/g, '<br>')}</body></html>`,
        textContent: content
      })
    })

    if (!response.ok) {
      const errorData = await response.json() as BrevoApiError
      console.error("Brevo API 错误:", errorData)
      return NextResponse.json(
        { error: errorData.message || errorData.error || "发送邮件失败" },
        { status: 500 }
      )
    }

    const result = await response.json() as BrevoApiResponse
    
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
