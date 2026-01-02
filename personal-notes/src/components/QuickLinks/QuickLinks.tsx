import { ExternalLink, BookOpen, Languages, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import './QuickLinks.css';

interface QuickLink {
    id: string;
    name: string;
    url: string;
    icon?: string;
    color?: string;
}

const defaultLinks: QuickLink[] = [
    {
        id: 'bunpo',
        name: 'Belajar Bunpo',
        url: 'https://bunpo.vercel.app',
        icon: '📚',
        color: '#6366f1'
    },
    {
        id: 'hiragana',
        name: 'Hiragana Katakana',
        url: 'https://hiragana-katakana.vercel.app',
        icon: 'あ',
        color: '#8b5cf6'
    },
    {
        id: 'kanji',
        name: 'Belajar Kanji',
        url: 'https://kanji.vercel.app',
        icon: '漢',
        color: '#ec4899'
    }
];

const QuickLinks = () => {
    const [links, setLinks] = useState<QuickLink[]>(() => {
        const saved = localStorage.getItem('quickLinks');
        return saved ? JSON.parse(saved) : defaultLinks;
    });

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [newLink, setNewLink] = useState({ name: '', url: '' });

    // Save links to localStorage
    const saveLinks = (updatedLinks: QuickLink[]) => {
        localStorage.setItem('quickLinks', JSON.stringify(updatedLinks));
        setLinks(updatedLinks);
    };

    // Add new link
    const handleAddLink = () => {
        if (!newLink.name.trim() || !newLink.url.trim()) return;

        const link: QuickLink = {
            id: `link-${Date.now()}`,
            name: newLink.name.trim(),
            url: newLink.url.startsWith('http') ? newLink.url : `https://${newLink.url}`,
            icon: '🔗',
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        };

        saveLinks([...links, link]);
        setNewLink({ name: '', url: '' });
        setShowModal(false);
    };

    // Delete link
    const handleDeleteLink = (id: string) => {
        saveLinks(links.filter(link => link.id !== id));
    };

    // Open link
    const openLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="quicklinks-container animate-fade-in">
            {/* Header */}
            <div className="quicklinks-header">
                <div>
                    <h2 className="text-gradient">Quick Links</h2>
                    <p className="text-muted text-sm">Akses cepat ke aplikasi favorit</p>
                </div>
                <div className="quicklinks-actions">
                    <button
                        className={`btn btn-ghost btn-icon ${editMode ? 'active' : ''}`}
                        onClick={() => setEditMode(!editMode)}
                        title="Edit mode"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        className="btn btn-primary btn-icon"
                        onClick={() => setShowModal(true)}
                        title="Tambah link"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Links Grid */}
            <div className="quicklinks-grid">
                {links.map(link => (
                    <div
                        key={link.id}
                        className="quicklink-card glass-card"
                        onClick={() => !editMode && openLink(link.url)}
                        style={{ '--link-color': link.color } as React.CSSProperties}
                    >
                        {editMode && (
                            <button
                                className="quicklink-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLink(link.id);
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                        <div className="quicklink-icon">
                            {link.icon || <BookOpen size={24} />}
                        </div>
                        <div className="quicklink-info">
                            <h4>{link.name}</h4>
                            <span className="quicklink-url">
                                <ExternalLink size={12} />
                                {new URL(link.url).hostname}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Add New Link Card */}
                <div
                    className="quicklink-card add-card glass-card"
                    onClick={() => setShowModal(true)}
                >
                    <div className="quicklink-icon add-icon">
                        <Plus size={24} />
                    </div>
                    <div className="quicklink-info">
                        <h4>Tambah Link</h4>
                        <span className="quicklink-url">Shortcut baru</span>
                    </div>
                </div>
            </div>

            {/* Japanese Learning Section */}
            <div className="quicklinks-section glass-card">
                <div className="section-header">
                    <Languages size={20} />
                    <h3>Belajar Bahasa Jepang</h3>
                </div>
                <p className="text-muted text-sm">
                    Koleksi aplikasi untuk belajar bahasa Jepang. Klik untuk membuka di tab baru.
                </p>
                <div className="section-links">
                    <button
                        className="section-link-btn"
                        onClick={() => openLink('https://bunpo.vercel.app')}
                    >
                        <span className="link-emoji">📚</span>
                        <span>Bunpo (Tata Bahasa)</span>
                        <ExternalLink size={14} />
                    </button>
                    <button
                        className="section-link-btn"
                        onClick={() => openLink('https://hiragana-katakana.vercel.app')}
                    >
                        <span className="link-emoji">あ</span>
                        <span>Hiragana & Katakana</span>
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>

            {/* Add Link Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tambah Quick Link</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label className="input-label">Nama</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="cth: My Portfolio"
                                    value={newLink.name}
                                    onChange={(e) => setNewLink(prev => ({ ...prev, name: e.target.value }))}
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">URL</label>
                                <input
                                    type="url"
                                    className="input"
                                    placeholder="https://example.com"
                                    value={newLink.url}
                                    onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddLink}
                                disabled={!newLink.name.trim() || !newLink.url.trim()}
                            >
                                <Plus size={16} />
                                Tambah
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuickLinks;
