import { createDb } from "@/lib/db"
import { users, emails, userRoles, roles } from "@/lib/schema"
import { eq, count, like, or, desc, asc, sql, gt } from "drizzle-orm"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { NextResponse } from "next/server"

export const runtime = "edge"

interface UserListItem {
  id: string
  name: string | null
  username: string | null
  email: string | null
  role: string | null
  maxEmails: number
  currentEmailCount: number
  createdAt: Date | null
  lastLoginAt: Date | null
}

interface GetUsersParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'name' | 'email' | 'role' | 'maxEmails' | 'currentEmailCount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  roleFilter?: string
}

export async function GET(request: Request) {
  try {
    // 检查权限 - 只有皇帝（emperor）才能访问用户管理
    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const params: GetUsersParams = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: Math.min(parseInt(searchParams.get('pageSize') || '20'), 100), // 最大100条
      search: searchParams.get('search') || '',
      sortBy: (searchParams.get('sortBy') as GetUsersParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as GetUsersParams['sortOrder']) || 'desc',
      roleFilter: searchParams.get('roleFilter') || ''
    }

    const db = createDb()

    // 首先获取用户基本信息和角色
    const usersWithRoles = await db.query.users.findMany({
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      },
      where: params.search ? or(
        like(users.name, `%${params.search}%`),
        like(users.username, `%${params.search}%`),
        like(users.email, `%${params.search}%`)
      ) : undefined
    })

    // 获取每个用户的当前邮箱数量
    const userEmailCounts = new Map<string, number>()
    for (const user of usersWithRoles) {
      const emailCountResult = await db
        .select({ count: count() })
        .from(emails)
        .where(
          eq(emails.userId, user.id)
        )
      userEmailCounts.set(user.id, emailCountResult[0]?.count || 0)
    }

    // 处理数据并应用过滤
    let filteredUsers = usersWithRoles.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.userRoles[0]?.role.name || 'civilian',
      maxEmails: user.maxEmails || 1,
      currentEmailCount: userEmailCounts.get(user.id) || 0,
      createdAt: user.createdAt ? new Date(user.createdAt) : null,
      lastLoginAt: null // 暂时不实现最后登录时间
    }))

    // 应用角色过滤
    if (params.roleFilter) {
      filteredUsers = filteredUsers.filter(user => user.role === params.roleFilter)
    }

    // 应用排序
    filteredUsers.sort((a, b) => {
      let aValue: any, bValue: any

      switch (params.sortBy) {
        case 'name':
          aValue = a.name || ''
          bValue = b.name || ''
          break
        case 'email':
          aValue = a.email || ''
          bValue = b.email || ''
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'maxEmails':
          aValue = a.maxEmails
          bValue = b.maxEmails
          break
        case 'currentEmailCount':
          aValue = a.currentEmailCount
          bValue = b.currentEmailCount
          break
        case 'createdAt':
        default:
          aValue = a.createdAt?.getTime() || 0
          bValue = b.createdAt?.getTime() || 0
          break
      }

      if (params.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    // 计算分页
    const totalCount = filteredUsers.length
    const totalPages = Math.ceil(totalCount / params.pageSize!)
    const startIndex = (params.page! - 1) * params.pageSize!
    const endIndex = startIndex + params.pageSize!
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalCount,
        totalPages,
        hasNextPage: params.page! < totalPages,
        hasPrevPage: params.page! > 1
      },
      filters: {
        search: params.search,
        roleFilter: params.roleFilter,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      }
    })

  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    )
  }
}

// 批量更新用户邮箱限制
export async function PATCH(request: Request) {
  try {
    // 检查权限
    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { updates } = await request.json() as {
      updates: Array<{ userId: string; maxEmails: number }>
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "更新数据不能为空" },
        { status: 400 }
      )
    }

    // 验证每个更新项
    for (const update of updates) {
      if (!update.userId || typeof update.maxEmails !== 'number') {
        return NextResponse.json(
          { error: "更新数据格式不正确" },
          { status: 400 }
        )
      }

      if (update.maxEmails < 0 || update.maxEmails > 1000) {
        return NextResponse.json(
          { error: "邮箱数量限制必须在 0-1000 之间" },
          { status: 400 }
        )
      }
    }

    const db = createDb()
    const results = []

    // 逐个更新用户
    for (const update of updates) {
      try {
        // 检查用户是否存在
        const user = await db.query.users.findFirst({
          where: eq(users.id, update.userId)
        })

        if (!user) {
          results.push({
            userId: update.userId,
            success: false,
            error: "用户不存在"
          })
          continue
        }

        // 更新用户邮箱限制
        await db
          .update(users)
          .set({ maxEmails: update.maxEmails })
          .where(eq(users.id, update.userId))

        results.push({
          userId: update.userId,
          success: true,
          oldMaxEmails: user.maxEmails,
          newMaxEmails: update.maxEmails
        })

      } catch (error) {
        console.error(`Failed to update user ${update.userId}:`, error)
        results.push({
          userId: update.userId,
          success: false,
          error: "更新失败"
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount
      }
    })

  } catch (error) {
    console.error("Failed to batch update users:", error)
    return NextResponse.json(
      { error: "批量更新失败" },
      { status: 500 }
    )
  }
}
