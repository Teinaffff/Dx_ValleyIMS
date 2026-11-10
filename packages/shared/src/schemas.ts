import { z } from "zod";
import {
  LIFECYCLE_STAGE_KEYS,
  PRODUCT_VISIBILITY,
} from "./lifecycle";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

const weightField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value && value.trim() !== "" ? value.trim() : "100"))
  .refine(
    (value) => /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 100,
    "Weight must be a whole number from 1 to 100",
  );

export const productMilestoneSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Milestone title is required")
    .max(120, "Keep the title under 120 characters"),
  description: optionalText(300),
  isRequired: z.boolean().default(true),
  weight: weightField,
  dueDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});
export type ProductMilestoneInput = z.infer<typeof productMilestoneSchema>;

const optionalDate = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

export const milestoneEditorSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Milestone title is required")
    .max(120, "Keep the title under 120 characters"),
  description: optionalText(500),
  isRequired: z.boolean().default(true),
  weight: weightField,
  dueDate: optionalDate,
  ownerId: optionalText(80),
  evidenceLink: optionalText(500),
  targetValue: optionalText(40),
  actualValue: optionalText(40),
  unit: optionalText(20),
});
export type MilestoneEditorInput = z.infer<typeof milestoneEditorSchema>;

export const milestoneStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "PARKED", "BLOCKED"]),
  reason: optionalText(500),
});
export type MilestoneStatusInput = z.infer<typeof milestoneStatusSchema>;

export const gateSubmitSchema = z.object({
  note: optionalText(2000),
});
export type GateSubmitInput = z.infer<typeof gateSubmitSchema>;

export const productCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name is required")
    .max(80, "Keep the name under 80 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Describe the product in at least 10 characters")
    .max(600, "Keep the description under 600 characters"),
  ownerId: z.string().min(1, "Choose a product owner"),
  teamIds: z.array(z.string()).default([]),
  stage: z.enum(LIFECYCLE_STAGE_KEYS as [string, ...string[]]),
  visibility: z.enum(PRODUCT_VISIBILITY),
  businessArea: optionalText(80),
  targetUsers: optionalText(160),
  expectedImpact: optionalText(300),
  launchTarget: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  customMilestones: z
    .array(productMilestoneSchema)
    .max(20, "Add at most 20 milestones")
    .default([]),
  visibilityTeamIds: z.array(z.string()).default([]),
});
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema
  .omit({ customMilestones: true })
  .partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const teamCreateSchema = z.object({
  name: z.string().trim().min(2, "Team name is required").max(60),
  description: optionalText(240),
  leadId: optionalText(80),
});
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;

export const userCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(80),
    email: z.string().email("Enter a valid email"),
    title: optionalText(80),
    role: z.enum(["ADMIN", "EVALUATOR", "PEER_EVALUATOR", "PRODUCT_OWNER", "DEVELOPER"]),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72)
      .optional()
      .or(z.literal("")),
    teamIds: z.array(z.string()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.role === "DEVELOPER") return;
    if (!value.password || value.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "A temporary password is required for portal roles",
      });
    }
  });
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  title: optionalText(80),
  role: z.enum(["ADMIN", "EVALUATOR", "PEER_EVALUATOR", "PRODUCT_OWNER", "DEVELOPER"]),
  teamIds: z.array(z.string()).default([]),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Keep it under 72 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a different password from your current one",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const publicIdeaCreateSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().email("Enter a valid work email"),
  jobTitle: optionalText(80),
  title: z
    .string()
    .trim()
    .min(4, "Give your idea a short title")
    .max(120, "Keep the title under 120 characters"),
  // Required (20+ chars) only when no attachment is added; the form checks that.
  problem: z.string().trim().max(2000, "Keep the problem under 2,000 characters"),
  solution: z.string().trim().max(2000, "Keep the solution under 2,000 characters"),
  expectedImpact: optionalText(1000),
});
export type PublicIdeaCreateInput = z.infer<typeof publicIdeaCreateSchema>;
