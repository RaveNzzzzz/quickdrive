import type { ReactNode } from 'react'
import './Login.css'

function Logo() {
  return (
    <svg className="login-logo" viewBox="0 0 164 96" aria-label="QuickDrive">
      <circle cx="46" cy="48" r="34" fill="none" stroke="currentColor" strokeWidth="20" />
      <path d="M50 56h20l24 40H74Z" />
      <path fillRule="evenodd" d="M100 4h18a44 44 0 0 1 0 88h-18Zm18 20v48a24 24 0 0 0 0-48Z" />
    </svg>
  )
}

function Waves() {
  return (
    <svg className="login-waves" viewBox="0 0 1920 440" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="#05a2ee"
        d="M0 60C120 40 200 0 330 10S560 40 680 10 900 -10 1040 20 1260 0 1380 0 1560 50 1660 60 1820 30 1920 30V440H0Z"
      />
      <path
        fill="#1ab0f5"
        d="M0 110C140 60 260 20 400 40S620 110 760 90 980 40 1120 60 1340 120 1480 90 1720 30 1920 50V440H0Z"
      />
      <path
        fill="#3dbdf8"
        d="M0 180C160 120 300 100 440 140S700 220 860 180 1100 110 1260 140 1520 220 1680 180 1840 120 1920 140V440H0Z"
      />
      <path
        fill="#52c5fa"
        d="M0 240C180 180 340 160 520 200S780 280 960 240 1240 180 1420 210 1720 280 1920 240V440H0Z"
      />
      <path
        fill="#66ccfb"
        d="M0 320C200 290 360 230 520 230S800 300 1000 290 1300 230 1500 250 1800 320 1920 300V440H0Z"
      />
    </svg>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-page">
      <Waves />
      <div className="login-wrap">
        <Logo />
        {children}
      </div>
    </div>
  )
}
