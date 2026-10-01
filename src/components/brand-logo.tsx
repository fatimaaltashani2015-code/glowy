import Image from "next/image";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "hero";
  caption?: boolean;
};

const sizes = {
  sm: 44,
  md: 108,
  lg: 148,
  hero: 168,
};

export function BrandLogo({ size = "md", caption = false }: BrandLogoProps) {
  const px = sizes[size];

  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/brand/glowy-badge-v2.png"
        alt="Glowy Clinic & Beauty"
        width={px}
        height={px}
        unoptimized
        className="rounded-full bg-[#fce7f3] object-cover shadow-md shadow-fuchsia-200/50 ring-2 ring-white/80"
        preload={size === "hero" || size === "lg"}
      />
      {caption ? (
        <p className="mt-2 text-[10px] tracking-[0.28em] text-gold">
          CLINIC & BEAUTY
        </p>
      ) : null}
    </div>
  );
}
