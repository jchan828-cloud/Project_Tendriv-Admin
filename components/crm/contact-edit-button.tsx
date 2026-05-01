'use client'

import { useState } from 'react'
import { ContactForm } from '@/components/crm/contact-form'

interface ContactEditButtonProps {
  readonly contact: {
    id: string
    business_name: string
    contact_email: string | null
    status: string
    pipeline: string
    province: string | null
    contact_website: string | null
    notes: string | null
    casl_consent_date: string | null
    casl_consent_method: string | null
    casl_consent_source: string | null
  }
}

export function ContactEditButton({ contact }: ContactEditButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>Edit</button>
      {open && <ContactForm initial={contact} onClose={() => setOpen(false)} />}
    </>
  )
}
