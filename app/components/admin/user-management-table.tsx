"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Crown, 
  Gem, 
  Sword, 
  User2,
  Edit,
  Check,
  X,
  Loader2,
  Mail,
  Calendar
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  name: string | null
  username: string | null
  email: string | null
  role: string
  maxEmails: number
  currentEmailCount: number
  createdAt: string | null
}

interface UserManagementTableProps {
  users: User[]
  loading: boolean
  onUserUpdate: (userId: string, newMaxEmails: number) => void
}

const roleConfig = {
  emperor: { 
    name: '校长', 
    icon: Crown, 
    color: 'bg-yellow-500 text-white',
    variant: 'default' as const
  },
  duke: { 
    name: '教授', 
    icon: Gem, 
    color: 'bg-purple-500 text-white',
    variant: 'secondary' as const
  },
  knight: { 
    name: '认证学生', 
    icon: Sword, 
    color: 'bg-blue-500 text-white',
    variant: 'outline' as const
  },
  civilian: { 
    name: '未认证', 
    icon: User2, 
    color: 'bg-gray-500 text-white',
    variant: 'outline' as const
  },
} as const

export function UserManagementTable({ users, loading, onUserUpdate }: UserManagementTableProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<number>(0)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  const handleStartEdit = (userId: string, currentMaxEmails: number) => {
    setEditingUserId(userId)
    setEditingValue(currentMaxEmails)
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditingValue(0)
  }

  const handleSaveEdit = async (userId: string) => {
    if (editingValue < 0 || editingValue > 1000) {
      toast({
        title: "输入错误",
        description: "邮箱数量限制必须在 0-1000 之间",
        variant: "destructive"
      })
      return
    }

    setUpdating(userId)
    try {
      const response = await fetch(`/api/roles/users/${userId}/max-emails`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxEmails: editingValue })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新失败')
      }

      onUserUpdate(userId, editingValue)
      setEditingUserId(null)
      toast({
        title: "更新成功",
        description: `邮箱限制已更新为 ${editingValue}`,
      })
    } catch (error) {
      console.error('Failed to update user:', error)
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitials = (name: string | null, username: string | null, email: string | null) => {
    if (name) return name.slice(0, 2).toUpperCase()
    if (username) return username.slice(0, 2).toUpperCase()
    if (email) return email.slice(0, 2).toUpperCase()
    return 'U'
  }

  if (loading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>邮箱限制</TableHead>
              <TableHead>当前邮箱</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <User2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          没有找到用户
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          尝试调整搜索条件或筛选器
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>邮箱限制</TableHead>
            <TableHead>当前邮箱</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead className="w-24">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const roleInfo = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.civilian
            const Icon = roleInfo.icon
            const isEditing = editingUserId === user.id
            const isUpdating = updating === user.id

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name, user.username, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {user.name || user.username || '未设置'}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant={roleInfo.variant} className="gap-1">
                    <Icon className="w-3 h-3" />
                    {roleInfo.name}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="1000"
                        value={editingValue}
                        onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
                        className="w-20 h-8 text-sm"
                        disabled={isUpdating}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleSaveEdit(user.id)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.maxEmails}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleStartEdit(user.id, user.maxEmails)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400" />
                    <span className="text-sm">{user.currentEmailCount}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(user.createdAt)}
                  </div>
                </TableCell>
                
                <TableCell>
                  {!isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(user.id, user.maxEmails)}
                      disabled={isUpdating}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
