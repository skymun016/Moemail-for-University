import { Header } from "@/components/layout/header"
import { UserManagementPanel } from "@/components/admin/user-management-panel"
import { auth, checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { NoPermissionDialog } from "@/components/no-permission-dialog"

export const runtime = "edge"

export default async function AdminUsersPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  // 检查是否有用户管理权限（只有皇帝可以访问）
  const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 lg:px-8 max-w-[1600px]">
          <Header />
          <main className="pt-20 pb-5">
            <div className="text-center py-20">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                权限不足
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                只有校长（Emperor）才能访问用户管理页面
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1600px]">
        <Header />
        <main className="pt-20 pb-5">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              用户管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              管理所有用户的邮箱数量限制和基本信息
            </p>
          </div>
          
          <UserManagementPanel />
        </main>
      </div>
    </div>
  )
}
