import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import {
  IBM_Plex_Sans,
  JetBrains_Mono,
  Lato,
  Inter,
  Roboto,
  Open_Sans,
  Poppins,
  Nunito,
  Montserrat,
  Source_Sans_3,
  Raleway,
  Playfair_Display,
  Merriweather,
  Oswald,
  Quicksand,
  Work_Sans,
  Fira_Sans,
  Inconsolata,
  Space_Grotesk,
  DM_Sans,
  Manrope,
  Outfit,
  Geist,
  Libre_Franklin,
  Rubik,
  Karla,
  Josefin_Sans,
  Crimson_Text,
  Lora,
  PT_Sans,
} from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { SpiralProvider } from '@/components/spiral/spiral-provider'
import './globals.css'

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})
const lato = Lato({
  variable: '--font-lato',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})
const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})
const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  display: 'swap',
})
const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  display: 'swap',
})
const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  display: 'swap',
})
const sourceSans3 = Source_Sans_3({
  variable: '--font-source-sans-3',
  subsets: ['latin'],
  display: 'swap',
})
const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
  display: 'swap',
})
const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
  display: 'swap',
})
const merriweather = Merriweather({
  variable: '--font-merriweather',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})
const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  display: 'swap',
})
const quicksand = Quicksand({
  variable: '--font-quicksand',
  subsets: ['latin'],
  display: 'swap',
})
const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  display: 'swap',
})
const firaSans = Fira_Sans({
  variable: '--font-fira-sans',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})
const inconsolata = Inconsolata({
  variable: '--font-inconsolata',
  subsets: ['latin'],
  display: 'swap',
})
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
})
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
})
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
})
const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
})
const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
})
const libreFranklin = Libre_Franklin({
  variable: '--font-libre-franklin',
  subsets: ['latin'],
  display: 'swap',
})
const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['latin'],
  display: 'swap',
})
const karla = Karla({
  variable: '--font-karla',
  subsets: ['latin'],
  display: 'swap',
})
const josefinSans = Josefin_Sans({
  variable: '--font-josefin-sans',
  subsets: ['latin'],
  display: 'swap',
})
const crimsonText = Crimson_Text({
  variable: '--font-crimson-text',
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap',
})
const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  display: 'swap',
})
const ptSans = PT_Sans({
  variable: '--font-pt-sans',
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Spiral Inward',
  description:
    'Map the people in your life as a constellation. A personal, celestial Vedic astrology companion.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0b14',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${ibmPlexSans.variable} ${jetbrainsMono.variable} ${lato.variable} ${inter.variable} ${roboto.variable} ${openSans.variable} ${poppins.variable} ${nunito.variable} ${montserrat.variable} ${sourceSans3.variable} ${raleway.variable} ${playfairDisplay.variable} ${merriweather.variable} ${oswald.variable} ${quicksand.variable} ${workSans.variable} ${firaSans.variable} ${inconsolata.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${manrope.variable} ${outfit.variable} ${geist.variable} ${libreFranklin.variable} ${rubik.variable} ${karla.variable} ${josefinSans.variable} ${crimsonText.variable} ${lora.variable} ${ptSans.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <SpiralProvider>{children}</SpiralProvider>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
