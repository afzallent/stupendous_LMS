import NextAuth from "next-auth"
import { getAuthConfig } from "@/lib/auth-config"

const handler = async (req: any, res: any) => {
  const authConfig = await getAuthConfig()
  return NextAuth(authConfig)(req, res)
}

export { handler as GET, handler as POST }