export function ErrorPanel({ message, action }: { message: string, action?: React.ReactNode }) {
  return (
    <div className="w-full bg-surface border border-danger rounded-[10px] p-6 shadow-sm flex flex-col gap-4">
      <div className="flex gap-3">
        <svg className="w-6 h-6 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-text text-[0.9375rem] leading-relaxed">{message}</p>
      </div>
      {action && (
        <div className="ml-9">
          {action}
        </div>
      )}
    </div>
  );
}
