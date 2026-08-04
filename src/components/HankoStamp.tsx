interface HankoStampProps {
  children: string
  size?: number
  className?: string
}

export default function HankoStamp({ children, size = 44, className = '' }: HankoStampProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 border-vermillion text-vermillion font-display font-bold opacity-85 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.27,
        transform: 'rotate(-8deg)',
      }}
    >
      {children}
    </div>
  )
}
