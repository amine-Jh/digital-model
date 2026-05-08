'use client'

import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { useIsMobile } from '@/components/ui/use-mobile'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { platformDomains } from '@/lib/platform-domains'
import { Brain, Calculator, Eye, GitBranch, Box, Sparkles, BarChart3, ArrowRight } from 'lucide-react'

const domainIcons: Record<string, React.ReactNode> = {
  'attentional-capacities': <Sparkles className="w-10 h-10 text-primary" />,
  'reasoning-capacities': <GitBranch className="w-10 h-10 text-primary" />,
  'cognitive-capacity': <Box className="w-10 h-10 text-primary" />,
  'visual-processing': <Eye className="w-10 h-10 text-primary" />,
  'memory-capacities': <Brain className="w-10 h-10 text-primary" />,
  'executive-functions': <BarChart3 className="w-10 h-10 text-primary" />,
  'mathematics-learning': <Calculator className="w-10 h-10 text-primary" />,
  cognitive: <Brain className="w-12 h-12 text-primary" />,
  mathematical: <Calculator className="w-12 h-12 text-primary" />,
}

export default function DomainsPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const totalCapacities = (domainId: string) => {
    const domain = platformDomains.find((d) => d.id === domainId)
    if (!domain) return 0
    return domain.subdomains.reduce((sum, sub) => sum + sub.capacities.length, 0)
  }

  return (
    <div className="bg-background min-h-screen">
      <Sidebar userRole="student" />

      <div className={cn("transition-all duration-200", isMobile ? "ml-0" : "ml-64")}>
        <Header
          title="Domaines cognitifs"
          subtitle="Explorez les capacités cognitives et mathématiques à travers des évaluations structurées"
        />

        <main className={cn("p-4 md:p-6 pt-24 max-w-7xl", isMobile && "pb-20")}>
          {/* Domain Hierarchy Info */}
          <Card className="mb-8 bg-secondary/5 border-secondary/20">
            <CardHeader>
              <CardTitle className="text-base">Domain Structure</CardTitle>
              <CardDescription>
                The platform evaluates cognitive and mathematical capacities. Each domain contains subdomains with specific capacities (tests).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>
                  <strong className="text-foreground">Domain → Subdomain → Capacity (Test) → Questions</strong>
                </p>
                <p>
                  Click a domain to view its subdomains and capacities. Each capacity is a test you can take.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {platformDomains.map((domain) => (
              <Card
                key={domain.id}
                className="overflow-hidden cursor-pointer transition-shadow hover:shadow-lg hover:border-primary/30"
                onClick={() => router.push(`/domains/${domain.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      {domainIcons[domain.id] ?? <Brain className="w-8 h-8 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl">{domain.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {domain.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {domain.subdomains.length} subdomains · {totalCapacities(domain.id)} tests
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/domains/${domain.id}`)
                      }}
                    >
                      Explore
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
