import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. What CardCedi is',
    body: [
      'CardCedi is a marketplace that connects people selling gift cards (“sellers”) with people buying them (“buyers”) in Ghana. We verify cards, publish listings, hold card codes until payment is confirmed, and mediate disputes.',
      'CardCedi is a marketplace, not the buyer or seller of your card. The sale contract is between the buyer and the seller; we provide the platform, verification, and payment routing that make the trade safe.',
    ],
  },
  {
    title: '2. Fees',
    body: [
      'CardCedi charges a flat 10% fee on every completed trade. The fee is shown to the buyer before checkout and is included in the displayed price — there are no other platform charges.',
      'The remaining 90% is paid directly to the seller’s mobile money wallet. CardCedi never holds the seller’s share.',
    ],
  },
  {
    title: '3. Payments',
    body: [
      'Buyers pay with mobile money (MTN MoMo, Telecel Cash or AirtelTigo Money). Depending on configuration, payment is either (a) a single MoMo approval prompt processed by our payment gateway, or (b) two manual transfers — 90% to the seller’s MoMo and 10% to the CardCedi fee account — using the purchase ID as reference.',
      'Buyers are always charged before they get access to a card code — never the other way around. The code is released only after payment is confirmed. A purchase that is not paid may be cancelled and the card returned to the market.',
      'The seller’s payout is released 10 minutes after payment confirmation. This short hold exists so the buyer can test the card first (see §6). In manual-transfer mode the buyer sends the seller’s share directly, but the trade still only closes after the same window.',
      'We will never ask for your MoMo PIN or OTP outside the official approval prompt from your network. Anyone who asks for your PIN or OTP is not CardCedi.',
    ],
  },
  {
    title: '4. Seller rules',
    body: [
      'Sellers must own the cards they list and must have acquired them lawfully. Stolen, fraudulently obtained, already-redeemed, or misrepresented cards are prohibited.',
      'Cards are verified by a person before listing. A card that fails verification is rejected with a reason and is never sold. If a sold card turns out to be invalid, the seller must refund the buyer in full; repeated violations lead to a permanent ban and may be reported to the authorities.',
      'Payout rates are locked at submission. If market rates move after you submit, your locked payout does not change.',
    ],
  },
  {
    title: '5. Buyer rules',
    body: [
      'Redeem your card code promptly after it is released. You have 9 minutes from the moment the code unlocks to test it and report a problem; when that window closes the trade completes automatically and cannot be reversed.',
      'A report must include proof — a photo or screenshot showing the problem (for example the “already redeemed” error from the brand’s website). Reports without proof cannot be reviewed. Filing a false dispute after successfully redeeming a code is fraud.',
    ],
  },
  {
    title: '6. Disputes and refunds',
    body: [
      'A dispute may only be opened within the 9-minute window after the code is released, and must include proof. When a buyer opens a dispute, the trade is frozen — including any pending seller payout — and a person reviews the card, the proof, and the payment trail. If the card is found invalid, the buyer is refunded in full — including the 10% fee — and the seller’s listing is removed. If the card is found valid, the trade completes in the seller’s favour and the payout is released.',
      'Because sellers are paid directly in manual-transfer mode, refunds in that mode are recovered from the seller. CardCedi mediates and enforces this process but is not liable for a seller who refuses to cooperate; a refusing seller is banned and reported.',
    ],
  },
  {
    title: '7. Acceptable use',
    body: [
      'You must be 18 or older to trade. You may not use CardCedi for money laundering, fraud, or the resale of unlawfully obtained value. We may ask for identification on large trades as required by Ghanaian anti-fraud and anti-money-laundering rules.',
      'We may suspend any account or listing at our discretion to protect traders.',
    ],
  },
  {
    title: '8. Liability',
    body: [
      'CardCedi provides the platform “as is”. We are responsible for operating verification, code holding, and payment routing with reasonable care. We are not liable for losses caused by network outages, MoMo provider failures, or events outside our control.',
      'Nothing in these terms limits liability that cannot be limited under Ghanaian law.',
    ],
  },
  {
    title: '9. Privacy and cookies',
    body: [
      'We store only what a trade needs: your name, MoMo number, and trade records. We use essential cookies and local storage to keep you signed in and remember your preferences — no advertising trackers.',
      'Trade records are kept for accounting and dispute purposes and are never sold to third parties.',
    ],
  },
  {
    title: '10. Changes and contact',
    body: [
      'We may update these terms; the date below shows the latest revision. Continuing to trade after an update means accepting the new terms.',
      'Questions about these terms? Reach us on WhatsApp through the link in the site footer.',
    ],
  },
]

export default function Terms() {
  usePageTitle('Terms & Conditions')
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">The fine print</p>
      <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-espresso md:text-[44px]">
        Terms &amp; <span className="font-script text-[1.3em] font-normal text-brand">conditions.</span>
      </h1>
      <p className="mt-3 font-sans text-[14.5px] text-cocoa">
        Last updated 21 November 2026 · CardCedi, Accra, Ghana
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-[20px] font-semibold text-espresso">{s.title}</h2>
            <div className="mt-2.5 space-y-2.5">
              {s.body.map((p, i) => (
                <p key={i} className="font-sans text-[15px] leading-relaxed text-espresso/80">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link
        to="/"
        className="mt-10 inline-flex items-center gap-2 font-sans text-[14px] text-cocoa underline-offset-4 hover:text-espresso hover:underline"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Back to the storefront
      </Link>
    </div>
  )
}
