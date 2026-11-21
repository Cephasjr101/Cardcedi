import Reveal from '../components/Reveal'
import { TRUST_FEATURES, TRUST_STATS } from '../lib/data'

export default function Trust() {
  return (
    <section className="bg-creamdeep">
      <div className="mx-auto max-w-shell px-5 py-20 md:px-8 md:py-28">
        <Reveal>
          <div className="rounded-[28px] bg-espresso p-8 text-cream md:p-14">
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {TRUST_STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="font-mono text-[30px] leading-none text-cream md:text-[38px]">
                    {stat.value}
                  </p>
                  <p className="mt-2.5 font-sans text-[14px] text-cream/60">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="my-10 h-px w-full bg-cream/15" aria-hidden="true" />
            <div className="grid gap-10 md:grid-cols-3 md:gap-8">
              {TRUST_FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={i * 100}>
                  <h3 className="font-display text-[21px] font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 font-sans text-[14.5px] leading-relaxed text-cream/70">
                    {feature.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
