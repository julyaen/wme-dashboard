'use client'
import * as SliderPrimitive from '@radix-ui/react-slider'

interface SliderProps {
  min: number
  max: number
  step?: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  onValueCommit?: (value: [number, number]) => void
  active?: boolean
}

export function Slider({ min, max, step = 1, value, onValueChange, onValueCommit, active = true }: SliderProps) {
  const trackColor = active ? '#3b82f6' : '#252c3a'
  const thumbColor = active ? '#3b82f6' : '#555c6e'

  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={v => onValueChange(v as [number, number])}
      onValueCommit={onValueCommit ? v => onValueCommit(v as [number, number]) : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: 20,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <SliderPrimitive.Track style={{
        position: 'relative',
        flexGrow: 1,
        height: 4,
        background: '#1e2330',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <SliderPrimitive.Range style={{
          position: 'absolute',
          height: '100%',
          background: trackColor,
          borderRadius: 2,
          transition: 'background 0.2s',
        }} />
      </SliderPrimitive.Track>

      {value.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          style={{
            display: 'block',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: thumbColor,
            border: `2px solid ${thumbColor}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            outline: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s, border-color 0.2s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            if (active) (e.target as HTMLElement).style.boxShadow = '0 0 0 4px rgba(59,130,246,0.25), 0 1px 4px rgba(0,0,0,0.5)'
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)'
          }}
        />
      ))}
    </SliderPrimitive.Root>
  )
}
