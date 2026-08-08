import React from 'react';
import { Bell, CheckCheck, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { markAllAsRead, closeNotificationPanel } from '@/redux/slices/notificationSlice';

const typeConfig = {
  info: { icon: <Info className="w-4 h-4" />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  success: { icon: <CheckCircle className="w-4 h-4" />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  error: { icon: <AlertCircle className="w-4 h-4" />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

const NotificationPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications, isOpen, unreadCount } = useAppSelector((state) => state.notifications);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => dispatch(closeNotificationPanel())}
      />

      {/* Panel */}
      <div
        className="fixed right-4 top-10 w-80 max-h-96 flex flex-col rounded-xl z-50 overflow-hidden animate-slide-up"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--accent-gold)', color: '#1a1000' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                className="p-1 rounded-lg text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => dispatch(markAllAsRead())}
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => dispatch(closeNotificationPanel())}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No notifications
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const config = typeConfig[notif.notification_type] || typeConfig.info;
              return (
                <div
                  key={notif.id}
                  className="flex gap-3 p-4 transition-colors cursor-pointer"
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: notif.is_read ? 'transparent' : 'rgba(201, 151, 58, 0.03)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: config.bg, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {notif.title}
                    </div>
                    <div
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {notif.message}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                      style={{ background: 'var(--accent-gold)' }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
