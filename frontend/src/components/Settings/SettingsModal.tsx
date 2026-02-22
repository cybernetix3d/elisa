import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, X, Plus, Trash2 } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [model, setModel] = useState('claude-opus-4-6');
    const [envVarsList, setEnvVarsList] = useState<{ key: string; value: string }[]>([]);
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
                    .select('anthropic_api_key, vercel_token, preferred_model, app_env_vars')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error loading profile:', error);
                } else if (data) {
                    setApiKey(data.anthropic_api_key || '');
                    setVercelToken(data.vercel_token || '');
                    setModel(data.preferred_model || 'claude-opus-4-6');

                    const envObj = data.app_env_vars || {};
                    setEnvVarsList(
                        Object.entries(envObj).map(([k, v]) => ({ key: k, value: String(v) }))
                    );
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

            const appEnvVars = Object.fromEntries(
                envVarsList
                    .map(env => [env.key.trim(), env.value])
                    .filter(([k]) => k !== '')
            );

            const updates = {
                id: session.user.id,
                email: session.user.email,
                anthropic_api_key: apiKey,
                vercel_token: vercelToken,
                preferred_model: model,
                app_env_vars: appEnvVars,
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

                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    App Environment Variables
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setEnvVarsList([...envVarsList, { key: '', value: '' }])}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Row
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                                Provide generic environment variables (e.g. API keys) here to be injected securely into your deployed Vercel projects.
                            </p>

                            {envVarsList.length === 0 && (
                                <div className="text-sm text-gray-400 italic mb-2 text-center py-2 bg-gray-50 rounded border border-dashed border-gray-200">
                                    No environment variables defined.
                                </div>
                            )}

                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {envVarsList.map((env, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={env.key}
                                            onChange={(e) => {
                                                const copy = [...envVarsList];
                                                copy[i].key = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
                                                setEnvVarsList(copy);
                                            }}
                                            className="block w-2/5 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="KEY_NAME"
                                        />
                                        <input
                                            type="password"
                                            value={env.value}
                                            onChange={(e) => {
                                                const copy = [...envVarsList];
                                                copy[i].value = e.target.value;
                                                setEnvVarsList(copy);
                                            }}
                                            className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="Value"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setEnvVarsList(envVarsList.filter((_, idx) => idx !== i))}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
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
