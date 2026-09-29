// Renders the company's uploaded logo image when set, falling back to the
// emoji-in-a-color-chip mark used everywhere before logo uploads existed.
export function BrandMark({
  logoUrl,
  logoEmoji,
  primaryColor,
  className,
  textClassName,
}: {
  logoUrl: string | null;
  logoEmoji: string;
  primaryColor: string;
  className: string;
  textClassName?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={`${className} object-contain`} />;
  }
  return (
    <div
      className={`flex items-center justify-center ${className} ${textClassName ?? ""}`}
      style={{ backgroundColor: primaryColor }}
    >
      {logoEmoji}
    </div>
  );
}
