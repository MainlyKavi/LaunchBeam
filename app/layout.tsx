import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: "LaunchBeam | Create your waitlist and validate demand",
    description:
      "Create a beautiful waitlist with LaunchBeam, validate demand, and launch with an audience.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "LaunchBeam | Launch before you are ready",
      description:
        "Create a beautiful waitlist with LaunchBeam, validate demand, and launch with an audience.",
      type: "website",
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
      title: "LaunchBeam | Launch before you are ready",
      description:
        "Create a beautiful waitlist with LaunchBeam, validate demand, and launch with an audience.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={montserrat.variable}>{children}</body>
    </html>
  );
}
