'use client'

import { useState } from 'react'
import { AccountForm } from '@/components/crm/account-form'

interface AccountEditButtonProps {
  readonly account: {
    id: string
    name: string
    organisation_type: string
    province: string | null
    naics_codes: string[]
    annual_procurement_value_cad: number | null
  }
}

export function AccountEditButton({ account }: AccountEditButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>Edit</button>
      {open && <AccountForm initial={account} onClose={() => setOpen(false)} />}
    </>
  )
}
