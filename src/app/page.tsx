import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LSTS'
}

export default function Home() {
  redirect('/dashboard')
}
