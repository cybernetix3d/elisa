import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FolderOpen, X, Trash2 } from 'lucide-react';

export interface ProjectEntry {
    id: string;
    name: string;
    updated_at: string;
}

export function ProjectsModal({
    onClose,
    onLoad
}: {
    onClose: () => void,
    onLoad: (project: any, id: string) => void
}) {
    const [projects, setProjects] = useState<ProjectEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('projects')
            .select('id, name, updated_at')
            .order('updated_at', { ascending: false })
            .then(({ data }) => {
                if (data) setProjects(data);
                setLoading(false);
            });
    }, []);

    const handleOpen = async (id: string) => {
        const { data } = await supabase.from('projects').select('*').eq('id', id).single();
        if (data) {
            onLoad(data, id);
        }
        onClose();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project?')) {
            await supabase.from('projects').delete().eq('id', id);
            setProjects(projects.filter(p => p.id !== id));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 mb-6">
                    <FolderOpen className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-xl font-bold">Open Cloud Project</h2>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : projects.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No saved projects found.</p>
                    ) : (
                        <div className="space-y-2">
                            {projects.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleOpen(p.id)}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer group transition-colors"
                                >
                                    <div>
                                        <h3 className="font-medium text-gray-900">{p.name || 'Untitled Project'}</h3>
                                        <p className="text-xs text-gray-500">{new Date(p.updated_at).toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, p.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                                        title="Delete project"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
