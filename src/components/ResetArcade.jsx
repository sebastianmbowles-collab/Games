import { useState } from 'react'

// Every saved thing in the arcade: the tokens Animal Brawl gives you.
const SAVE_KEYS = ['fazTokens']

export default function ResetArcade() {
  const [step, setStep] = useState(0)

  function reset() {
    try {
      for (const key of SAVE_KEYS) localStorage.removeItem(key)
    } catch {
      // storage blocked: nothing saved to erase
    }
    location.reload()
  }

  if (step === 0) {
    return (
      <button className="arcade-reset-btn" onClick={() => setStep(1)}>
        🗑 Reset everything
      </button>
    )
  }
  return (
    <div className="arcade-reset-box">
      <b>⚠️ Reset the WHOLE arcade?</b>
      <p>
        This erases your Animal Brawl tokens 🎟️. <b>You can't undo this!</b>
      </p>
      <div className="arcade-reset-row">
        <button onClick={() => setStep(0)}>No, keep my stuff</button>
        {step === 1 ? (
          <button className="danger" onClick={() => setStep(2)}>
            Yes, reset
          </button>
        ) : (
          <button className="danger" onClick={reset}>
            I'm 100% sure. RESET!
          </button>
        )}
      </div>
    </div>
  )
}
