import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, App, theme as antTheme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import AppRoutes from './App'
import 'antd/dist/reset.css'
import './index.css'

function ThemeWrapper() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync body background with theme
  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#141414' : '#f5f5f5'
    document.body.style.color = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.88)'
  }, [isDark])

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1a56db',
          borderRadius: 6,
          fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
        },
      }}
    >
      <App>
        <AppRoutes />
      </App>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeWrapper />
  </React.StrictMode>
)
