import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        console.log('Login: Starting with email:', email);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            console.log('Login: Response status:', response.status);
            console.log('Login: Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Login: Error response:', errorText);
                let errorMessage = 'Login failed';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || 'Login failed';
                } catch {
                    errorMessage = errorText || 'Login failed';
                }
                throw new Error(errorMessage);
            }

            const responseText = await response.text();
            console.log('Login: Raw response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Login: Parsed data:', data);
            } catch (parseError) {
                console.error('Login: JSON parse error:', parseError);
                throw new Error('Invalid response from server');
            }

            // Store tokens
            console.log('Login: Storing tokens...');
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            console.log('Login: Success, redirecting...');
            // Redirect to dashboard
            window.location.href = '/dashboard';
        } catch (err) {
            console.error('Login: Error:', err);
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-3xl">🐅</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">WildVision</CardTitle>
                    <CardDescription className="text-center">
                        Wildlife Surveillance & Movement Analytics Platform
                    </CardDescription>
                </CardHeader>
                <CardContent>                    {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="officer@forest.gov.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        <p>Forest Department of India</p>
                        <p className="text-xs mt-1">Authorized Personnel Only</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
