import type { Metadata } from "next";
import { LandingPage } from "./landing-page";

export const metadata: Metadata = {
  description:
    "Create a beautiful waitlist with LaunchBeam, validate demand, and launch with an audience.",
};

export default function Home() {
  return <LandingPage />;
}
