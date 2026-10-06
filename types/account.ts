// Mirrors sofiacart-backend UserResource as returned by GET/PATCH /api/auth/me for the signed-in
// merchant. Passwords and tokens are never part of this payload.
import type { MerchantProfile } from "./merchant-profile";

export interface AccountUser {
  id: number;
  role: "merchant" | "admin";
  name: string;
  email: string;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  merchant: MerchantProfile | null;
}
