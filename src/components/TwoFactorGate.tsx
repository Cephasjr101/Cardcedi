import { useEffect, useRef, useState } from 'react'
import { KeyRound, Loader2, LogOut, ShieldCheck, Smartphone } from 'lucide-react'
import { trpc } from '@/providers/trpc'

/**
 * Two-factor gate for the admin console.
 * - `setup`    — first visit: pair an authenticator app (QR + manual secret)
 * - `challenge` — every new session: enter the current 6-digit code
 */
export function TwoFactorSetup({ onDone, onLogout }: { onDone: () => void; onLogout: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const begin = trpc.twofa.beginSetup.useMutation({ onError: (e) => setError(e.message) })
  const enable = trpc.twofa.enableSetup.useMutation({
    onSuccess: onDone,
    onError: (e) => setError(e.message),
  })
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    begin.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setup = begin.data

  return (
    <GateShell
      title="Lock down the console."
      subtitle="Two-factor authentication is required before anyone can touch trades or payouts. It takes one minute."
    >
      {begin.isPending && (
        <p className="flex items-center gap-3 font-sans text-[14.5px] text-cocoa">
          <Loader2 size={17} className="animate-spin" aria-hidden="true" /> Preparing your secret…
        </p>
      )}
      {setup && (
        <div className="space-y-5 text-left">
          <ol className="space-y-3 font-sans text-[14.5px] leading-relaxed text-espresso/90">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-espresso font-mono text-[12px] text-cream">1</span>
              <span>
                Open an authenticator app — Google Authenticator, Microsoft Authenticator,
                Authy or 1Password — and choose <strong>Add account</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-espresso font-mono text-[12px] text-cream">2</span>
              <span>Scan this code, or type the secret underneath it by hand:</span>
            </li>
          </ol>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 shadow-lift">
            <img src={setup.qrDataUrl} alt="Authenticator QR code" width={180} height={180} />
            <code className="select-all break-all text-center font-mono text-[13.5px] tracking-[0.14em] text-espresso">
              {setup.secret}
            </code>
          </div>
          <div>
            <label htmlFor="twofa-setup-code" className="field-label">
              Enter the 6-digit code the app shows
            </label>
            <CodeInput id="twofa-setup-code" value={code} onChange={setCode} />
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button
            type="button"
            disabled={enable.isPending || code.length !== 6}
            onClick={() => enable.mutate({ code })}
            className="btn-primary w-full"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            {enable.isPending ? 'Checking…' : 'Turn on two-factor'}
          </button>
          <p className="font-sans text-[12.5px] leading-snug text-cocoa">
            Keep the app safe — without it (or server access) the console stays locked.
          </p>
        </div>
      )}
      <LogoutButton onLogout={onLogout} />
    </GateShell>
  )
}

export function TwoFactorChallenge({ onDone, onLogout }: { onDone: () => void; onLogout: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const verify = trpc.twofa.verify.useMutation({
    onSuccess: onDone,
    onError: (e) => setError(e.message),
  })

  return (
    <GateShell
      title="Security check."
      subtitle="This console moves real money — enter the 6-digit code from your authenticator app to continue."
    >
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-3 rounded-2xl bg-espresso/5 px-4 py-3">
          <Smartphone size={18} className="shrink-0 text-espresso" aria-hidden="true" />
          <p className="font-sans text-[13.5px] text-cocoa">
            Open your authenticator app and look for the <strong>CardCedi</strong> entry.
          </p>
        </div>
        <div>
          <label htmlFor="twofa-code" className="field-label">6-digit code</label>
          <CodeInput id="twofa-code" value={code} onChange={setCode} autoFocus />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button
          type="button"
          disabled={verify.isPending || code.length !== 6}
          onClick={() => verify.mutate({ code })}
          className="btn-primary w-full"
        >
          <KeyRound size={16} aria-hidden="true" />
          {verify.isPending ? 'Verifying…' : 'Verify & continue'}
        </button>
      </div>
      <LogoutButton onLogout={onLogout} />
    </GateShell>
  )
}

function GateShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-md px-5 py-16 md:py-20">
      <div className="rounded-3xl border border-espresso/10 bg-white/60 p-7 text-center shadow-lift md:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-[26px] font-semibold tracking-tight text-espresso">{title}</h1>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-cocoa">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function CodeInput({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="field-line w-full text-center font-mono text-[22px] tracking-[0.5em]"
      placeholder="••••••"
    />
  )
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className="mx-auto mt-6 flex items-center gap-2 font-sans text-[13.5px] text-cocoa underline-offset-4 hover:text-espresso hover:underline"
    >
      <LogOut size={14} aria-hidden="true" /> Sign out instead
    </button>
  )
}
