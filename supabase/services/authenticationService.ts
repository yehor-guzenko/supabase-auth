import { verify, Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { sign } from "npm:jsonwebtoken";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

export type VerifiedCredentials = {
  address: string,
}

export interface ValidatedTokenPayload extends Payload {
  email: string;
  verified_credentials: VerifiedCredentials[];
}

export async function verifyToken(token: string, publicKey: CryptoKey): Promise<ValidatedTokenPayload> {
  return await verify(
    token,
    publicKey,
  );
}

export function generateToken(payload: any) {
  return sign({
    ...payload,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }, Deno.env.get("SUPABASE_JWT"))
}
