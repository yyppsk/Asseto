export function AdminFeedback({ error, status }) {
  if (!status && !error) {
    return null;
  }

  return (
    <div className="admin-feedback-strip">
      {status ? <p role="status">{status}</p> : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
    </div>
  );
}
