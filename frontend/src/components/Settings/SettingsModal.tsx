import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [model, setModel] = useState('claude-opus-4-6');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        async function loadProfile() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return;

                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('anthropic_api_key, vercel_token, preferred_model')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error loading profile:', error);
                } else if (data) {
                    setApiKey(data.anthropic_api_key || '');
                    setVercelToken(data.vercel_token || '');
                    setModel(data.preferred_model || 'claude-opus-4-6');
                }
            } catch (err) {
                console.error('Exception loading profile', err);
            } finally {
                setIsLoading(false);
            }
        }

        loadProfile();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('Not authenticated');

            const updates = {
                id: session.user.id,
                email: session.user.email,
                anthropic_api_key: apiKey,
                vercel_token: vercelToken,
                preferred_model: model,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_profiles')
                .upsert(updates);

            if (error) throw error;

            setMessage({ text: 'Settings saved successfully', type: 'success' });
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            setMessage({ text: err.message || 'Error saving settings', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        onClose();
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 mb-6 text-gray-800">
                    <Settings className="h-6 w-6" />
                    <h2 className="text-2xl font-bold">Settings</h2>
                </div>

                {message && (
                    <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                {isLoading ? (
                    <div className="py-8 text-center text-gray-500">Loading profile...</div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Anthropic API Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="sk-ant-..."
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Your key is stored in your personal profile and used only for your agent sessions.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Preferred Claude Model</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="claude-opus-4-6">Claude Opus 4.6</option>
                                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vercel Deployment Token</label>
                            <input
                                type="password"
                                value={vercelToken}
                                onChange={(e) => setVercelToken(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Optional, for cloud deployments"
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>

                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex-1 justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                Sign Out
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
