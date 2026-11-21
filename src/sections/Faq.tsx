import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import Reveal from '../components/Reveal'
import { FAQS } from '../lib/data'

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-cream">
      <div className="mx-auto max-w-shell px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-brand">
              Questions
            </p>
            <h2 className="mt-4 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-espresso md:text-[54px]">
              Asked every day.
            </h2>
            <p className="mt-5 max-w-[40ch] font-sans text-[15.5px] leading-relaxed text-cocoa">
              Anything else? Start a trade and ask the verifier in the chat —
              a person answers, not a bot.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  value={`faq-${i}`}
                  className="border-b border-espresso/15"
                >
                  <AccordionTrigger className="min-h-[56px] cursor-pointer py-5 text-left font-sans text-[16.5px] font-semibold text-espresso transition-colors hover:text-brand hover:no-underline [&[data-state=open]]:text-brand">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 font-sans text-[15px] leading-relaxed text-cocoa">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
