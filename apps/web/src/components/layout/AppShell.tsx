import { type CSSProperties, type ReactNode, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Bell,
    Camera,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    FileText,
    Home,
    LayoutDashboard,
    LogOut,
    Map,
    MapPin,
    RefreshCw,
    Search,
    Shield,
    TreePine,
    UploadCloud,
    Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import { MobileNav } from './MobileNav';
import { PageChromeProvider, usePageChrome, type PageChrome } from './page-chrome';
import { type NavGroup, SidebarNav } from './SidebarNav';

interface StoredUser {
    fullName?: string;
    email?: string;
    role?: string;
}

const navGroups: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Verification',
        items: [
            { title: 'Review Queue', href: '/admin/review', icon: ClipboardCheck },
            { title: 'Upload Data', href: '/upload', icon: UploadCloud },
            { title: 'Activity Log', href: '/activity-log', icon: FileText },
        ],
    },
    {
        label: 'Field Network',
        items: [
            { title: 'Cameras', href: '/cameras', icon: Camera },
            { title: 'Wildlife Map', href: '/map', icon: Map },
            { title: 'Areas', href: '/geography', icon: MapPin },
        ],
    },
    {
        label: 'Reports',
        items: [
            { title: 'Analytics', href: '/analytics', icon: BarChart3 },
        ],
    },
    {
        label: 'Administration',
        items: [
            { title: 'Users', href: '/users', icon: Users },
        ],
    },
];

const routeChrome: Record<string, PageChrome & { section: string; workspace: WorkspaceVariant }> = {
    '/dashboard': {
        title: 'Overview',
        description: 'Live operating picture for camera health, detections, and review demand.',
        section: 'Overview',
        workspace: 'dashboard',
    },
    '/admin/review': {
        title: 'Review Queue',
        description: 'Inspect low-confidence and pending detections with the audit trail in context.',
        section: 'Verification',
        workspace: 'review',
    },
    '/upload': {
        title: 'Upload Data',
        description: 'Batch image intake, model validation, and manual review grouping.',
        section: 'Verification',
        workspace: 'upload',
    },
    '/activity-log': {
        title: 'Activity Log',
        description: 'Search, filter, and export historical animal detections.',
        section: 'Verification',
        workspace: 'table',
    },
    '/cameras': {
        title: 'Cameras',
        description: 'Manage the camera network, status, location, and maintenance workflow.',
        section: 'Field Network',
        workspace: 'table',
    },
    '/map': {
        title: 'Wildlife Map',
        description: 'Operational map for camera coverage, detections, and field geography.',
        section: 'Field Network',
        workspace: 'map',
    },
    '/geography': {
        title: 'Geography',
        description: 'Maintain circles, divisions, ranges, and beats.',
        section: 'Field Network',
        workspace: 'form',
    },
    '/analytics': {
        title: 'Analytics',
        description: 'Track verification trends, camera performance, and report outputs.',
        section: 'Reports',
        workspace: 'analytics',
    },
    '/users': {
        title: 'Users',
        description: 'Manage officers, administrators, roles, and access.',
        section: 'Administration',
        workspace: 'table',
    },
};

type WorkspaceVariant = 'dashboard' | 'review' | 'upload' | 'table' | 'map' | 'analytics' | 'form';

function getRouteChrome(pathname: string) {
    return routeChrome[pathname] ?? {
        title: 'Workspace',
        description: 'WildVision operations workspace.',
        section: 'Operations',
        workspace: 'dashboard' as WorkspaceVariant,
    };
}

function getStoredUser(): StoredUser {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
}

function getInitials(name?: string) {
    if (!name) return 'WV';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'WV';
}

function getRoleTone(role?: string) {
    switch (role) {
        case 'System Admin':
            return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200';
        case 'Admin':
            return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200';
        case 'Range Officer':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
        case 'Divisional Officer':
        case 'Beat Officer':
            return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
        default:
            return 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-200';
    }
}

function getWorkspaceClass(variant: WorkspaceVariant) {
    const base = 'min-h-[calc(100vh-4rem)] min-w-0';

    switch (variant) {
        case 'map':
            return cn(base, 'px-3 py-3 sm:px-5 sm:py-5 lg:px-6');
        case 'review':
            return cn(base, 'px-4 py-5 sm:px-6 lg:px-8');
        case 'dashboard':
        case 'analytics':
            return cn(base, 'px-4 py-5 sm:px-6 lg:px-8 2xl:px-10');
        case 'upload':
        case 'table':
            return cn(base, 'px-4 py-5 sm:px-6 lg:px-8');
        case 'form':
            return cn(base, 'mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8');
        default:
            return cn(base, 'px-4 py-5 sm:px-6 lg:px-8');
    }
}

