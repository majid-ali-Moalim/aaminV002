import { redirect } from 'next/navigation'

/** Dispatcher portal uses the centralized login for all roles. */
export default function DispatcherLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const error = searchParams?.error
  const query =
    error === 'inactive'
      ? '?error=account_inactive'
      : error
        ? `?error=${encodeURIComponent(error)}`
        : ''
  redirect(`/login${query}`)
}
