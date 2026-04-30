import type { Toast } from '../types/edify';

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.tone ?? 'info'}`} key={toast.id}>
          <strong>{toast.title}</strong>
          {toast.detail && <span>{toast.detail}</span>}
        </div>
      ))}
    </div>
  );
}
