import { createServerClient } from "@supabase/ssr";

/**
 * service_role 客户端 —— 仅限服务端使用
 *
 * 红线（docs/sso-strategy.md §9）：
 * - SUPABASE_SERVICE_ROLE_KEY 绝不进入 NEXT_PUBLIC_*，绝不 import 到客户端组件
 * - 本客户端绕过 RLS，只用于受信服务端流程（小程序登录、交换码消费）
 *
 * 实现说明：复用 @supabase/ssr 的 createServerClient（service key 传第二参即绕过
 * RLS），cookie 传空实现——管理客户端不读写浏览器会话。
 *
 * Fluid compute：不要放全局变量，每次调用新建。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "[Supabase/Admin] 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createServerClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // 管理客户端不写 cookie
      },
    },
  });
}
