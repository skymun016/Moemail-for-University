import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { emails } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const db = createDb()
    const { id } = await params
    
    // 验证用户拥有该邮箱
    const email = await db
      .select()
      .from(emails)
      .where(eq(emails.id, id))
      .get()

    if (!email || email.userId !== session.user.id) {
      return NextResponse.json({ error: "邮箱不存在" }, { status: 404 })
    }

    const body = await request.json()
    const { to, subject, content, from } = body

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: "缺少必填字段" },
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
      const error = await response.json()
      console.error("Brevo API 错误:", error)
      return NextResponse.json(
        { error: "发送邮件失败" },
        { status: 500 }
      )
    }

    const result = await response.json()
    
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