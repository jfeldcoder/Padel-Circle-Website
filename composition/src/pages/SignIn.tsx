import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col justify-center px-6 max-w-md mx-auto">
      <h1 className="font-display text-4xl font-medium">Composition</h1>
      <p className="text-muted mt-2 text-sm">A quiet journal for the body.</p>

      {sent ? (
        <div className="card p-6 mt-10">
          <p className="text-sm">
            Check your email — we sent a sign-in link to{" "}
            <span className="font-medium">{email}</span>.
          </p>
          <button
            className="mt-4 text-accent text-sm font-medium"
            onClick={() => setSent(false)}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="mt-10 space-y-3">
          <input
            className="field"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-over text-sm">{error}</p>}
          <button className="btn-primary" type="submit" disabled={busy || !email.trim()}>
            {busy ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}
