import Hero from '../sections/Hero'
import HowItWorks from '../sections/HowItWorks'
import RatesTable from '../sections/RatesTable'
import Trust from '../sections/Trust'
import Faq from '../sections/Faq'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Home() {
  usePageTitle()
  return (
    <>
      <Hero />
      {/* spacer for the overlapping calculator on md+ */}
      <div className="hidden md:block md:h-24" aria-hidden="true" />
      <HowItWorks />
      <RatesTable />
      <Trust />
      <Faq />
    </>
  )
}
