import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import nodemailer from "nodemailer"
import { z } from "zod"

// 验证环境变量
const smtpConfig = z.object({
  SMTP_SERVER: z.string().min(1),
  SMTP_PORT: z.string().transform(Number),
  SMTP_LOGIN: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 验证 SMTP 配置
    let config
    try {
      config = smtpConfig.parse({
        SMTP_SERVER: process.env.SMTP_SERVER,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_LOGIN: process.env.SMTP_LOGIN,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      })
    } catch (error) {
      console.error("SMTP configuration error:", error)
      return NextResponse.json(
        { error: "SMTP 服务器未配置。请在环境变量中设置 SMTP_SERVER、SMTP_PORT、SMTP_LOGIN 和 SMTP_PASSWORD。" },
        { status: 500 }
      )
    }

    // 获取表单数据
    const formData = await req.formData()
    const to = formData.get("to") as string
    const subject = formData.get("subject") as string
    const content = formData.get("content") as string
    const from = formData.get("from") as string

    // 验证必填字段
    if (!to || !subject || !content || !from) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      )
    }

    // 验证发件人邮箱是否属于当前用户
    // TODO: 这里应该查询数据库验证邮箱所有权
    // 暂时简化处理，假设用户有权限使用该邮箱

    // 创建 SMTP 传输器
    const transporter = nodemailer.createTransporter({
      host: config.SMTP_SERVER,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: config.SMTP_LOGIN,
        pass: config.SMTP_PASSWORD,
      },
    })

    // 处理附件
    const attachments = []
    const attachmentFiles = formData.getAll("attachments") as File[]
    
    for (const file of attachmentFiles) {
      // 检查文件大小（1MB 限制）
      if (file.size > 1024 * 1024) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过 1MB 限制` },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      attachments.push({
        filename: file.name,
        content: buffer,
      })
    }

    // 发送邮件
    const info = await transporter.sendMail({
      from: `"${from.split("@")[0]}" <${from}>`,
      to,
      subject,
      text: content,
      html: content.replace(/\n/g, "<br>"), // 简单的换行转换
      attachments,
    })

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    })

  } catch (error) {
    console.error("Send email error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发送邮件失败" },
      { status: 500 }
    )
  }
} 
 