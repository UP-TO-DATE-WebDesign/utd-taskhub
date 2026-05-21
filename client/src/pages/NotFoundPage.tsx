import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  LayoutGrid,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted">
      {children}
    </p>
  )
}

export default function NotFoundPage() {
  const location = useLocation()

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-[1280px] items-center px-4 py-8 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <div className="mb-8 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h1 className="text-base font-semibold text-foreground">
              Page not found
            </h1>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted">
              Error 404
            </p>
            <p className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              This workspace route does not exist.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              The page may have moved, been renamed, or the link may be
              incomplete. Head back to a known workspace area to keep moving.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/projects">
                <LayoutGrid className="h-4 w-4" />
                Projects
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-muted-subtle px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Route check</SectionLabel>
                <p className="text-sm font-semibold text-foreground">
                  Requested path
                </p>
              </div>
              <Badge variant="accent">404</Badge>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-5 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              {location.pathname}
            </div>

            <Separator />

            <div className="mt-5 space-y-3">
              {[
                { label: 'Dashboard', path: '/' },
                { label: 'Projects', path: '/projects' },
                { label: 'Tasks', path: '/tasks' },
                { label: 'Tickets', path: '/tickets' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted-subtle"
                >
                  <span className="font-medium text-foreground">
                    {item.label}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {item.path}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-xs text-muted">
            <Search className="h-3.5 w-3.5" />
            Check the URL or choose a workspace destination.
          </div>
        </Card>
      </div>
    </div>
  )
}
