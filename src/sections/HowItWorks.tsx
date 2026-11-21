import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import { HOW_STEPS } from '../lib/data'

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-brand text-cream">
      <div className="mx-auto max-w-shell px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <p className="font-mono text-[12.5px] uppercase tracking-[0.16em] text-cream/70">
            How it works
          </p>
          <h2 className="mt-4 max-w-[16ch] font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[54px]">
            Three steps. Twelve minutes.{' '}
            <span className="font-script text-[1.3em] font-normal leading-none">Done.</span>
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {HOW_STEPS.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 120}>
              <p className="font-mono text-[13px] tracking-[0.14em] text-cream/60">{step.n}</p>
              <div className="my-4 h-px w-full bg-cream/25" aria-hidden="true" />
              <h3 className="font-display text-[24px] font-semibold tracking-tight md:text-[28px]">
                {step.title}
              </h3>
              <p className="mt-3 font-sans text-[15.5px] leading-relaxed text-cream/85">
                {step.body}
              </p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={200}>
          <Link to="/sell" className="btn-light mt-14">
            Start a trade <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
