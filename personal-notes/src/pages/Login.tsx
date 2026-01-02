import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const { signIn } = useAuth();
    const handleLogin = async () => { try { await signIn(); } catch (e) { console.error(e); } };

    return (
        <div className="login-container">
            <div className="login-bg"><div className="bg-orb orb-1"></div><div className="bg-orb orb-2"></div><div className="bg-orb orb-3"></div></div>
            <div className="login-content animate-fade-in">
                <div className="login-logo"><span className="logo-icon">📝</span><h1>Personal Notes</h1></div>
                <p className="login-tagline">Kelola kalender, simpan password, dan chat dengan AI assistant dalam satu aplikasi.</p>
                <div className="login-features">
                    <div className="feature"><span className="feature-icon">📅</span><span>Kalender</span></div>
                    <div className="feature"><span className="feature-icon">🔐</span><span>Password</span></div>
                    <div className="feature"><span className="feature-icon">🤖</span><span>AI Assistant</span></div>
                    <div className="feature"><span className="feature-icon">🔗</span><span>Quick Links</span></div>
                </div>
                <button className="login-btn" onClick={handleLogin}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-icon" />
                    <span>Masuk dengan Google</span>
                </button>
                <p className="login-footer">Data kamu aman tersimpan di cloud ☁️</p>
            </div>
        </div>
    );
};

export default Login;
