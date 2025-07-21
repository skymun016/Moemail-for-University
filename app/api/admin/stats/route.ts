import { createDb } from "@/lib/db"
import { users, emails, userRoles, roles } from "@/lib/schema"
import { eq, count, sql, gt } from "drizzle-orm"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function GET() {
  try {
    // 检查权限
    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const db = createDb()

    // 获取用户总数
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users)
    const totalUsers = totalUsersResult[0]?.count || 0

    // 获取各角色用户数量
    const roleStatsResult = await db
      .select({
        roleName: roles.name,
        roleDescription: roles.description,
        userCount: count(userRoles.userId)
      })
      .from(roles)
      .leftJoin(userRoles, eq(roles.id, userRoles.roleId))
      .groupBy(roles.id, roles.name, roles.description)

    // 获取活跃邮箱总数（未过期的）
    const activeEmailsResult = await db
      .select({ count: count() })
      .from(emails)
      .where(gt(emails.expiresAt, new Date()))
    const activeEmails = activeEmailsResult[0]?.count || 0

    // 获取总邮箱数
    const totalEmailsResult = await db
      .select({ count: count() })
      .from(emails)
    const totalEmails = totalEmailsResult[0]?.count || 0

    // 获取邮箱限制分布统计
    const emailLimitStatsResult = await db
      .select({
        maxEmails: users.maxEmails,
        userCount: count()
      })
      .from(users)
      .groupBy(users.maxEmails)
      .orderBy(users.maxEmails)

    // 获取最近7天新注册用户数
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(gt(users.createdAt, sevenDaysAgo.getTime()))
    const recentUsers = recentUsersResult[0]?.count || 0

    // 格式化角色统计
    const roleStats = roleStatsResult.map(stat => ({
      roleName: stat.roleName,
      roleDescription: stat.roleDescription || '',
      userCount: stat.userCount || 0,
      displayName: {
        'emperor': '校长',
        'duke': '教授', 
        'knight': '认证学生',
        'civilian': '未认证'
      }[stat.roleName] || stat.roleName
    }))

    // 确保所有角色都有统计数据（即使是0）
    const allRoles = ['emperor', 'duke', 'knight', 'civilian']
    const completeRoleStats = allRoles.map(roleName => {
      const existing = roleStats.find(stat => stat.roleName === roleName)
      return existing || {
        roleName,
        roleDescription: '',
        userCount: 0,
        displayName: {
          'emperor': '校长',
          'duke': '教授', 
          'knight': '认证学生',
          'civilian': '未认证'
        }[roleName] || roleName
      }
    })

    // 格式化邮箱限制统计
    const emailLimitStats = emailLimitStatsResult.map(stat => ({
      maxEmails: stat.maxEmails || 1,
      userCount: stat.userCount || 0
    }))

    return NextResponse.json({
      overview: {
        totalUsers,
        activeEmails,
        totalEmails,
        recentUsers
      },
      roleStats: completeRoleStats,
      emailLimitStats,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error("Failed to fetch admin stats:", error)
    return NextResponse.json(
      { error: "获取统计信息失败" },
      { status: 500 }
    )
  }
}
