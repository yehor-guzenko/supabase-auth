import { createClient } from "npm:@supabase/supabase-js";
import { verify, Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { sign } from "npm:jsonwebtoken";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

type VerifiedCredentials = {
  address: string,
}

interface ValidatedTokenPayload extends Payload {
  email: string;
  verified_credentials: VerifiedCredentials[];
}

function pemStringToArrayBuffer(pemString: string) {
  const lines = pemString.split("\n").filter((line: string) => !line.includes("BEGIN") && !line.includes("END"));
  const base64String = lines.join("");
  const binaryString = atob(base64String);
  const byteArray = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }
  return byteArray.buffer;
}

async function importPublicKey(pemArrayBuffer: ArrayBuffer) {
  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    pemArrayBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
  return publicKey;
}

async function convertPEMToCryptoKey(publicKeyPEM: string) {
  const pemArrayBuffer = pemStringToArrayBuffer(publicKeyPEM);
  const cryptoKey = await importPublicKey(pemArrayBuffer);
  return cryptoKey;
}

Deno.serve(async(_req: Request): Promise<Response> => {
  try {
    const authorizationHeader = _req.headers.get('Authorization')?.substring(7);

    if (!authorizationHeader) {
      throw new Error("Authorization header is missing");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_KEY") ?? "", 
    );

    try {
      const cryptoKey = await convertPEMToCryptoKey(Deno.env.get("DYNAMIC_PUBLIC_KEY") ?? "");
      const { verified_credentials, ...decodedToken}: ValidatedTokenPayload = await verify(
        authorizationHeader,
        cryptoKey,
      );

      let { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("email", decodedToken.email)
        .single();

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert([
            { email: decodedToken.email, external_id: decodedToken.sub },
          ])
          .select("*")
          .single();
                
        verified_credentials.forEach(async cred => {
          if (!cred.address) return;

          await supabase
            .from("wallets")
            .insert([
              { user_id: newUser.id, address: cred.address }
            ]);
        })

        user = newUser;
      }

      const token = sign({
        ...user,
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
  } catch (error) {
    console.error("Server Error", error);
    return new Response(String(error?.message ?? error), { status: 500 })
  }
})
    