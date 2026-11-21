import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  RotateCcw,
  X,
} from 'lucide-react'
import GiftCardArt from '../components/GiftCardArt'
import Odometer from '../components/Odometer'
import {
  CARD_BRANDS,
  PAYOUT_NETWORKS,
  findBrand,
  payoutFor,
  ghsFromPesewas,
  maskPhone,
} from '../lib/data'
import { trpc } from '@/providers/trpc'
import { usePageTitle } from '../hooks/usePageTitle'

const STEPS = ['Card', 'Details', 'Payout', 'Review'] as const

type Errors = Partial<Record<'amount' | 'code' | 'phone' | 'name', string>>

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const
type ImageType = (typeof IMAGE_TYPES)[number]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('Could not read that photo — try another one.'))
    r.readAsDataURL(file)
  })
}

export default function Sell() {
  usePageTitle('Sell a card')
  const [params] = useSearchParams()
  const [step, setStep] = useState(0)
  const [brandId, setBrandId] = useState(params.get('brand') ?? 'amazon')
  const [amountRaw, setAmountRaw] = useState(params.get('amount') ?? '')
  const [code, setCode] = useState('')
  const [imageName, setImageName] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [networkId, setNetworkId] = useState('mtn')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [done, setDone] = useState<{ publicId: string; payoutPesewas: number } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadPhoto = trpc.orders.uploadPhoto.useMutation()
  const createTrade = trpc.orders.create.useMutation()
  const submitting = uploadPhoto.isPending || createTrade.isPending

  const brand = findBrand(brandId)
  const usd = Math.max(0, Number(amountRaw) || 0)
  const payout = useMemo(() => payoutFor(brand, usd), [brand, usd])
  const network = PAYOUT_NETWORKS.find((n) => n.id === networkId) ?? PAYOUT_NETWORKS[0]

  const validateStep = (target: number): boolean => {
    const next: Errors = {}
    if (target >= 0) {
      if (!usd || usd < brand.minUsd || usd > brand.maxUsd) {
        next.amount = `${brand.name} cards: $${brand.minUsd}–$${brand.maxUsd} per trade.`
      }
    }
    if (target >= 1) {
      const clean = code.replace(/[\s-]/g, '')
      if (!/^[A-Za-z0-9]{8,}$/.test(clean)) {
        next.code = 'Enter the full card code — at least 8 letters or digits.'
      }
    }
    if (target >= 2) {
      if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) {
        next.phone = 'Enter a valid Ghana number, e.g. 0551234567.'
      }
      if (name.trim().length < 2) {
        next.name = 'The wallet name helps us pay the right person.'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pickImage = (file: File | undefined) => {
    if (!file) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageName(file.name)
    setImageUrl(URL.createObjectURL(file))
    setImageFile(file)
  }

  const submit = async () => {
    if (!validateStep(2) || submitting) return
    setSubmitError(null)
    try {
      let photoKey: string | undefined
      if (imageFile) {
        const type: ImageType = (IMAGE_TYPES as readonly string[]).includes(imageFile.type)
          ? (imageFile.type as ImageType)
          : 'image/jpeg'
        const up = await uploadPhoto.mutateAsync({
          name: imageFile.name,
          contentBase64: await fileToBase64(imageFile),
          contentType: type,
        })
        photoKey = up.key
      }
      const created = await createTrade.mutateAsync({
        brandId,
        amountUsdCents: Math.round(usd * 100),
        network: networkId as 'mtn' | 'telecel' | 'airteltigo',
        phone: phone.replace(/\s/g, ''),
        accountName: name.trim(),
        cardCode: code.replace(/[\s-]/g, ''),
        photoKey,
      })
      setDone({ publicId: created.publicId, payoutPesewas: created.payoutPesewas })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong — please try again.')
    }
  }

  const reset = () => {
    setDone(null)
    setStep(0)
    setCode('')
    setImageName(null)
    setImageFile(null)
    setSubmitError(null)
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setPhone('')
    setName('')
    setErrors({})
  }

  /* ---------- success ---------- */
  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-14 md:py-20">
        <div className="rounded-3xl border border-espresso/10 bg-white/60 p-7 shadow-lift md:p-10">
          <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-leaf/10 text-leaf">
            <CheckCircle2 size={30} aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-[32px] font-semibold leading-tight tracking-tight text-espresso md:text-[40px]">
            Trade received.{' '}
            <span className="font-script text-[1.3em] font-normal text-brand">Verifying now.</span>
          </h1>
          <p className="mt-3 font-sans text-[15.5px] leading-relaxed text-cocoa">
            Keep this order ID — once verified, your card goes live on the
            market and you get paid when it sells.
          </p>
          <p className="mt-5 select-all rounded-2xl bg-espresso px-5 py-4 text-center font-mono text-[26px] tracking-[0.12em] text-cream">
            {done.publicId}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl bg-creamdeep p-5 font-sans text-[14.5px]">
            <div>
              <dt className="text-cocoa">Card</dt>
              <dd className="mt-0.5 font-semibold text-espresso">
                {brand.name} · ${usd}
              </dd>
            </div>
            <div>
              <dt className="text-cocoa">You receive</dt>
              <dd className="mt-0.5 font-mono text-espresso">{ghsFromPesewas(done.payoutPesewas)}</dd>
            </div>
            <div>
              <dt className="text-cocoa">Payout to</dt>
              <dd className="mt-0.5 font-semibold text-espresso">
                {network.name} · {maskPhone(phone.replace(/\s/g, ''))}
              </dd>
            </div>
            <div>
              <dt className="text-cocoa">Card code</dt>
              <dd className="mt-0.5 font-mono text-espresso">•••• {code.replace(/[\s-]/g, '').slice(-4)}</dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to={`/track?id=${done.publicId}`} className="btn-primary flex-1">
              Track this order <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <button type="button" onClick={reset} className="btn-ghost flex-1">
              <RotateCcw size={16} aria-hidden="true" /> Sell another card
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- flow ---------- */
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 md:py-16">
      <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">Sell a card</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-espresso md:text-[44px]">
        {step === 0 && 'Which card are you selling?'}
        {step === 1 && 'The card itself.'}
        {step === 2 && 'Where do the cedis go?'}
        {step === 3 && 'Check it. Lock it.'}
      </h1>

      {/* progress */}
      <ol className="mt-7 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-brand' : 'bg-espresso/15'
              }`}
              aria-hidden="true"
            />
            <span
              className={`font-mono text-[10.5px] uppercase tracking-[0.1em] ${
                i <= step ? 'text-espresso' : 'text-cocoa/60'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-3xl border border-espresso/10 bg-white/60 p-6 shadow-lift md:p-8">
        {/* STEP 0 — brand + amount */}
        {step === 0 && (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Gift card brand">
              {CARD_BRANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={b.id === brandId}
                  onClick={() => setBrandId(b.id)}
                  className={`cursor-pointer rounded-2xl border-2 p-2 text-left transition-all duration-200 ${
                    b.id === brandId
                      ? 'border-brand bg-brand/5'
                      : 'border-transparent bg-creamdeep hover:border-espresso/25'
                  }`}
                >
                  <GiftCardArt brand={b} compact className="!rounded-lg" />
                  <span className="mt-2 block truncate px-1 pb-1 font-sans text-[13px] font-semibold text-espresso">
                    {b.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <label htmlFor="sell-amount" className="field-label">
                Card value (USD)
              </label>
              <input
                id="sell-amount"
                inputMode="decimal"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.]/g, ''))}
                className="field-line font-mono"
                placeholder="100"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'sell-amount-error' : undefined}
              />
              {errors.amount && (
                <p id="sell-amount-error" className="field-error" role="alert">
                  {errors.amount}
                </p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-creamdeep px-5 py-4">
              <span className="font-sans text-[14px] text-cocoa">You receive</span>
              <Odometer value={payout} prefix="GH₵" className="text-[26px] text-espresso" />
            </div>
          </div>
        )}

        {/* STEP 1 — code + image */}
        {step === 1 && (
          <div>
            <label htmlFor="sell-code" className="field-label">
              Card code
            </label>
            <input
              id="sell-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="field-line font-mono tracking-[0.08em]"
              placeholder="XXXX-XXXXXX-XXXX"
              autoComplete="off"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? 'sell-code-error' : 'sell-code-hint'}
            />
            {errors.code ? (
              <p id="sell-code-error" className="field-error" role="alert">
                {errors.code}
              </p>
            ) : (
              <p id="sell-code-hint" className="mt-1.5 font-sans text-[13px] text-cocoa">
                Encrypted in transit; only your verifier sees the full code. Never share your MoMo PIN — we will never ask.
              </p>
            )}

            <p className="field-label mt-7">Photo of card / receipt (optional, speeds things up)</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload card photo"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            {imageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-espresso/10">
                <img src={imageUrl} alt="Uploaded gift card preview" className="max-h-56 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(imageUrl)
                    setImageUrl(null)
                    setImageName(null)
                  }}
                  className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-espresso/80 text-cream transition-colors hover:bg-espresso"
                  aria-label="Remove photo"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-espresso/25 bg-creamdeep/60 text-cocoa transition-colors duration-200 hover:border-brand hover:text-brand"
              >
                <ImagePlus size={26} aria-hidden="true" />
                <span className="font-sans text-[14px] font-medium">Tap to add a photo</span>
              </button>
            )}
          </div>
        )}

        {/* STEP 2 — payout */}
        {step === 2 && (
          <div>
            <div className="grid gap-3" role="radiogroup" aria-label="Mobile money network">
              {PAYOUT_NETWORKS.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="radio"
                  aria-checked={n.id === networkId}
                  onClick={() => setNetworkId(n.id)}
                  className={`flex min-h-[56px] cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                    n.id === networkId
                      ? 'border-brand bg-brand/5'
                      : 'border-espresso/15 bg-transparent hover:border-espresso/40'
                  }`}
                >
                  <span
                    className="grid h-10 w-14 shrink-0 place-items-center rounded-lg font-sans text-[11px] font-bold uppercase tracking-wide"
                    style={{ background: n.paper, color: n.ink }}
                    aria-hidden="true"
                  >
                    {n.name.split(' ')[0]}
                  </span>
                  <span>
                    <span className="block font-sans text-[15.5px] font-semibold text-espresso">{n.name}</span>
                    <span className="block font-sans text-[13px] text-cocoa">{n.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="sell-phone" className="field-label">
                  MoMo number
                </label>
                <input
                  id="sell-phone"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                  className="field-line font-mono tracking-[0.06em]"
                  placeholder="055 123 4567"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'sell-phone-error' : undefined}
                />
                {errors.phone && (
                  <p id="sell-phone-error" className="field-error" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="sell-name" className="field-label">
                  Name on the wallet
                </label>
                <input
                  id="sell-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-line"
                  placeholder="Ama Serwaa"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'sell-name-error' : undefined}
                />
                {errors.name && (
                  <p id="sell-name-error" className="field-error" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — review */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-5">
              <GiftCardArt brand={brand} usd={usd} compact className="!w-36 shrink-0 !rounded-xl" />
              <div>
                <p className="font-sans text-[17px] font-semibold text-espresso">
                  {brand.name} · ${usd}
                </p>
                <p className="mt-1 font-mono text-[13.5px] text-cocoa">
                  GH₵{brand.rate.toFixed(2)} / $1 · code •••• {code.replace(/[\s-]/g, '').slice(-4)}
                  {imageName ? ' · photo attached' : ''}
                </p>
              </div>
            </div>
            <div className="my-6 h-px bg-espresso/10" aria-hidden="true" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 font-sans text-[14.5px]">
              <div>
                <dt className="text-cocoa">Payout to</dt>
                <dd className="mt-0.5 font-semibold text-espresso">{network.name}</dd>
              </div>
              <div>
                <dt className="text-cocoa">Wallet</dt>
                <dd className="mt-0.5 font-semibold text-espresso">
                  {name.trim() || '—'} · {phone ? maskPhone(phone) : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-espresso px-5 py-4 text-cream">
              <span className="font-sans text-[14px] text-cream/75">Locked payout</span>
              <Odometer value={payout} prefix="GH₵" className="text-[26px]" />
            </div>
            <p className="mt-4 font-sans text-[13px] leading-snug text-cocoa">
              Submitting locks this rate. A person verifies your card, lists it
              on the market, and you get paid the moment it sells.
            </p>
          </div>
        )}

        {/* nav */}
        {submitError && (
          <p className="mt-5 rounded-xl bg-brand/10 px-4 py-3 font-sans text-[14px] font-medium text-brand" role="alert">
            {submitError}
          </p>
        )}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={goBack} disabled={submitting} className="btn-ghost">
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          ) : (
            <Link to="/" className="btn-ghost">
              <ArrowLeft size={16} aria-hidden="true" /> Home
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className="btn-primary">
              Continue <ArrowRight size={17} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit trade'} <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
