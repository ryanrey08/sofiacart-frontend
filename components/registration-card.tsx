import React from "react";
import { ShoppingCart, Settings, Users } from "lucide-react";

export interface PromoFeatureItem {
  id: number | string;
  text: string;
  icon?: React.ElementType;
  badgeBg?: string;
}

export interface SofiaCartPromoCardProps {
  /** Title for the promo card */
  title?: string;
  /** Subtitle / highlighted brand text */
  subtitle?: string;
  /** Image URL or imported asset path for the 3D storefront illustration */
  imageSrc?: string;
  /** Image alt description */
  imageAlt?: string;
  /** List of features with icons and text */
  features?: PromoFeatureItem[];
  /** Custom wrapper styling if needed */
  className?: string;
}

export const DEFAULT_PROMO_FEATURES: PromoFeatureItem[] = [
  {
    id: 1,
    text: "Showcase your products with your own store",
    icon: ShoppingCart,
    badgeBg: "bg-[#FF2A7A]", // Pink Badge
  },
  {
    id: 2,
    text: "Easy store management",
    icon: Settings,
    badgeBg: "bg-[#5B3DF5]", // Purple Badge
  },
  {
    id: 3,
    text: "Reach more customers nationwide",
    icon: Users,
    badgeBg: "bg-[#0099FF]", // Blue Badge
  },
];

export function SofiaCartPromoCard({
  title = "Create Your Online Store",
  subtitle = "with SofiaCart",
  imageSrc = "/assets/images/3d-storefront.png",
  imageAlt = "SofiaCart Storefront",
  features = DEFAULT_PROMO_FEATURES,
  className = "",
}: SofiaCartPromoCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-white/40 p-6 backdrop-blur-xl border border-white/30 shadow-xl transition-all duration-300 ${className}`}
    >
      {/* 3D Storefront Image Header */}
      {imageSrc && (
        <div className="flex justify-center -mt-2 mb-3">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-32 w-auto object-contain drop-shadow-xl transition-transform hover:scale-105 duration-300"
          />
        </div>
      )}

      {/* Card Title */}
      {(title || subtitle) && (
        <div className="text-center mb-5">
          {title && (
            <h3 className="text-xl font-extrabold text-[#110C3B] leading-tight">
              {title}
            </h3>
          )}
          {subtitle && (
            <span className="text-xl font-extrabold text-[#221054] block">
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Feature List */}
      {features.length > 0 && (
        <ul className="space-y-4">
          {features.map((item) => {
            const IconComponent = item.icon || ShoppingCart;
            const badgeClass = item.badgeBg || "bg-[#FF2A7A]";

            return (
              <li key={item.id} className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${badgeClass} text-white shadow-md`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-[#180E42] leading-snug">
                  {item.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}