import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, logOut } from '../services/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    encryptionKey: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Use user's UID as base for encryption key (combined with a salt)
    const encryptionKey = user ? `${user.uid}_personal_notes_v1` : '';

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const signOutUser = async () => {
        try {
            await logOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signOut: signOutUser,
            encryptionKey
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
