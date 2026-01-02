import { useState, useCallback } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    addDays,
    isToday
} from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Bell, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { addEvent, updateEvent, deleteEvent } from '../../services/firebase';
import type { CalendarEvent } from '../../services/firebase';
import './Calendar.css';

const Calendar = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { events, eventsLoading: loading } = useData();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Form states
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventReminder, setEventReminder] = useState(true);

    // Generate calendar days
    const generateCalendarDays = useCallback(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start from Monday
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = startDate;

        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }

        return days;
    }, [currentMonth]);

    // Get events for a specific day
    const getEventsForDay = useCallback((date: Date) => {
        return events.filter(event => isSameDay(event.date, date));
    }, [events]);

    // Navigate months
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Handle day click
    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setEditingEvent(null);
        setEventTitle('');
        setEventDescription('');
        setEventReminder(true);
        setShowModal(true);
    };

    // Handle event click
    const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(event.date);
        setEditingEvent(event);
        setEventTitle(event.title);
        setEventDescription(event.description || '');
        setEventReminder(event.reminder || false);
        setShowModal(true);
    };

    // Save event
    const handleSaveEvent = async () => {
        if (!user || !selectedDate || !eventTitle.trim()) {
            showToast('error', 'Error', 'Judul event tidak boleh kosong');
            return;
        }

        try {
            if (editingEvent?.id) {
                await updateEvent(editingEvent.id, {
                    title: eventTitle.trim(),
                    description: eventDescription.trim(),
                    reminder: eventReminder
                });
                showToast('success', 'Event diperbarui!', eventTitle);
            } else {
                await addEvent({
                    title: eventTitle.trim(),
                    description: eventDescription.trim(),
                    date: selectedDate,
                    reminder: eventReminder,
                    userId: user.uid
                });
                showToast('success', 'Event ditambahkan!', `${eventTitle} - ${format(selectedDate, 'd MMMM yyyy', { locale: id })}`);
            }
            setShowModal(false);
        } catch {
            showToast('error', 'Gagal menyimpan event', 'Silakan coba lagi');
        }
    };

    // Delete event
    const handleDeleteEvent = async () => {
        if (!editingEvent?.id) return;

        try {
            await deleteEvent(editingEvent.id);
            showToast('info', 'Event dihapus', editingEvent.title);
            setShowModal(false);
        } catch {
            showToast('error', 'Gagal menghapus event', 'Silakan coba lagi');
        }
    };

    const days = generateCalendarDays();
    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    if (loading) {
        return (
            <div className="calendar-loading">
                <div className="loading-spinner"></div>
                <p>Memuat kalender...</p>
            </div>
        );
    }

    return (
        <div className="calendar-container animate-fade-in">
            {/* Header */}
            <div className="calendar-header">
                <button className="btn btn-ghost btn-icon" onClick={prevMonth}>
                    <ChevronLeft size={24} />
                </button>
                <h2 className="calendar-month-title">
                    {format(currentMonth, 'MMMM yyyy', { locale: id })}
                </h2>
                <button className="btn btn-ghost btn-icon" onClick={nextMonth}>
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Week days header */}
            <div className="calendar-weekdays">
                {weekDays.map(day => (
                    <div key={day} className="weekday">{day}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="calendar-grid">
                {days.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isDayToday = isToday(day);

                    return (
                        <div
                            key={index}
                            className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isDayToday ? 'today' : ''}`}
                            onClick={() => handleDayClick(day)}
                        >
                            <span className="day-number">{format(day, 'd')}</span>
                            <div className="day-events">
                                {dayEvents.slice(0, 2).map((event, idx) => (
                                    <div
                                        key={event.id || idx}
                                        className="event-dot"
                                        onClick={(e) => handleEventClick(event, e)}
                                        title={event.title}
                                    >
                                        {event.reminder && <Bell size={8} />}
                                    </div>
                                ))}
                                {dayEvents.length > 2 && (
                                    <span className="more-events">+{dayEvents.length - 2}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Today's events */}
            <div className="today-events glass-card">
                <h3>Event Hari Ini</h3>
                {getEventsForDay(new Date()).length === 0 ? (
                    <p className="text-muted text-sm">Tidak ada event hari ini</p>
                ) : (
                    <div className="event-list">
                        {getEventsForDay(new Date()).map(event => (
                            <div
                                key={event.id}
                                className="event-item"
                                onClick={(e) => handleEventClick(event, e)}
                            >
                                <div className="event-dot-indicator"></div>
                                <div className="event-info">
                                    <span className="event-title">{event.title}</span>
                                    {event.description && (
                                        <span className="event-desc">{event.description}</span>
                                    )}
                                </div>
                                {event.reminder && <Bell size={14} className="text-muted" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Event Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingEvent ? 'Edit Event' : 'Tambah Event'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-date">
                                {selectedDate && format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                            </div>

                            <div className="input-group">
                                <label className="input-label">Judul Event</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Masukkan judul event..."
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Deskripsi (Opsional)</label>
                                <textarea
                                    className="input"
                                    placeholder="Tambahkan deskripsi..."
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    rows={3}
                                    style={{ resize: 'none' }}
                                />
                            </div>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={eventReminder}
                                    onChange={(e) => setEventReminder(e.target.checked)}
                                />
                                <Bell size={16} />
                                <span>Ingatkan saya</span>
                            </label>
                        </div>
                        <div className="modal-footer">
                            {editingEvent && (
                                <button className="btn btn-ghost" onClick={handleDeleteEvent}>
                                    <Trash2 size={16} />
                                    Hapus
                                </button>
                            )}
                            <div style={{ flex: 1 }}></div>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveEvent}>
                                <Plus size={16} />
                                {editingEvent ? 'Simpan' : 'Tambah'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
