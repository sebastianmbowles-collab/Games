import { Component } from 'react'

// If a game crashes, show a friendly message instead of a blank white page.
export default class GameErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="game-screen" style={{ justifyContent: 'center', textAlign: 'center', gap: 14 }}>
        <h2>😵 Oops! This game crashed.</h2>
        <p style={{ color: '#9b9bb0', maxWidth: 480 }}>
          Try again, or open the arcade in Google Chrome or Microsoft Edge. (Error: {String(this.state.error.message || this.state.error)})
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="exit-btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button className="exit-btn" onClick={this.props.onExit}>
            ← Back to the arcade
          </button>
        </div>
      </div>
    )
  }
}
