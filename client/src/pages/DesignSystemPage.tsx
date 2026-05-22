import { useState } from 'react'
import {
  Type, MousePointer2, AlignLeft, Activity, Table2, LayoutGrid, BellRing,
  Pencil, Trash2, Plus, TrendingUp, MessageSquare, GitPullRequest,
  ArrowRight, ChevronRight, MoreHorizontal, Calendar, Layers, AlertTriangle,
  Info, Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription, DialogClose,
} from '@/components/ui/dialog'

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium tracking-widest uppercase text-muted mb-2">{children}</p>
  )
}

const colorTokens = [
  {
    group: 'Primary',
    swatches: [
      { label: 'primary',            bg: 'bg-primary',          text: 'text-primary-foreground', hex: '#0058be' },
      { label: 'primary-hover',      bg: 'bg-primary-hover',    text: 'text-primary-foreground', hex: '#004395' },
      { label: 'primary-subtle',     bg: 'bg-primary-subtle',   text: 'text-primary',            hex: '#eff5ff' },
    ],
  },
  {
    group: 'Secondary',
    swatches: [
      { label: 'secondary',          bg: 'bg-secondary',        text: 'text-secondary-foreground', hex: '#006c49' },
      { label: 'secondary-hover',    bg: 'bg-secondary-hover',  text: 'text-secondary-foreground', hex: '#005236' },
      { label: 'secondary-subtle',   bg: 'bg-secondary-subtle', text: 'text-secondary',             hex: '#f0fdf9' },
    ],
  },
  {
    group: 'Accent',
    swatches: [
      { label: 'accent',             bg: 'bg-accent',           text: 'text-accent-foreground', hex: '#d97706' },
      { label: 'accent-hover',       bg: 'bg-accent-hover',     text: 'text-accent-foreground', hex: '#b45309' },
      { label: 'accent-subtle',      bg: 'bg-accent-subtle',    text: 'text-accent',            hex: '#fffbeb' },
    ],
  },
  {
    group: 'Danger',
    swatches: [
      { label: 'danger',             bg: 'bg-danger',           text: 'text-danger-foreground', hex: '#ba1a1a' },
      { label: 'danger-hover',       bg: 'bg-danger-hover',     text: 'text-danger-foreground', hex: '#93000a' },
      { label: 'danger-subtle',      bg: 'bg-danger-subtle',    text: 'text-danger',            hex: '#fff0ee' },
    ],
  },
  {
    group: 'Warning',
    swatches: [
      { label: 'warning',            bg: 'bg-warning',          text: 'text-warning-foreground', hex: '#c2410c' },
      { label: 'warning-hover',      bg: 'bg-warning-hover',    text: 'text-warning-foreground', hex: '#9a3412' },
      { label: 'warning-subtle',     bg: 'bg-warning-subtle',   text: 'text-warning',            hex: '#fff7ed' },
    ],
  },
  {
    group: 'Muted',
    swatches: [
      { label: 'muted',              bg: 'bg-muted',            text: 'text-surface',            hex: '#727785' },
      { label: 'muted-foreground',   bg: 'bg-muted-foreground', text: 'text-surface',            hex: '#424754' },
      { label: 'muted-subtle',       bg: 'bg-muted-subtle',     text: 'text-muted-foreground',   hex: '#f2f3fd' },
    ],
  },
  {
    group: 'Layout',
    swatches: [
      { label: 'background',         bg: 'bg-background',       text: 'text-foreground',         hex: '#f9f9ff', border: true },
      { label: 'foreground',         bg: 'bg-foreground',       text: 'text-surface',            hex: '#191b23' },
      { label: 'surface',            bg: 'bg-surface',          text: 'text-foreground',         hex: '#ffffff', border: true },
      { label: 'border',             bg: 'bg-border',           text: 'text-foreground',         hex: '#e1e2ec', border: true },
      { label: 'border-strong',      bg: 'bg-border-strong',    text: 'text-surface',            hex: '#c2c6d6' },
    ],
  },
]

