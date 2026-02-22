import { useState } from 'react';
import { Save, X } from 'lucide-react';

export function SaveProjectModal({
    defaultName,
    onSave,
    onClose,
}: {
    defaultName: string;
    onSave: (name: string) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(defaultName);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 mb-4">
                    <Save className="h-6 w-6 text-indigo-600" />
                    <h2 className="text-xl font-bold">Save Project</h2>
                </div>
                <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Project Name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 text-black"
                />
                <div className="flex gap-3">
                    <button
                        onClick={() => { onSave(name); onClose(); }}
                        disabled={!name.trim()}
                        className="flex-1 bg-indigo-600 text-white rounded-md py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Save to Cloud
                    </button>
                </div>
            </div>
        </div>
    );
}
