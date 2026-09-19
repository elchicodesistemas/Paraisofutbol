import type {Metadata,Viewport} from 'next';
import Pwa from '@/components/pwa';
import './globals.css';
export const metadata:Metadata={title:'El Paraíso Deportes | Actividades y torneos',description:'Fútbol, hockey, danza y gimnasio. Reservá tu cancha, inscribite y seguí los torneos.',manifest:'/manifest.webmanifest',icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'El Paraíso'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#10180f'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body><Pwa/>{children}</body></html>}
