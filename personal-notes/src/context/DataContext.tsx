import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToEvents, subscribeToPasswords } from '../services/firebase';
import type { CalendarEvent, PasswordEntry } from '../services/firebase';

interface DataContextType {
    events: CalendarEvent[];
    passwords: PasswordEntry[];
    eventsLoading: boolean;
    passwordsLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [passwordsLoading, setPasswordsLoading] = useState(true);

    // Use refs to track if we've subscribed already (prevents re-subscription)
    const eventsLoadedRef = useRef(false);
    const passwordsLoadedRef = useRef(false);

    // Subscribe to events and passwords once when user logs in
    useEffect(() => {
        if (!user) {
            setEvents([]);
            setPasswords([]);
            setEventsLoading(false);
            setPasswordsLoading(false);
            eventsLoadedRef.current = false;
            passwordsLoadedRef.current = false;
            return;
        }

        // Only set loading if not already loaded
        if (!eventsLoadedRef.current) {
            setEventsLoading(true);
        }
        if (!passwordsLoadedRef.current) {
            setPasswordsLoading(true);
        }

        const unsubEvents = subscribeToEvents(user.uid, (fetchedEvents) => {
            setEvents(fetchedEvents);
            setEventsLoading(false);
            eventsLoadedRef.current = true;
        });

        const unsubPasswords = subscribeToPasswords(user.uid, (fetchedPasswords) => {
            setPasswords(fetchedPasswords);
            setPasswordsLoading(false);
            passwordsLoadedRef.current = true;
        });

        return () => {
            unsubEvents();
            unsubPasswords();
        };
    }, [user]); // Only re-run when user changes!

    return (
        <DataContext.Provider value={{ events, passwords, eventsLoading, passwordsLoading }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
