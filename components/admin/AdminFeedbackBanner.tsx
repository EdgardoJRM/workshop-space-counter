"use client";

export type AdminFeedback = {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

export function AdminFeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback: AdminFeedback | null;
  onDismiss?: () => void;
}) {
  if (!feedback) return null;

  const styles =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : feedback.type === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-sky-200 bg-sky-50 text-sky-900";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${styles}`}
    >
      <div>
        <p className="text-sm font-semibold">{feedback.title}</p>
        {feedback.message ? (
          <p className="mt-0.5 text-sm opacity-90">{feedback.message}</p>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold underline opacity-80"
        >
          Cerrar
        </button>
      ) : null}
    </div>
  );
}
