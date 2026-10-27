'use client'

import { useEffect, useState, type InputHTMLAttributes } from 'react'

// Business requirement: browsers must never offer to save (or autofill) a
// TCMS password. Password managers key off <input type="password"> and ignore
// autocomplete="off" on it, so we render a plain text input masked with
// -webkit-text-security instead — the browser never sees a password field.
// Browsers without that CSS property fall back to a real password field so
// the value is never shown in clear text.

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'autoComplete'>

export function NoSavePasswordInput({ style, ...props }: Props) {
  const [maskSupported, setMaskSupported] = useState(true)

  useEffect(() => {
    setMaskSupported(
      typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc')
    )
  }, [])

  return (
    <input
      {...props}
      type={maskSupported ? 'text' : 'password'}
      autoComplete={maskSupported ? 'off' : 'new-password'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
      style={{ ...style, WebkitTextSecurity: 'disc' } as React.CSSProperties}
    />
  )
}
