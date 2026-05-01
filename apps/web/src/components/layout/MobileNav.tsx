import { NavLink } from 'react-router-dom';
import { Menu, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { NavGroup } from './SidebarNav';
import { cn } from '@/lib/utils';

interface MobileNavProps {
    groups: NavGroup[];
}

export function MobileNav({ groups }: MobileNavProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open navigation">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-80 max-w-[85vw] flex-col p-0">
                <SheetHeader className="border-b px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <TreePine className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-left">
                            <SheetTitle>WildVision</SheetTitle>
                            <p className="text-xs font-medium uppercase tracking-wide text-primary">Forest Operations</p>
                        </div>
                    </div>
                </SheetHeader>
                <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                    {groups.map((group) => (
                        <div key={group.label} className="space-y-2">
                            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {group.label}
                            </p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <SheetClose key={item.href} asChild>
                                            <NavLink
                                                to={item.href}
                                                className={({ isActive }) =>
                                                    cn(
                                                        'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                                                        isActive
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                    )
                                                }
                                            >
                                                <Icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </NavLink>
                                        </SheetClose>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="border-t px-5 py-4">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        System online
                    </Badge>
                </div>
            </SheetContent>
        </Sheet>
    );
}
