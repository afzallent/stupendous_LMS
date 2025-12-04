import React from 'react'

interface XLVILoaderProps {
  size?: string
  desktopSize?: string
  mobileSize?: string
  boxColors?: string[]
  background?: string
  className?: string
}

export const XLVILoader: React.FC<XLVILoaderProps> = ({ 
  size = '64px',
  desktopSize,
  mobileSize,
  boxColors = ['#3b82f6', '#8b5cf6', '#06b6d4'],
  background = 'transparent',
  className = 'xlviloader'
}) => {
  // Determine the actual size based on screen size
  const getSize = () => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768
      if (isMobile && mobileSize) return mobileSize
      if (!isMobile && desktopSize) return desktopSize
    }
    return size
  }

  const actualSize = getSize()
  const sizeValue = parseInt(actualSize)
  const boxSize = sizeValue * 0.125 // 8px equivalent for 64px base
  const radius = sizeValue * 0.3125 // 20px equivalent for 64px base

  // Ensure we have exactly 3 colors
  const colors = [
    boxColors[0] || '#3b82f6',
    boxColors[1] || boxColors[0] || '#8b5cf6', 
    boxColors[2] || boxColors[1] || boxColors[0] || '#06b6d4'
  ]

  return (
    <div 
      className={className}
      style={{
        width: actualSize,
        height: actualSize,
        background,
        position: 'relative',
        display: 'inline-block'
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid"
      >
        {/* Three rotating boxes */}
        {colors.map((color, index) => (
          <g key={index}>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              dur="2s"
              repeatCount="indefinite"
              values={`${index * 120} 50 50;${index * 120 + 360} 50 50`}
            />
            <rect
              x="44"
              y="20"
              width="12"
              height="12"
              fill={color}
              rx="2"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

export default XLVILoader