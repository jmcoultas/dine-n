import { z } from 'zod';
import { PreferenceSchema, SubscriptionStatusEnum, SubscriptionTierEnum } from '@db/schema';

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().nullable(),
  password_hash: z.string(),
  preferences: PreferenceSchema.nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  subscription_status: SubscriptionStatusEnum.default('inactive'),
  subscription_tier: SubscriptionTierEnum.default('free'),
  subscription_end_date: z.date().nullable(),
  meal_plans_generated: z.number().default(0),
  created_at: z.date()
});

// Export the User type based on the schema
export type User = z.infer<typeof UserSchema>;

// Export a type without sensitive fields for public use
export type PublicUser = Omit<User, 'password_hash'> & {
  firebaseToken?: string;
};