const PRIORITY_OPTIONS: SearchableSelectOption[] = [
  { value: 'urgent', label: 'Urgent', description: 'Drop everything' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const MEMBER_OPTIONS: SearchableSelectOption<{ initials: string; role: string }>[] = [
  { value: 'jd', label: 'John Doe', description: 'john@taskhub.dev', meta: { initials: 'JD', role: 'Engineer' } },
  { value: 'as', label: 'Anna Smith', description: 'anna@taskhub.dev', meta: { initials: 'AS', role: 'Designer' } },
  { value: 'ar', label: 'Alex Rivera', description: 'alex@taskhub.dev', meta: { initials: 'AR', role: 'PM' } },
  { value: 'sl', label: 'Sarah Lee', description: 'sarah@taskhub.dev', meta: { initials: 'SL', role: 'Engineer' } },
  { value: 'mk', label: 'Mike Kim', description: 'mike@taskhub.dev', meta: { initials: 'MK', role: 'QA' }, disabled: true },
]

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(true)
  const [radioValue, setRadioValue] = useState('active')
  const [basicValue, setBasicValue] = useState('medium')
  const [memberValue, setMemberValue] = useState('jd')
  const [clearableValue, setClearableValue] = useState('high')
  const [errorValue, setErrorValue] = useState('')
  const [dialogPriority, setDialogPriority] = useState('medium')
  const [dialogAssignee, setDialogAssignee] = useState('jd')

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-foreground mb-1">Design System</h1>
        <p className="text-sm text-muted">Central reference for TaskHub's UI components and styles.</p>
      </div>

      <div className="space-y-10">

        {/* ── COLORS ───────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Palette} title="Colors" />
          <div className="space-y-6">
            {colorTokens.map((group) => (
              <div key={group.group}>
                <SectionLabel>{group.group}</SectionLabel>
                <div className="flex flex-wrap gap-3">
                  {group.swatches.map((s) => (
                    <div key={s.label} className="flex flex-col gap-1.5 w-[160px]">
                      <div className={`${s.bg} ${s.border ? 'border border-border' : ''} h-14 rounded-lg flex items-end px-3 pb-2`}>
                        <span className={`${s.text} text-[10px] font-mono font-medium opacity-80`}>{s.hex}</span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TYPOGRAPHY ───────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Type} title="Typography" />
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <SectionLabel>Heading 1</SectionLabel>
                  <p className="text-3xl font-semibold text-foreground tracking-tight leading-10">Design System 32px</p>
                </div>
                <div>
                  <SectionLabel>Heading 2</SectionLabel>
                  <p className="text-2xl font-semibold text-foreground tracking-tight leading-8">Task Management 24px</p>
                </div>
                <div>
                  <SectionLabel>Heading 3</SectionLabel>
                  <p className="text-xl font-semibold text-foreground tracking-tight leading-7">Component Library 20px</p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <SectionLabel>Body Large</SectionLabel>
                  <p className="text-base text-foreground leading-6">Focused engineering requires visual quiet and clarity.</p>
                </div>
                <div>
                  <SectionLabel>Body Medium</SectionLabel>
                  <p className="text-sm text-foreground leading-5">Standard text for descriptions and content blocks.</p>
                </div>
                <div>
                  <SectionLabel>Muted / Small</SectionLabel>
                  <p className="text-xs text-muted leading-4">Secondary information and supportive metadata.</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ── BUTTONS & ACTIONS ─────────────────────────────────── */}
        <section>
          <SectionHeader icon={MousePointer2} title="Buttons & Actions" />
          <Card className="p-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <SectionLabel>Primary</SectionLabel>
                <Button variant="default">Primary Action</Button>
              </div>
              <div>
                <SectionLabel>Secondary</SectionLabel>
                <Button variant="secondary">Secondary Action</Button>
              </div>
              <div>
                <SectionLabel>Outline</SectionLabel>
                <Button variant="outline">Outline Button</Button>
              </div>
              <div>
                <SectionLabel>Ghost & Icon</SectionLabel>
                <div className="space-y-2">
                  <Button variant="ghost">Ghost Button</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Button variant="accent">Accent</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="muted">Muted</Button>
              <Button variant="outline" disabled>Disabled</Button>
            </div>
          </Card>
        </section>

        {/* ── DATA ENTRY ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={AlignLeft} title="Data Entry" />
            <Button size="icon" className="rounded-full h-9 w-9"><Plus className="h-4 w-4" /></Button>
          </div>
          <Card className="p-6">
            <div className="grid grid-cols-3 gap-6 items-end">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Input Label</label>
                <Input placeholder="Enter task name..." />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Select Priority</label>
                <Select defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} id="active-task" />
                  <span className="text-sm text-muted-foreground">Active Task</span>
                </label>
                <RadioGroup value={radioValue} onValueChange={setRadioValue} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="internal" id="internal" />
                    <label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">Internal</label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </Card>
        </section>

        {/* ── SEARCHABLE SELECT ─────────────────────────────────── */}
        <section>
          <SectionHeader icon={AlignLeft} title="Searchable Select (react-select)" />
          <Card className="p-6 space-y-6">
            <div>
              <SectionLabel>Parity vs shadcn Select</SectionLabel>
              <div className="grid grid-cols-2 gap-6 items-start">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Legacy shadcn Select</label>
                  <Select defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SearchableSelect (basic)</label>
                  <SearchableSelect
                    value={basicValue}
                    onValueChange={setBasicValue}
                    options={PRIORITY_OPTIONS}
                    placeholder="Select priority"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6 items-start">
              <div>
                <SectionLabel>Clearable + Description</SectionLabel>
                <SearchableSelect
                  value={clearableValue}
                  onValueChange={setClearableValue}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority"
                  clearable
                />
              </div>
              <div>
                <SectionLabel>Disabled</SectionLabel>
                <SearchableSelect
                  value="high"
                  onValueChange={() => {}}
                  options={PRIORITY_OPTIONS}
                  disabled
                />
              </div>
              <div>
                <SectionLabel>Error State</SectionLabel>
                <SearchableSelect
                  value={errorValue}
                  onValueChange={setErrorValue}
                  options={PRIORITY_OPTIONS}
                  placeholder="Required"
                  error={!errorValue}
                />
                {!errorValue && <p className="text-xs text-danger mt-1">Priority is required</p>}
              </div>
              <div>
                <SectionLabel>Loading</SectionLabel>
                <SearchableSelect
                  value=""
                  onValueChange={() => {}}
                  options={[]}
                  loading
                  placeholder="Fetching options..."
                />
              </div>
            </div>

            <Separator />

            <div>
              <SectionLabel>Custom Option Renderer (Avatar + Role)</SectionLabel>
              <div className="max-w-md">
                <SearchableSelect<{ initials: string; role: string }>
                  value={memberValue}
                  onValueChange={setMemberValue}
                  options={MEMBER_OPTIONS}
                  placeholder="Select assignee"
                  clearable
                  renderOption={(opt) => (
                    <div className="flex items-center gap-2 w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px]">{opt.meta?.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{opt.label}</div>
                        <div className="text-xs text-muted truncate">{opt.description}</div>
                      </div>
                      <span className="text-[10px] text-muted shrink-0">{opt.meta?.role}</span>
                    </div>
                  )}
                  renderValue={(opt) => (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">{opt.meta?.initials}</AvatarFallback>
                      </Avatar>
                      <span>{opt.label}</span>
                    </div>
                  )}
                />
              </div>
              <p className="text-xs text-muted mt-2">Try typing "ann" or "qa" to filter by label or description.</p>
            </div>

            <Separator />

            <div>
              <SectionLabel>Inside a Dialog (portal + z-index check)</SectionLabel>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog with SearchableSelect</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Both selects should overlay the dialog backdrop without clipping.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Task name</label>
                      <Input placeholder="e.g. Refactor auth service" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Priority</label>
                        <SearchableSelect
                          value={dialogPriority}
                          onValueChange={setDialogPriority}
                          options={PRIORITY_OPTIONS}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Assignee</label>
                        <SearchableSelect
                          value={dialogAssignee}
                          onValueChange={setDialogAssignee}
                          options={MEMBER_OPTIONS}
                          placeholder="Select assignee"
                          clearable
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button>Create Task</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </section>

        {/* ── STATUS & FEEDBACK ─────────────────────────────────── */}
        <section>
          <SectionHeader icon={Activity} title="Status & Feedback" />
          <Card className="p-6 space-y-5">
            <div>
              <SectionLabel>Priority Badges</SectionLabel>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="urgent">Urgent</Badge>
                <Badge variant="high">High</Badge>
                <Badge variant="medium">Medium</Badge>
                <Badge variant="low">Low</Badge>
              </div>
            </div>
            <Separator />
            <div>
              <SectionLabel>Workflow Status</SectionLabel>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="backlog">Backlog</Badge>
                <Badge variant="todo">To Do</Badge>
                <Badge variant="in-progress">In Progress</Badge>
                <Badge variant="review">Review</Badge>
                <Badge variant="done">Done</Badge>
                <Badge variant="cancelled">Cancelled</Badge>
              </div>
            </div>
          </Card>
        </section>

        {/* ── TABLES & LISTS ────────────────────────────────────── */}
        <section>
          <SectionHeader icon={Table2} title="Tables & Lists" />
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Task Name', 'Assignee', 'Priority', 'Status', 'Action'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Fix CSS Grid overflow issue',   initials: 'JD', assignee: 'John Doe',  priority: 'high' as const,   status: 'in-progress' as const },
                  { name: 'Update API Documentation',      initials: 'AS', assignee: 'Anna Smith', priority: 'medium' as const, status: 'todo' as const },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted-subtle transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{row.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{row.initials}</AvatarFallback></Avatar>
                        <span className="text-muted-foreground">{row.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.priority}>{row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status}>{{ 'in-progress': 'In Progress', todo: 'To Do' }[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-muted hover:text-foreground transition-colors p-1 rounded">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* ── CARDS & LAYOUTS ───────────────────────────────────── */}
        <section>
          <SectionHeader icon={LayoutGrid} title="Cards & Layouts" />
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Active Sprints</p>
                <TrendingUp className="h-4 w-4 text-secondary" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-3">12</p>
              <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-secondary rounded-full" />
              </div>
              <p className="text-xs text-secondary mt-2 font-medium">↑ +2 from last week</p>
            </Card>

            <Card className="p-0 overflow-hidden flex">
              <div className="w-[140px] shrink-0 bg-foreground flex items-center justify-center">
                <div className="grid grid-cols-3 gap-0.5 p-3 opacity-60">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: ['#1a6fff', '#004395', '#0058be', '#eff5ff'][i % 4], opacity: 0.4 + (i % 3) * 0.2 }} />
                  ))}
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="open" className="text-[10px]">New Feature</Badge>
                  <span className="text-[10px] text-muted">v2.4 Release</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Advanced Velocity Insights</h3>
                <p className="text-xs text-muted leading-4 mb-3">
                  Track your team's momentum with our new real-time velocity engine.
                </p>
                <button className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Learn more <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </Card>

            <Card className="col-span-2 hover:bg-muted-subtle transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary-subtle flex items-center justify-center shrink-0">
                    <GitPullRequest className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Database migration</p>
                    <p className="text-xs text-muted">2 hours ago • PR #104</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted" />
              </div>
            </Card>
          </div>
        </section>

        {/* ── SPECIFIC CARDS ────────────────────────────────────── */}
        <section>
          <SectionHeader icon={BellRing} title="Specific Cards" />
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 border-l-4 border-l-warning">
              <div className="flex items-start justify-between mb-3">
                <Badge variant="high">High</Badge>
                <button className="text-muted hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Refactor Auth Service</h3>
              <p className="text-xs text-muted leading-4 mb-4">
                Clean up the legacy JWT implementation and migrate to the new Identity provider logic.
              </p>
              <div className="flex items-center justify-between">
                <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">JD</AvatarFallback></Avatar>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Oct 24</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 5</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-medium text-muted mb-0.5">#TKT-204</p>
                  <h3 className="text-sm font-semibold text-foreground">VPN Access Request</h3>
                </div>
                <Badge variant="open">Open</Badge>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Category', value: 'IT Support' },
                  { label: 'Requested by', value: 'Sarah L.' },
                  { label: 'Priority', value: null, badge: 'medium' as const },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted">{row.label}</span>
                    {row.badge
                      ? <Badge variant={row.badge}>{row.badge.charAt(0).toUpperCase() + row.badge.slice(1)}</Badge>
                      : <span className="font-medium text-foreground">{row.value}</span>}
                  </div>
                ))}
              </div>
              <Button className="w-full" size="sm">View Details</Button>
            </Card>
          </div>
        </section>

        {/* ── DIALOGS & MODALS ──────────────────────────────────── */}
        <section>
          <SectionHeader icon={Layers} title="Dialogs & Modals" />
          <Card className="p-6">
            <p className="text-xs text-muted mb-5">
              Reusable dialog built on Radix UI. Compose with{' '}
              <code className="font-mono text-[11px] bg-muted-subtle px-1 py-0.5 rounded text-primary">DialogContent</code>,{' '}
              <code className="font-mono text-[11px] bg-muted-subtle px-1 py-0.5 rounded text-primary">DialogHeader</code>, and{' '}
              <code className="font-mono text-[11px] bg-muted-subtle px-1 py-0.5 rounded text-primary">DialogFooter</code>.
            </p>

            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a new task to the current sprint. Fill in the details below.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Task name</label>
                      <Input placeholder="e.g. Refactor auth service" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Priority</label>
                        <Select defaultValue="medium">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Assignee</label>
                        <Select defaultValue="jd">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="jd">John Doe</SelectItem>
                            <SelectItem value="as">Anna Smith</SelectItem>
                            <SelectItem value="ar">Alex Rivera</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button>Create Task</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost"><Info className="h-4 w-4 mr-2" />Info Dialog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-8 w-8 rounded-full bg-primary-subtle flex items-center justify-center shrink-0">
                        <Info className="h-4 w-4 text-primary" />
                      </div>
                      <DialogTitle>Sprint Info</DialogTitle>
                    </div>
                    <DialogDescription>Sprint 14 runs from Oct 21 to Nov 4. 12 tasks are active with 3 in review.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild><Button className="w-full">Got it</Button></DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive"><AlertTriangle className="h-4 w-4 mr-2" />Delete Dialog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-8 w-8 rounded-full bg-danger-subtle flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-4 w-4 text-danger" />
                      </div>
                      <DialogTitle>Delete Task</DialogTitle>
                    </div>
                    <DialogDescription>This action cannot be undone. The task and all associated comments will be permanently removed.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button variant="destructive">Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-border pt-6 pb-4 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">TaskHub Design System</span>
          <span className="text-border-strong">•</span>
          <span>v1.2.0</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
          <a href="#" className="hover:text-foreground transition-colors">Release Notes</a>
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  )
}
