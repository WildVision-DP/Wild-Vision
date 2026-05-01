import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Activity,
    AlertCircle,
    Camera,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    MapPinned,
    ShieldCheck,
    TreePine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { apiRequest } from '@/config/api';

const fieldStats = [
    { label: 'Camera Network', value: 'Live', icon: Camera, tone: 'text-emerald-700 dark:text-emerald-300' },
    { label: 'Coverage Layer', value: 'Mapped', icon: MapPinned, tone: 'text-cyan-700 dark:text-cyan-300' },
    { label: 'Review Queue', value: 'Synced', icon: Activity, tone: 'text-amber-700 dark:text-amber-300' },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (result.error) {
                throw new Error(result.error);
            }

            if (!result.data) {
                throw new Error('Invalid response from server');
            }

            const response = result.data as any;
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--surface))_54%,hsl(var(--accent))_100%)] text-foreground">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#14532d,#0e7490,#b45309)]" />

            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
                <motion.section
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="hidden lg:block"
                >
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border bg-card/75 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Authorized forest operations
                        </div>

                        <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight tracking-tight text-foreground">
                            WildVision command access
                        </h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                            Monitor camera health, verify detections, and inspect coverage from one secure operations workspace.
                        </p>

                        <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                            {fieldStats.map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.12 + index * 0.08, duration: 0.38 }}
                                        className="rounded-lg border bg-card/78 p-4 shadow-sm backdrop-blur"
                                    >
                                        <Icon className={`h-5 w-5 ${stat.tone}`} />
                                        <p className="mt-4 text-sm font-semibold text-foreground">{stat.value}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.45 }}
                            className="mt-6 overflow-hidden rounded-lg border bg-card/80 shadow-sm backdrop-blur"
                        >
                            <div className="flex items-center justify-between border-b px-5 py-4">
                                <div>
                                    <p className="text-sm font-semibold">Field network snapshot</p>
                                    <p className="text-xs text-muted-foreground">Camera and verification surfaces ready after sign-in</p>
                                </div>
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4">
                                <div className="space-y-3">
                                    <div className="h-2 rounded-full bg-muted">
                                        <motion.div
                                            initial={{ width: '20%' }}
                                            animate={{ width: '82%' }}
                                            transition={{ duration: 1.2, ease: 'easeOut' }}
                                            className="h-2 rounded-full bg-emerald-600"
                                        />
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <motion.div
                                            initial={{ width: '18%' }}
                                            animate={{ width: '64%' }}
                                            transition={{ delay: 0.12, duration: 1.2, ease: 'easeOut' }}
                                            className="h-2 rounded-full bg-cyan-600"
                                        />
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <motion.div
                                            initial={{ width: '24%' }}
                                            animate={{ width: '47%' }}
                                            transition={{ delay: 0.24, duration: 1.2, ease: 'easeOut' }}
                                            className="h-2 rounded-full bg-amber-500"
                                        />
                                    </div>
                                </div>
                                <div className="rounded-md border bg-background/70 px-3 py-2 text-right">
                                    <p className="text-lg font-semibold tabular-nums">24/7</p>
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Monitoring</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="mx-auto w-full max-w-md"
                >
                    <div className="rounded-xl border bg-card/92 shadow-2xl shadow-emerald-950/10 backdrop-blur dark:shadow-black/30">
                        <div className="border-b px-6 py-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#14532d] text-white shadow-sm">
                                    <TreePine className="h-6 w-6" color="#ffffff" strokeWidth={2.4} />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold tracking-tight">WildVision</p>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Secure sign in</p>
                                </div>
                            </div>
                            <p className="mt-5 text-sm leading-6 text-muted-foreground">
                                Access camera operations, detection review, analytics, and field network controls.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="officer@forest.gov.in"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="h-11 pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <Label htmlFor="password">Password</Label>
                                    <span className="text-xs text-muted-foreground">Authorized users only</span>
                                </div>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="h-11 pl-10 pr-11"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPassword((current) => !current)}
                                        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
                                {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />}
                                {loading ? 'Signing in...' : 'Sign in to dashboard'}
                            </Button>
                        </form>

                        <div className="border-t px-6 py-4">
                            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                                <span>Forest Department of India</span>
                                <span>Protected workspace</span>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>
        </main>
    );
}
