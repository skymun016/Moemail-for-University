"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { 
  Search, 
  Users, 
  Mail, 
  Crown, 
  Gem, 
  Sword, 
  User2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserManagementTable } from "./user-management-table"
import { AdminStatsCards } from "./admin-stats-cards"

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

interface UserListResponse {
  users: User[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  filters: {
    search: string
    roleFilter: string
    sortBy: string
    sortOrder: string
  }
}

const roleOptions = [
  { value: '', label: '全部角色' },
  { value: 'emperor', label: '校长', icon: Crown },
  { value: 'duke', label: '教授', icon: Gem },
  { value: 'knight', label: '认证学生', icon: Sword },
  { value: 'civilian', label: '未认证', icon: User2 },
]

const sortOptions = [
  { value: 'createdAt', label: '注册时间' },
  { value: 'name', label: '姓名' },
  { value: 'email', label: '邮箱' },
  { value: 'role', label: '角色' },
  { value: 'maxEmails', label: '邮箱限制' },
  { value: 'currentEmailCount', label: '当前邮箱数' },
]

export function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  
  const { toast } = useToast()

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search: searchTerm,
        roleFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('获取用户列表失败')
      }

      const data: UserListResponse = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast({
        title: "获取用户列表失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和依赖更新
  useEffect(() => {
    fetchUsers()
  }, [currentPage, roleFilter, sortBy, sortOrder])

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers()
      } else {
        setCurrentPage(1) // 重置到第一页，会触发 fetchUsers
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // 处理排序变更
  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  // 处理用户邮箱限制更新
  const handleUserUpdate = (userId: string, newMaxEmails: number) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId 
          ? { ...user, maxEmails: newMaxEmails }
          : user
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <AdminStatsCards />

      {/* 用户管理主面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            用户列表管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 搜索和过滤器 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索用户名、邮箱或姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="筛选角色" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="w-4 h-4" />}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.label}
                      {sortBy === option.value && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={fetchUsers}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          {/* 用户表格 */}
          <UserManagementTable
            users={users}
            loading={loading}
            onUserUpdate={handleUserUpdate}
          />

          {/* 分页控件 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                显示 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, pagination.totalCount)} 
                条，共 {pagination.totalCount} 条记录
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                
                <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  {currentPage} / {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
