import { useEffect, useState } from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { applyTheme, getStoredTheme, type ThemeMode } from '@/lib/theme';

const options: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
];

export function ThemeToggle() {
    const [theme, setTheme] = useState<ThemeMode>('system');

    useEffect(() => {
        const stored = getStoredTheme();
        setTheme(stored);
        applyTheme(stored);

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (getStoredTheme() === 'system') applyTheme('system');
        };
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    const CurrentIcon = options.find((option) => option.value === theme)?.icon ?? Laptop;

    const updateTheme = (nextTheme: ThemeMode) => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Change theme">
                    <CurrentIcon className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((option) => {
                    const Icon = option.icon;
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => updateTheme(option.value)}
                            className={theme === option.value ? 'bg-accent text-accent-foreground' : undefined}
                        >
                            <Icon className="h-4 w-4" />
                            {option.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
