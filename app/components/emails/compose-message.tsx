"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Send, X } from "lucide-react"

interface ComposeMessageProps {
  emailId: string
  fromEmail: string
  onClose: () => void
}

interface ApiErrorResponse {
  error: string
}

interface ApiSuccessResponse {
  success: boolean
  messageId: string
}

export function ComposeMessage({ emailId, fromEmail, onClose }: ComposeMessageProps) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const handleSend = async () => {
    if (!to || !subject || !content) {
      toast({
        title: "错误",
        description: "请填写所有必填字段",
        variant: "destructive"
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to,
          subject,
          content,
          from: fromEmail
        })
      })

      if (!response.ok) {
        const errorData = await response.json() as ApiErrorResponse
        throw new Error(errorData.error || "发送失败")
      }

      const result = await response.json() as ApiSuccessResponse

      toast({
        title: "成功",
        description: "邮件已发送"
      })
      
      // 清空表单
      setTo("")
      setSubject("")
      setContent("")
      onClose()
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "发送邮件失败",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-primary/20 flex items-center justify-between">
        <h3 className="text-lg font-semibold">撰写新邮件</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="space-y-2">
            <Label htmlFor="from">发件人</Label>
            <Input
              id="from"
              value={fromEmail}
              disabled
              className="bg-muted"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to">收件人 *</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">主题 *</Label>
            <Input
              id="subject"
              placeholder="邮件主题"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">内容 *</Label>
            <Textarea
              id="content"
              placeholder="邮件内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] resize-none"
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-primary/20">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
          >
            取消
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !to || !subject || !content}
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                发送中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                发送
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 
