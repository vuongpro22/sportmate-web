import React, { createContext, useContext, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ModalOptions {
  title?: string;
  message: string;
  type: 'alert' | 'confirm';
  severity: 'info' | 'success' | 'warning' | 'error';
  resolve: (value: boolean) => void;
}

interface ModalContextType {
  alert: (message: string, title?: string, severity?: 'info' | 'success' | 'warning' | 'error') => Promise<boolean>;
  confirm: (message: string, title?: string, severity?: 'info' | 'success' | 'warning' | 'error') => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [animateShow, setAnimateShow] = useState(false);

  // Handle opening animation
  useEffect(() => {
    if (modal) {
      // Small timeout to allow transition class to register
      const timer = setTimeout(() => setAnimateShow(true), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimateShow(false);
    }
  }, [modal]);

  // Key event listeners for accessibility (Enter to confirm, Escape to cancel)
  useEffect(() => {
    if (!modal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal]);

  const alertFn = (
    message: string,
    title?: string,
    severity: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setModal({
        title,
        message,
        type: 'alert',
        severity,
        resolve,
      });
    });
  };

  const confirmFn = (
    message: string,
    title?: string,
    severity: 'info' | 'success' | 'warning' | 'error' = 'warning'
  ): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setModal({
        title,
        message,
        type: 'confirm',
        severity,
        resolve,
      });
    });
  };

  const handleClose = (value: boolean) => {
    if (!modal) return;
    setAnimateShow(false);
    // Wait for animation transition to finish before destroying modal object
    setTimeout(() => {
      modal.resolve(value);
      setModal(null);
    }, 200);
  };

  const getSeverityStyles = (severity: 'info' | 'success' | 'warning' | 'error') => {
    switch (severity) {
      case 'success':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          btn: 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500/50 shadow-emerald-500/10',
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-400" />,
          defaultTitle: 'Thành công',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          btn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/50 shadow-amber-500/10',
          icon: <AlertTriangle className="h-6 w-6 text-amber-400" />,
          defaultTitle: 'Xác nhận',
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/20 text-red-400',
          btn: 'bg-red-500 hover:bg-red-600 focus:ring-red-500/50 shadow-red-500/10',
          icon: <AlertCircle className="h-6 w-6 text-red-400" />,
          defaultTitle: 'Lỗi',
        };
      case 'info':
      default:
        return {
          bg: 'bg-primary/10 border-primary/20 text-primary',
          btn: 'bg-primary hover:bg-primary-hover focus:ring-primary/50 shadow-primary/10',
          icon: <Info className="h-6 w-6 text-primary" />,
          defaultTitle: 'Thông báo',
        };
    }
  };

  const currentStyles = modal ? getSeverityStyles(modal.severity) : null;

  return (
    <ModalContext.Provider value={{ alert: alertFn, confirm: confirmFn }}>
      {children}

      {/* Modal Overlay DOM */}
      {modal && currentStyles && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs transition-opacity duration-200 ease-out ${
            animateShow ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div
            className={`w-full max-w-sm bg-darkCard border border-darkBorder rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 transition-all duration-200 ease-out transform ${
              animateShow ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-2 opacity-0'
            }`}
          >
            {/* Visual Icon Header */}
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${currentStyles.bg}`}>
              {currentStyles.icon}
            </div>

            {/* Title & Message */}
            <div className="space-y-1.5 w-full">
              <h3 className="text-base font-black text-white tracking-wide">
                {modal.title || currentStyles.defaultTitle}
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap px-1">
                {modal.message}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-3 w-full mt-2">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 bg-darkBg border border-darkBorder hover:border-gray-700 active:scale-98 text-gray-400 hover:text-white py-3 rounded-2xl text-xs font-bold transition-all duration-200 focus:outline-none"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className={`flex-1 text-white py-3 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-98 shadow-lg focus:outline-none focus:ring-2 ${currentStyles.btn}`}
                  >
                    Xác nhận
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`w-full text-white py-3 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-98 shadow-lg focus:outline-none focus:ring-2 ${currentStyles.btn}`}
                >
                  Đồng ý
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
