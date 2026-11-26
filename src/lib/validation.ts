import { z } from "zod";
import { isTreeThemeId } from "./tree-themes";
import {
  isTreeSceneryId,
  isTreeShapeId,
  isTreeTopperId,
} from "./tree-config";

export const reportReasonSchema = z.enum([
  "harassment",
  "threat",
  "sexual",
  "spam",
  "self_harm",
  "other",
]);

export const updateConfigSchema = z
  .object({
    handle: z.string().trim().min(1).max(48).optional(),
    displayName: z.string().max(40).optional(),
    avatar: z.string().max(32).optional(),
    prompt: z.string().max(160).optional(),
    mutedWords: z.string().max(300).optional(),
    themeId: z
      .string()
      .refine(isTreeThemeId, "Unsupported tree theme.")
      .optional(),
    topper: z
      .string()
      .refine(isTreeTopperId, "Unsupported tree topper.")
      .optional(),
    shape: z
      .string()
      .refine(isTreeShapeId, "Unsupported tree shape.")
      .optional(),
    scenery: z
      .string()
      .refine(isTreeSceneryId, "Unsupported tree scenery.")
      .optional(),
    showSnow: z.boolean().optional(),
    showGarland: z.boolean().optional(),
    showOrnaments: z.boolean().optional(),
    pauseInbox: z.boolean().optional(),
    christmasLock: z.boolean().optional(),
  });

export const claimTreeSchema = z.object({
  handle: z.string().trim().max(48).optional(),
  ownerKey: z.string().max(128).nullable().optional(),
  config: updateConfigSchema.optional(),
});

export const createMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a short note first.")
    .max(500, "Note exceeds maximum length."),
  ornamentType: z.number().int().min(0).max(15).nullable().optional(),
  website: z.string().max(200).optional(),
});

export const patchMessageSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read") }),
  z.object({
    action: z.literal("report"),
    reason: reportReasonSchema.optional(),
  }),
]);

export const patchMailSchema = z.object({
  action: z.literal("mark_all_read"),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(1, "Invalid Idempotency-Key header.")
  .max(64, "Invalid Idempotency-Key header.")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid Idempotency-Key header.");

export function formatZodError(error: z.ZodError): string {
  return error.issues[0]?.message || "Invalid request payload.";
}
