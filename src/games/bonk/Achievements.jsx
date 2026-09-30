import { useEffect, useState } from 'react'
import { ACH_CATEGORIES, ACHIEVEMENTS, derivedStat } from './achievements'
import { loadSave } from './save'
import { stat, flush } from './profile'

export default function Achievements({ onClose }) {
  const save = loadSave()
  const [cat, setCat] = useState(0)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    stat('achViews')
    const id = setTimeout(() => {
      stat('achStare')
      flush()
    }, 30000)
    return () => clearTimeout(id)
  }, [])

  const unlocked = Object.keys(save.ach).length
  const [, from, to] = ACH_CATEGORIES[cat]
  const list = ACHIEVEMENTS.filter((a) => a.id >= from && a.id <= to).filter((a) =>
    filter === 'all' ? true : filter === 'done' ? save.ach[a.id] : !save.ach[a.id],
  )

  return (
    <div className="bonk-modal" onClick={onClose}>
      <div className="bonk-panel bonk-ach" onClick={(e) => e.stopPropagation()}>
        <button className="bonk-close" onClick={onClose}>✕</button>
        <h3>
          🏆 ACHIEVEMENTS <span className="bonk-bb">{unlocked} / {ACHIEVEMENTS.length}</span>
        </h3>
        <div className="bonk-progress">
          <div style={{ width: `${(unlocked / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        <div className="bonk-tabs">
          {ACH_CATEGORIES.map(([name, a, b], i) => {
            const got = ACHIEVEMENTS.filter((x) => x.id >= a && x.id <= b && save.ach[x.id]).length
            return (
              <button key={name} className={cat === i ? 'is-on' : ''} onClick={() => setCat(i)}>
                {name} <small>{got}/{b - a + 1}</small>
              </button>
            )
          })}
        </div>
        <div className="bonk-chip-row">
          {[['all', 'All'], ['done', 'Unlocked'], ['todo', 'Locked']].map(([k, label]) => (
            <button key={k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="bonk-ach-list">
          {list.map((a) => {
            const done = !!save.ach[a.id]
            const secret = a.hidden && !done
            const value = Math.min(a.n, derivedStat(save, a.stat))
            return (
              <div key={a.id} className={`bonk-ach-item ${done ? 'is-done' : ''}`}>
                <span className="bonk-ach-num">#{a.id}</span>
                <div>
                  <b>{secret ? '???' : a.name}</b>
                  <small>{secret ? 'Secret achievement. Keep exploring!' : a.desc}</small>
                  {!done && !secret && a.n > 1 && (
                    <div className="bonk-progress small">
                      <div style={{ width: `${(value / a.n) * 100}%` }} />
                    </div>
                  )}
                </div>
                <span className="bonk-ach-icon">{done ? '🏆' : '🔒'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
