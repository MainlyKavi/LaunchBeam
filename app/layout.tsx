import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import "./globals.css";

const TITLE = "LaunchBeam | Build a waitlist and validate demand";
const DESCRIPTION =
  "Create a polished waitlist, grow it through referrals, and use LaunchBeam's Demand Score to measure early interest before you launch.";

async function getSiteUrl() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  return new URL(`${protocol}://${host}`);
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await getSiteUrl();
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "/" },
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
          width: 1672,
          height: 941,
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
    url: siteUrl.toString(),
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
