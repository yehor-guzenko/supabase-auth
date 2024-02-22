export function pemStringToArrayBuffer(pemString: string) {
  const lines = pemString.split("\n").filter((line: string) => !line.includes("BEGIN") && !line.includes("END"));
  const base64String = lines.join("");
  const binaryString = atob(base64String);
  const byteArray = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }
  return byteArray.buffer;
}

export async function importPublicKey(pemArrayBuffer: ArrayBuffer) {
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

export async function convertPEMToCryptoKey(publicKeyPEM: string) {
  const pemArrayBuffer = pemStringToArrayBuffer(publicKeyPEM);
  const cryptoKey = await importPublicKey(pemArrayBuffer);
  return cryptoKey;
}
