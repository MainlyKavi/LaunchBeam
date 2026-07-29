import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const TITLE = "LaunchBeam | Build a waitlist and validate demand";
const DESCRIPTION =
  "Create a polished waitlist, grow it through referrals, and use LaunchBeam's Demand Score to measure early interest before you launch.";

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = new URL(await getSiteUrl());
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: TITLE,
    description: DESCRIPTION,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      type: "website",
      url: "/",
      siteName: "LaunchBeam",
      images: [
        {
          url: imageUrl,
          width: 1731,
          height: 909,
          alt: "LaunchBeam waitlist builder and demand score preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [imageUrl],
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#F5F5F7",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const siteUrl = await getSiteUrl();
  preload("/fonts/ArgentumSans-Regular.woff2", {
    as: "font",
    crossOrigin: "anonymous",
    type: "font/woff2",
  });
  preload("/fonts/ArgentumSans-SemiBold.woff2", {
    as: "font",
    crossOrigin: "anonymous",
    type: "font/woff2",
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LaunchBeam",
    url: siteUrl,
    description: DESCRIPTION,
  };

  return (
    <html lang="en">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
