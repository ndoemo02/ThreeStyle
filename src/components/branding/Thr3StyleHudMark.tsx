import Image from 'next/image';

type Thr3StyleHudMarkProps = {
  compact?: boolean;
  className?: string;
};

export function Thr3StyleHudMark({ compact = false, className = '' }: Thr3StyleHudMarkProps) {
  const padding = compact ? '6px 10px' : '8px 14px';
  const width = compact ? 140 : 176;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        borderRadius: 999,
        border: '1px solid rgba(243, 160, 93, 0.16)',
        background: 'rgba(7, 9, 11, 0.82)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Image
        src="/textures/branding/logo-sora.png"
        alt="THR3STYLE"
        width={width}
        height={Math.round(width * (1440 / 2560))}
        unoptimized
        style={{
          width: compact ? 140 : 176,
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
