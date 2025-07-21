"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Mail, 
  Crown, 
  Gem, 
  Sword, 
  User2,
  TrendingUp,
  Activity
} from "lucide-react"

interface AdminStats {
  overview: {
    totalUsers: number
    activeEmails: number
    totalEmails: number
    recentUsers: number
  }
  roleStats: Array<{
    roleName: string
    roleDescription: string
    userCount: number
    displayName: string
  }>
  emailLimitStats: Array<{
    maxEmails: number
    userCount: number
  }>
  lastUpdated: string
}

const roleIcons = {
  emperor: Crown,
  duke: Gem,
  knight: Sword,
  civilian: User2
} as const

const roleColors = {
  emperor: "bg-yellow-500",
  duke: "bg-purple-500", 
  knight: "bg-blue-500",
  civilian: "bg-gray-500"
} as const

export function AdminStatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              最近7天新增 {stats.overview.recentUsers} 人
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃邮箱</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.activeEmails}</div>
            <p className="text-xs text-muted-foreground">
              未过期的邮箱地址
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总邮箱数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalEmails}</div>
            <p className="text-xs text-muted-foreground">
              包含已过期邮箱
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">新用户</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.recentUsers}</div>
            <p className="text-xs text-muted-foreground">
              最近7天注册
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 角色分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">角色分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.roleStats.map((role) => {
                const Icon = roleIcons[role.roleName as keyof typeof roleIcons] || User2
                const colorClass = roleColors[role.roleName as keyof typeof roleColors] || "bg-gray-500"
                
                return (
                  <div key={role.roleName} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{role.displayName}</span>
                    </div>
                    <Badge variant="secondary">
                      {role.userCount}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 邮箱限制分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">邮箱限制分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.emailLimitStats
                .sort((a, b) => a.maxEmails - b.maxEmails)
                .map((limit) => (
                  <div key={limit.maxEmails} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {limit.maxEmails === 1000 ? '1000+' : limit.maxEmails} 个邮箱
                      </span>
                    </div>
                    <Badge variant="outline">
                      {limit.userCount} 用户
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
