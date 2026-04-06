import Image from "next/image";

const doctorImage =
  "https://www.figma.com/api/mcp/asset/bca3573a-935f-4c8b-8a72-97acad049165";

interface ProductOverviewProps {
  eyebrow?: string;
  headlineStart?: string;
  headlineHighlight?: string;
  description?: string;
  price?: string;
  priceLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageSrc?: string;
  imageAlt?: string;
}

export default function ProductOverview({
  eyebrow = "EXPERT CPAP COACHING",
  headlineStart = "Personalized ",
  headlineHighlight = "CPAP Therapy Coaching",
  description = "Most people struggle with CPAP because they're doing it alone. Our expert coaches help you overcome the most common challenges so you can finally get the results you need.",
  price = "$499",
  priceLabel = "Just {price} for the full year",
  ctaLabel = "Start My Coaching Program",
  ctaHref = "#",
  imageSrc = doctorImage,
  imageAlt = "CPAP Coaching Expert",
}: ProductOverviewProps) {
  const priceLabelParts = priceLabel.split("{price}");

  return (
    <section className="bg-white-smoke w-full">
      <div className="max-w-[1280px] mx-auto flex min-h-[600px]">
        {/* Left column — content */}
        <div className="flex flex-col justify-center gap-[22px] flex-1 pl-16 pr-14 py-16">
          <div className="flex flex-col gap-3 w-full">
            {/* Eyebrow */}
            <p className="font-heading font-semibold text-base leading-[1.5] text-brand-black">
              {eyebrow}
            </p>

            {/* Headline + body + price */}
            <div className="flex flex-col gap-4 w-full text-brand-black">
              <h1 className="font-heading font-bold text-[42px] leading-[1.2]">
                {headlineStart}
                <span className="text-midnight-blue">{headlineHighlight}</span>
              </h1>

              <p className="font-body font-normal text-base leading-[1.5] max-w-[595px]">
                {description}
              </p>

              <p className="font-heading font-bold text-[28px] leading-[1.2]">
                {priceLabelParts[0]}
                <span className="text-midnight-blue">{price}</span>
                {priceLabelParts[1]}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div>
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center px-12 py-5 rounded-full text-white font-heading font-semibold text-base leading-[1.5] border border-midnight-blue whitespace-nowrap"
              style={{
                background:
                  "linear-gradient(102.41deg, #4527A0 3.82%, #211449 85.88%)",
              }}
            >
              {ctaLabel}
            </a>
          </div>
        </div>

        {/* Right column — image */}
        <div className="flex-1 relative overflow-hidden min-h-[500px]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1280px) 50vw, 640px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
