import { useState } from 'react'
import { motion } from 'framer-motion'
import GoogleGeminiEffectDemo from '@/components/ui/google-gemini-effect-demo'
import FileUploadPage from '@/components/FileUploadPage'

export default function LandingPage({ onGetStarted }) {
  const [showUpload, setShowUpload] = useState(false)

  if (showUpload) {
    return (
      <FileUploadPage
        onExtractedData={onGetStarted}
        onBack={() => setShowUpload(false)}
      />
    )
  }

  return (
    <div className="w-full relative" style={{ backgroundColor: '#0A0A0B' }}>
      <GoogleGeminiEffectDemo />

      {/* Get Started Button */}
      <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-40">
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded px-8 py-3 text-base font-medium text-white shadow-xl hover:shadow-2xl transition-all"
          style={{
            backgroundColor: '#0F4C45',
            border: '1px solid rgba(201, 163, 92, 0.3)',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
          onHover
        >
          Get Started
          <span className="ml-1 transition-transform">→</span>
        </motion.button>
      </div>
    </div>
  )
}
