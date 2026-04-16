import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm px-8 py-2 bg-white border-b border-platinum">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-brand-gray/40">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-brand-gray hover:text-royal-purple transition-colors duration-150">
              {item.label}
            </Link>
          ) : (
            <span className="text-brand-black font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
