import { Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { sign } from "npm:jsonwebtoken";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { convertPEMToCryptoKey } from "../../services/cryptoService.ts";
import { verifyToken } from "../../services/authenticationService.ts";
import userService from "../../services/userService.ts";

type VerifiedCredentials = {
  address: string,
}

interface ValidatedTokenPayload extends Payload {
  email: string;
  verified_credentials: VerifiedCredentials[];
}

Deno.serve(async(_req: Request): Promise<Response> => {
  try {
    const authorizationHeader = _req.headers.get('Authorization')?.substring(7);

    if (!authorizationHeader) {
      throw new Error("Authorization header is missing");
    }

    const cryptoKey = await convertPEMToCryptoKey(Deno.env.get("DYNAMIC_PUBLIC_KEY") ?? "");
    const { verified_credentials, ...decodedToken } = await verifyToken(authorizationHeader, cryptoKey);
    const verifiedAddress = verified_credentials.slice(0, -1).map(verifAdd => verifAdd.address);
    let { data: existUser } = await userService.getUserByEmail(decodedToken.email);

    if (!existUser) {
      const newUser = await userService.createUserWithCreds(verifiedAddress, decodedToken);

      existUser = newUser;
    } else {
      await userService.updateUserWallets(existUser.id, verifiedAddress);
    }

    const token = sign({
      ...existUser,
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    }, Deno.env.get("SUPABASE_JWT"))

    return new Response(
      JSON.stringify({
        access_token: token,
      }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (error) {
    console.error("Request Failed", error);
    return new Response(String(error?.message ?? error))
  }
})
    