import PixelSprite from '../sprites/PixelSprite'

export default function CornerMascot() {
  return (
    <div className="corner-mascot" aria-hidden="true">
      <PixelSprite name="freddy" size={68} bob={false} mode="head" />
    </div>
  )
}
