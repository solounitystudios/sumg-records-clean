import LoginForm from "@/app/login/login-form"

export const metadata = { title: "Sign In — SUMG Records" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  return <LoginForm returnTo={returnTo} />
}
