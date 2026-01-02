import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Eye, EyeOff, Copy, Trash2, X, Key, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { addPassword, updatePassword, deletePassword } from '../../services/firebase';
import type { PasswordEntry } from '../../services/firebase';
import { encrypt, decrypt, generatePassword } from '../../services/encryption';
import './PasswordManager.css';

const PasswordManager = () => {
    const { user, encryptionKey } = useAuth();
    const { showToast } = useToast();
    const { passwords, passwordsLoading: loading } = useData();
    const [filteredPasswords, setFilteredPasswords] = useState<PasswordEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [formTitle, setFormTitle] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [showFormPassword, setShowFormPassword] = useState(false);

    useEffect(() => {
        if (!searchTerm.trim()) { setFilteredPasswords(passwords); }
        else { const lower = searchTerm.toLowerCase(); setFilteredPasswords(passwords.filter(p => p.title.toLowerCase().includes(lower) || p.username?.toLowerCase().includes(lower) || p.category?.toLowerCase().includes(lower))); }
    }, [searchTerm, passwords]);

    const decryptPassword = useCallback(async (enc: string) => { try { return await decrypt(enc, encryptionKey); } catch { showToast('error', 'Gagal'); return '***'; } }, [encryptionKey, showToast]);
    const toggleVis = (id: string) => { setVisiblePasswords(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    const copyPass = async (enc: string) => { try { const d = await decryptPassword(enc); await navigator.clipboard.writeText(d); showToast('success', 'Disalin!'); } catch { showToast('error', 'Gagal'); } };
    const openAdd = () => { setEditingPassword(null); setFormTitle(''); setFormUsername(''); setFormPassword(''); setFormCategory(''); setFormNotes(''); setShowFormPassword(false); setShowModal(true); };
    const openEdit = async (p: PasswordEntry) => { setEditingPassword(p); setFormTitle(p.title); setFormUsername(p.username || ''); setFormCategory(p.category || ''); setFormNotes(p.notes || ''); try { setFormPassword(await decryptPassword(p.encryptedPassword)); } catch { setFormPassword(''); } setShowFormPassword(false); setShowModal(true); };
    const genPass = () => { setFormPassword(generatePassword(16)); setShowFormPassword(true); showToast('info', 'Password dibuat!'); };
    const savePass = async () => { if (!user || !formTitle.trim() || !formPassword.trim()) { showToast('error', 'Error', 'Wajib diisi'); return; } try { const enc = await encrypt(formPassword, encryptionKey); if (editingPassword?.id) { await updatePassword(editingPassword.id, { title: formTitle.trim(), username: formUsername.trim() || undefined, encryptedPassword: enc, category: formCategory.trim() || undefined, notes: formNotes.trim() || undefined }); showToast('success', 'Diperbarui!'); } else { await addPassword({ title: formTitle.trim(), username: formUsername.trim() || undefined, encryptedPassword: enc, category: formCategory.trim() || undefined, notes: formNotes.trim() || undefined, userId: user.uid }); showToast('success', 'Disimpan!'); } setShowModal(false); } catch { showToast('error', 'Gagal'); } };
    const delPass = async () => { if (!editingPassword?.id) return; try { await deletePassword(editingPassword.id); showToast('info', 'Dihapus'); setShowModal(false); } catch { showToast('error', 'Gagal'); } };
    const PasswordDisplay = ({ entry }: { entry: PasswordEntry }) => { const [dec, setDec] = useState(''); const vis = visiblePasswords.has(entry.id!); useEffect(() => { if (vis && !dec) decryptPassword(entry.encryptedPassword).then(setDec); }, [vis, entry.encryptedPassword, dec]); return <span className="password-value">{vis ? dec || '...' : '••••••••'}</span>; };
    const cats = [...new Set(passwords.map(p => p.category).filter(Boolean))];

    if (loading) return <div className="password-loading"><div className="loading-spinner"></div><p>Memuat...</p></div>;

    return (
        <div className="password-container animate-fade-in">
            <div className="password-header"><h2 className="text-gradient">Password Manager</h2><button className="btn btn-primary" onClick={openAdd}><Plus size={18} />Tambah</button></div>
            <div className="search-container"><Search size={18} className="search-icon" /><input type="text" className="input search-input" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />{searchTerm && <button className="btn btn-ghost btn-icon search-clear" onClick={() => setSearchTerm('')}><X size={16} /></button>}</div>
            {cats.length > 0 && <div className="category-filter"><button className={`category-chip ${!searchTerm ? 'active' : ''}`} onClick={() => setSearchTerm('')}>Semua</button>{cats.map(cat => <button key={cat} className={`category-chip ${searchTerm === cat ? 'active' : ''}`} onClick={() => setSearchTerm(cat!)}>{cat}</button>)}</div>}
            <div className="password-list">
                {filteredPasswords.length === 0 ? <div className="password-empty glass-card text-center"><Key size={48} className="text-muted" /><p>Belum ada password</p><button className="btn btn-primary" onClick={openAdd}><Plus size={18} />Tambah</button></div> : filteredPasswords.map(p => (
                    <div key={p.id} className="password-card glass-card" onClick={() => openEdit(p)}>
                        <div className="password-card-header"><div className="password-icon"><Key size={20} /></div><div className="password-info"><h4>{p.title}</h4>{p.username && <span className="password-username">{p.username}</span>}</div>{p.category && <span className="password-category-tag">{p.category}</span>}</div>
                        <div className="password-card-body"><PasswordDisplay entry={p} /><div className="password-actions"><button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); toggleVis(p.id!); }}>{visiblePasswords.has(p.id!) ? <EyeOff size={18} /> : <Eye size={18} />}</button><button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); copyPass(p.encryptedPassword); }}><Copy size={18} /></button></div></div>
                    </div>
                ))}
            </div>
            {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><h3>{editingPassword ? 'Edit' : 'Tambah'} Password</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button></div><div className="modal-body"><div className="input-group"><label className="input-label">Judul *</label><input type="text" className="input" placeholder="Nama akun..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus /></div><div className="input-group"><label className="input-label">Username/Email</label><input type="text" className="input" placeholder="user@email.com" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} /></div><div className="input-group"><label className="input-label">Password *</label><div className="password-input-wrapper"><input type={showFormPassword ? 'text' : 'password'} className="input" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} /><button className="btn btn-ghost btn-icon password-toggle" onClick={() => setShowFormPassword(!showFormPassword)} type="button">{showFormPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button><button className="btn btn-ghost btn-icon password-generate" onClick={genPass} type="button"><RefreshCw size={18} /></button></div></div><div className="input-group"><label className="input-label">Kategori</label><input type="text" className="input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} list="cats" /><datalist id="cats">{cats.map(c => <option key={c} value={c!} />)}</datalist></div><div className="input-group"><label className="input-label">Catatan</label><textarea className="input" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} style={{ resize: 'none' }} /></div></div><div className="modal-footer">{editingPassword && <button className="btn btn-ghost" onClick={delPass}><Trash2 size={16} />Hapus</button>}<div style={{ flex: 1 }}></div><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button><button className="btn btn-primary" onClick={savePass}><Key size={16} />{editingPassword ? 'Simpan' : 'Tambah'}</button></div></div></div>}
        </div>
    );
};

export default PasswordManager;
