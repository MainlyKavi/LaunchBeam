import { z } from "zod";

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address.");

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9]{8,24}$/,
    "Use a valid referral code.",
  );

const optionalShortText = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(maximum).nullable(),
  );

export const subscribeSchema = z
  .object({
    email: normalizedEmailSchema,
    name: optionalShortText(100).optional(),
    customAnswer: optionalShortText(500).optional(),
    turnstileToken: z.string().trim().min(1).max(2_048),
    referralCode: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      referralCodeSchema.nullable(),
    ),
    sessionId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9_-]{16,80}$/)
      .nullable()
      .optional(),
    utmSource: optionalShortText(100).optional(),
    utmMedium: optionalShortText(100).optional(),
    utmCampaign: optionalShortText(100).optional(),
  })
  .strict();

export type SubscribeInput = z.infer<typeof subscribeSchema>;
