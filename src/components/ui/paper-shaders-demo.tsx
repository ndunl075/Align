import { MeshGradient } from '@paper-design/shaders-react'

export function PaperShadersDemo() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0 h-full w-full bg-black">
        <MeshGradient
          className="h-full w-full"
          colors={['#000000', '#1a1a1a', '#333333', '#ffffff']}
          speed={1}
          distortion={0.75}
          swirl={0.12}
        />
      </div>
    </div>
  )
}
