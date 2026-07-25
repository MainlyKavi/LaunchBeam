import { z } from "zod";
import { referralCodeSchema } from "@/lib/validation/subscriber";

const nullableReferralCode = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  referralCodeSchema.nullable(),
);

export const publicEventSchema = z
  .object({
    eventType: z.enum(["page_view", "referral_visit", "share_click"]),
    sessionId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_-]{16,80}$/),
    referralCode: nullableReferralCode.optional(),
    metadata: z
      .object({
        channel: z.enum(["copy", "x", "whatsapp"]).optional(),
        referrer: z.string().trim().max(500).optional(),
        utmSource: z.string().trim().max(100).optional(),
        utmMedium: z.string().trim().max(100).optional(),
        utmCampaign: z.string().trim().max(100).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

export type PublicEventInput = z.infer<typeof publicEventSchema>;
