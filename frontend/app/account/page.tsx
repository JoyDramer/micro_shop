'use client'

import { useAuth } from '@/components/auth-provider'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { UserProfilePage } from '@/components/user-profile-page'
import { Button } from '@/components/ui/button'

export default function AccountPage() {
  const { isAuthed, user, openModal } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {isAuthed && user ? (
        <UserProfilePage />
      ) : (
        <main className="min-h-screen bg-background pt-28 pb-20">
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Личный кабинет
            </h1>
            <div className="mt-8 rounded-2xl bg-card p-8 text-center shadow-sm ring-1 ring-border">
              <p className="text-muted-foreground">
                Войдите в аккаунт, чтобы получить доступ к личному кабинету.
              </p>
              <Button onClick={openModal} className="mt-6">
                Войти
              </Button>
            </div>
          </div>
        </main>
      )}
      <SiteFooter />
    </div>
  )
}