function ShellBrand({ collapsed }: { collapsed: boolean }) {
    if (collapsed) {
        return (
            <div
                className="flex h-12 w-12 items-center justify-center rounded-lg border shadow-md ring-2"
                style={{
                    backgroundColor: '#d1fae5',
                    borderColor: '#6ee7b7',
                    color: '#064e3b',
                    '--tw-ring-color': 'rgb(110 231 183 / 0.18)',
                } as CSSProperties}
                title="WildVision"
                aria-label="WildVision"
            >
                <div className="flex flex-col items-center leading-none" style={{ color: '#064e3b' }}>
                    <TreePine className="h-5 w-5" color="#064e3b" strokeWidth={2.5} />
                    <span className="mt-0.5 text-[11px] font-bold" style={{ color: '#064e3b' }}>WV</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md shadow-sm"
                style={{ backgroundColor: '#14532d', color: '#ffffff' }}
            >
                <TreePine className="h-5 w-5" color="#ffffff" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight text-foreground">WildVision</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Forest Operations</p>
            </div>
        </div>
    );
}

function TopMenuBar({
    groups,
    user,
    onLogout,
}: {
    groups: NavGroup[];
    user: StoredUser;
    onLogout: () => void;
}) {
    const chrome = usePageChrome();

    return (
        <header className="sticky top-0 z-30 border-b bg-card/92 backdrop-blur-xl supports-[backdrop-filter]:bg-card/78">
            <div className="flex min-h-16 items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
                <MobileNav groups={groups} />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Home className="h-3.5 w-3.5" />
                        <span>WildVision</span>
                        {chrome?.eyebrow && (
                            <>
                                <span>/</span>
                                <span className="truncate">{chrome.eyebrow}</span>
                            </>
                        )}
                    </div>
                    <div className="mt-1 flex min-w-0 flex-col gap-1 xl:flex-row xl:items-end xl:gap-3">
                        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                            {chrome?.title || 'Workspace'}
                        </h1>
                    </div>
                    {chrome?.badges && <div className="mt-2 flex flex-wrap items-center gap-2 xl:hidden">{chrome.badges}</div>}
                </div>

                <button
                    type="button"
                    className="hidden h-10 min-w-[18rem] items-center gap-2 rounded-md border bg-background/80 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground xl:flex"
                    aria-label="Search WildVision"
                >
                    <Search className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">Search cameras, detections, reports...</span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Ctrl K</kbd>
                </button>

                {chrome?.badges && <div className="hidden max-w-sm flex-wrap items-center justify-end gap-2 xl:flex">{chrome.badges}</div>}
                {chrome?.actions && <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 md:flex">{chrome.actions}</div>}

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.reload()}
                    aria-label="Refresh current page"
                    className="hidden sm:inline-flex"
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="hidden sm:inline-flex">
                    <Bell className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10 gap-3 px-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                                    {getInitials(user.fullName)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden min-w-0 text-left 2xl:block">
                                <span className="block max-w-40 truncate text-sm font-medium">
                                    {user.fullName || 'User'}
                                </span>
                                <span className="block max-w-40 truncate text-xs text-muted-foreground">
                                    {user.role || 'Field user'}
                                </span>
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>
                            <div className="space-y-1">
                                <p className="truncate text-sm font-medium">{user.fullName || 'User'}</p>
                                {user.email && <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1">
                            <Badge variant="outline" className={getRoleTone(user.role)}>
                                <Shield className="mr-1 h-3 w-3" />
                                {user.role || 'User'}
                            </Badge>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                            <LogOut className="h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

function SidebarFooter({
    collapsed,
    user,
    onLogout,
}: {
    collapsed: boolean;
    user: StoredUser;
    onLogout: () => void;
}) {
    return (
        <div className={cn('space-y-3 border-t p-4', collapsed && 'px-3')}>
            {!collapsed && (
                <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">System Status</p>
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        Online
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">v0.2.0 Beta</p>
                </div>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn('h-auto w-full justify-start gap-3 px-2 py-2', collapsed && 'justify-center px-0')}
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                                {getInitials(user.fullName)}
                            </AvatarFallback>
                        </Avatar>
                        {!collapsed && (
                            <span className="min-w-0 text-left">
                                <span className="block truncate text-sm font-medium">{user.fullName || 'User'}</span>
                                <span className="block truncate text-xs text-muted-foreground">{user.role || 'Field user'}</span>
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right" className="w-64">
                    <DropdownMenuLabel>{user.fullName || 'User'}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getStoredUser();
    const route = getRouteChrome(location.pathname);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const defaultChrome = useMemo<PageChrome>(
        () => ({
            title: route.title,
            description: route.description,
            eyebrow: route.section,
        }),
        [route.description, route.section, route.title]
    );

    const handleLogout = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
    };

    return (
        <TooltipProvider delayDuration={120}>
            <PageChromeProvider defaultChrome={defaultChrome} resetKey={location.pathname}>
                <div className="min-h-screen bg-background text-foreground">
                    <aside
                        className={cn(
                            'fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card/95 text-foreground shadow-xl backdrop-blur-xl transition-[width] duration-200 sm:flex',
                            sidebarCollapsed ? 'w-[76px]' : 'w-[276px]'
                        )}
                    >
                        <div className={cn('flex h-16 items-center border-b px-4', sidebarCollapsed && 'justify-center px-3')}>
                            <ShellBrand collapsed={sidebarCollapsed} />
                        </div>
                        <div className={cn('flex items-center border-b py-2', sidebarCollapsed ? 'justify-center px-0' : 'justify-end px-3')}>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSidebarCollapsed((current) => !current)}
                                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                className="h-8 w-8"
                            >
                                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                            </Button>
                        </div>
                        <ScrollArea className="flex-1 px-3 py-5">
                            <SidebarNav groups={navGroups} collapsed={sidebarCollapsed} />
                        </ScrollArea>
                        <SidebarFooter collapsed={sidebarCollapsed} user={user} onLogout={handleLogout} />
                    </aside>

                    <div
                        className={cn(
                            'min-h-screen transition-[padding-left] duration-200',
                            sidebarCollapsed ? 'sm:pl-[76px]' : 'sm:pl-[276px]'
                        )}
                    >
                        <TopMenuBar groups={navGroups} user={user} onLogout={handleLogout} />
                        <main className={getWorkspaceClass(route.workspace)}>
                            <Outlet />
                        </main>
                    </div>
                    <Toaster richColors position="top-right" />
                </div>
            </PageChromeProvider>
        </TooltipProvider>
    );
}
