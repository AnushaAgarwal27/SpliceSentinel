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
    <div className="bg-black w-full relative">
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
          className="inline-flex items-center gap-3 rounded-lg bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl hover:bg-indigo-700 hover:shadow-3xl transition-all"
        >
          Get Started →
        </motion.button>
      </div>
    </div>
  )
}
