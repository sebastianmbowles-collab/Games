import { setMusicEnabled, setMusicVolume } from './music'
import { loadSave } from './save'
import { setMuted } from './sound'

export function applySettings() {
  const st = loadSave().settings || {}
  setMusicEnabled(st.music !== false)
  setMusicVolume(st.musicVol ?? 0.5)
  setMuted(st.sfx === false)
}
