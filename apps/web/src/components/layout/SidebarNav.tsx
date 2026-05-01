import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navIconColor = 'var(--sidebar-nav-icon, #14532d)';
const navIconActiveColor = 'var(--sidebar-nav-icon-active, #f8fafc)';
const navActiveBg = 'var(--sidebar-nav-active-bg, #14532d)';

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

interface SidebarNavProps {
    groups: NavGroup[];
    collapsed?: boolean;
}

export function SidebarNav({ groups, collapsed = false }: SidebarNavProps) {
    return (
        <nav className={cn('space-y-6', collapsed && 'space-y-5')}>
            {groups.map((group) => (
                <div key={group.label} className="space-y-2">
                    {collapsed ? (
                        <div className="mx-auto h-px w-8 bg-border" aria-hidden="true" />
                    ) : (
                        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.label}
                        </p>
                    )}
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            if (collapsed) {
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <NavLink
                                                to={item.href}
                                                aria-label={item.title}
                                                className="mx-auto flex h-10 w-10 items-center justify-center rounded-md"
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        <span
                                                            className={cn(
                                                                'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                                                                !isActive && 'hover:bg-[var(--sidebar-nav-hover-bg,#ecfdf5)]'
                                                            )}
                                                            style={{
                                                                backgroundColor: isActive ? navActiveBg : 'transparent',
                                                            }}
                                                        >
                                                            <Icon
                                                                className="h-5 w-5 shrink-0"
                                                                color={isActive ? navIconActiveColor : navIconColor}
                                                                stroke={isActive ? navIconActiveColor : navIconColor}
                                                                strokeWidth={2.45}
                                                            />
                                                        </span>
                                                        <span className="sr-only">{item.title}</span>
                                                    </>
                                                )}
                                            </NavLink>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">{item.title}</TooltipContent>
                                    </Tooltip>
                                );
                            }

                            const link = (
                                <NavLink
                                    to={item.href}
                                    className={({ isActive }) =>
                                        cn(
                                            'group relative flex h-10 items-center rounded-md text-sm font-medium transition-colors',
                                            'gap-3 px-3',
                                            isActive
                                                ? 'bg-[#14532d] text-white shadow-sm'
                                                : 'text-slate-700 hover:bg-emerald-50 hover:text-[#064e3b] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground'
                                        )
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon
                                                className="h-4 w-4 shrink-0"
                                                color={isActive ? '#ffffff' : '#14532d'}
                                                strokeWidth={2.35}
                                            />
                                            <span className="truncate" style={{ color: isActive ? '#ffffff' : undefined }}>
                                                {item.title}
                                            </span>
                                        </>
                                    )}
                                </NavLink>
                            );

                            return <div key={item.href}>{link}</div>;
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
