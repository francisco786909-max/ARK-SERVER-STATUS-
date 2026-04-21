import React from 'react'

export function Button({ className = '', variant, children, ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none'
  const style = variant === 'secondary'
    ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
    : 'bg-cyan-400 text-zinc-950 hover:bg-cyan-300'

  return (
    <button className={`${base} ${style} ${className}`} {...props}>
      {children}
    </button>
  )
}
