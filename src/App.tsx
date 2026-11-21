import { Routes, Route } from 'react-router'
import Header from './components/Header'
import Footer from './components/Footer'
import Ticker from './components/Ticker'
import CookieBanner from './components/CookieBanner'
import Home from './pages/Home'
import Sell from './pages/Sell'
import Track from './pages/Track'
import Market from './pages/Market'
import Buy from './pages/Buy'
import Purchase from './pages/Purchase'
import Terms from './pages/Terms'
import Admin from './pages/Admin'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Ticker />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/track" element={<Track />} />
          <Route path="/market" element={<Market />} />
          <Route path="/buy" element={<Buy />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}
