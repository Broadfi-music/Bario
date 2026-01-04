import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==================== ByteBuf (Matches Official SDK) ====================
class ByteBuf {
  private buffer: number[] = [];

  putUint16(v: number): this {
    this.buffer.push(v & 0xff);
    this.buffer.push((v >> 8) & 0xff);
    return this;
  }

  putUint32(v: number): this {
    this.buffer.push(v & 0xff);
    this.buffer.push((v >> 8) & 0xff);
    this.buffer.push((v >> 16) & 0xff);
    this.buffer.push((v >> 24) & 0xff);
    return this;
  }

  putBytes(bytes: Uint8Array): this {
    this.putUint16(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  putString(str: string): this {
    return this.putBytes(new TextEncoder().encode(str));
  }

  // Pack privileges as TreeMap<uint16, uint32>
  putTreeMapUInt32(privileges: Record<number, number>): this {
    const keys = Object.keys(privileges).map(Number).sort((a, b) => a - b);
    this.putUint16(keys.length);
    for (const key of keys) {
      this.putUint16(key);
      this.putUint32(privileges[key]);
    }
    return this;
  }

  pack(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// Helper: pack a single uint32 to 4 bytes (little-endian)
function packUint32(v: number): Uint8Array {
  return new Uint8Array([
    v & 0xff,
    (v >> 8) & 0xff,
    (v >> 16) & 0xff,
    (v >> 24) & 0xff,
  ]);
}

// ==================== HMAC-SHA256 (Deno Web Crypto) ====================
// CRITICAL: This matches official SDK's encodeHMac(key, message)
// where key is used as HMAC key and message is signed
async function encodeHMac(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC", 
    cryptoKey, 
    message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength) as ArrayBuffer
  );
  return new Uint8Array(signature);
}

// ==================== Service Classes (Official SDK) ====================
const kRtcServiceType = 1;

const Privileges = {
  kJoinChannel: 1,
  kPublishAudioStream: 2,
  kPublishVideoStream: 3,
  kPublishDataStream: 4,
};

class ServiceRtc {
  public type = kRtcServiceType;
  public privileges: Record<number, number> = {};

  constructor(
    public channelName: string,
    public uid: string
  ) {}

  addPrivilege(privilege: number, expire: number): void {
    this.privileges[privilege] = expire;
  }

  pack(): Uint8Array {
    const buf = new ByteBuf();
    buf.putUint16(this.type);
    buf.putTreeMapUInt32(this.privileges);
    buf.putString(this.channelName);
    buf.putString(this.uid);
    return buf.pack();
  }
}

// ==================== AccessToken2 (Official Algorithm - FIXED) ====================
class AccessToken2 {
  private appId: string;
  private appCertificate: string;
  private issueTs: number;
  private expire: number;
  private salt: number;
  private services: ServiceRtc[] = [];

  constructor(appId: string, appCertificate: string, expire: number = 900) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.issueTs = Math.floor(Date.now() / 1000);
    this.expire = expire;
    // Generate random salt (32-bit unsigned)
    this.salt = Math.floor(Math.random() * 0xffffffff) >>> 0;
  }

  addService(service: ServiceRtc): void {
    this.services.push(service);
  }

  async build(): Promise<string> {
    console.log("Building token with issueTs:", this.issueTs, "salt:", this.salt, "expire:", this.expire);

    // Step 1: Generate signing key - FIXED ORDER
    // Official SDK: let signing = encodeHMac(packUint32(this._issueTs), this._appCertificate)
    // This means: key = packUint32(issueTs), message = appCertificate
    const signing = await this.getSign();
    console.log("Signing key generated, length:", signing.length);

    // Step 2: Build signing_info
    const signingInfo = this.buildSigningInfo();
    console.log("Signing info built, length:", signingInfo.length);

    // Step 3: Generate signature = HMAC(signing, signing_info)
    const signature = await encodeHMac(signing, signingInfo);
    console.log("Signature generated, length:", signature.length);

    // Step 4: Build content = packString(signature) + signing_info
    const sigBuf = new ByteBuf();
    sigBuf.putBytes(signature);
    const packedSig = sigBuf.pack();

    const content = new Uint8Array(packedSig.length + signingInfo.length);
    content.set(packedSig, 0);
    content.set(signingInfo, packedSig.length);
    console.log("Content built, length:", content.length);

    // Step 5: Compress with zlib
    const compressed = pako.deflate(content);
    console.log("Compressed, length:", compressed.length);

    // Step 6: Return "007" + base64(compressed)
    const token = "007" + this.base64Encode(compressed);
    console.log("Token generated, starts with:", token.substring(0, 20), "length:", token.length);

    return token;
  }

  // FIXED: Match official SDK's signing algorithm exactly
  // Official: let signing = encodeHMac(packUint32(this._issueTs), this._appCertificate)
  //           signing = encodeHMac(packUint32(this._salt), signing)
  private async getSign(): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const certBytes = encoder.encode(this.appCertificate);
    const issueTsBytes = packUint32(this.issueTs);
    const saltBytes = packUint32(this.salt);

    // First HMAC: key = issueTs (4 bytes), message = appCertificate (string bytes)
    // This is the CRITICAL fix - we had key and message reversed before
    const hmac1 = await encodeHMac(issueTsBytes, certBytes);
    console.log("HMAC1 computed (issueTs as key, cert as message)");

    // Second HMAC: key = salt (4 bytes), message = hmac1 result
    const hmac2 = await encodeHMac(saltBytes, hmac1);
    console.log("HMAC2 computed (salt as key, hmac1 as message)");

    return hmac2;
  }

  private buildSigningInfo(): Uint8Array {
    const encoder = new TextEncoder();
    const appIdBytes = encoder.encode(this.appId);

    const buf = new ByteBuf();
    buf.putBytes(appIdBytes);           // appId with 2-byte length prefix
    buf.putUint32(this.issueTs);        // issue timestamp (4 bytes)
    buf.putUint32(this.expire);         // expire duration (4 bytes)
    buf.putUint32(this.salt);           // random salt (4 bytes)
    buf.putUint16(this.services.length); // service count (2 bytes)

    const baseBuffer = buf.pack();

    // Append all service packs
    const servicePacks = this.services.map(s => s.pack());
    const totalLen = servicePacks.reduce((sum, s) => sum + s.length, 0);

    const result = new Uint8Array(baseBuffer.length + totalLen);
    result.set(baseBuffer, 0);

    let offset = baseBuffer.length;
    for (const sp of servicePacks) {
      result.set(sp, offset);
      offset += sp.length;
    }

    return result;
  }

  private base64Encode(data: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }
}

// ==================== RtcTokenBuilder (Official API) ====================
const Role = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
};

async function buildTokenWithUid(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: number,
  tokenExpire: number,
  privilegeExpire: number
): Promise<string> {
  const token = new AccessToken2(appId, appCertificate, tokenExpire);

  // UID 0 means wildcard (any uid can use this token)
  const uidStr = uid === 0 ? "" : uid.toString();
  const serviceRtc = new ServiceRtc(channelName, uidStr);

  // Always grant JOIN_CHANNEL
  serviceRtc.addPrivilege(Privileges.kJoinChannel, privilegeExpire);

  // Publishers can publish audio/video/data
  if (role === Role.PUBLISHER) {
    serviceRtc.addPrivilege(Privileges.kPublishAudioStream, privilegeExpire);
    serviceRtc.addPrivilege(Privileges.kPublishVideoStream, privilegeExpire);
    serviceRtc.addPrivilege(Privileges.kPublishDataStream, privilegeExpire);
  }

  token.addService(serviceRtc);

  return await token.build();
}

// ==================== UID Generation ====================
function generateUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Ensure positive non-zero UID between 1 and 2^31-1
  return (Math.abs(hash) % 2147483647) || 1;
}

// ==================== Main Handler ====================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();

    console.log("=== Agora Token Request ===");
    console.log("SessionId:", sessionId);
    console.log("UserId:", userId);
    console.log("UserName:", userName);
    console.log("IsHost:", isHost);

    if (!sessionId || !userId) {
      throw new Error("Missing sessionId or userId");
    }

    const AGORA_APP_ID = Deno.env.get("AGORA_APP_ID");
    const AGORA_APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE");

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error("Agora credentials not configured");
      throw new Error("Agora credentials not configured");
    }

    console.log("App ID:", AGORA_APP_ID.substring(0, 8) + "...");
    console.log("Certificate length:", AGORA_APP_CERTIFICATE.length);

    // CRITICAL FIX: Give ALL authenticated users PUBLISHER rights
    // Everyone can speak - they control their own mic (mute/unmute)
    // No promotion needed - everyone joins with mic capability
    const canPublish = true; // ALL users get publisher rights
    const speakerSlotsFull = false;
    const MAX_SPEAKERS = 100; // No practical limit now

    // Generate channel name and UID
    const channelName = `podcast-${sessionId}`;
    const uid = generateUid(userId);
    const role = canPublish ? Role.PUBLISHER : Role.SUBSCRIBER;

    console.log("Channel:", channelName);
    console.log("UID:", uid);
    console.log("Role:", canPublish ? "PUBLISHER" : "SUBSCRIBER");
    console.log("Speaker slots full:", speakerSlotsFull);

    // Token expires in 24 hours (in seconds from now)
    const tokenExpire = 86400;
    const privilegeExpire = Math.floor(Date.now() / 1000) + 86400;

    console.log("Token expire:", tokenExpire);
    console.log("Privilege expire:", privilegeExpire);

    const token = await buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      tokenExpire,
      privilegeExpire
    );

    console.log("=== Token Generated Successfully ===");
    console.log("Token length:", token.length);
    console.log("Token prefix:", token.substring(0, 10));

    return new Response(
      JSON.stringify({
        appId: AGORA_APP_ID,
        channelName,
        token,
        uid,
        canPublish,
        speakerSlotsFull,
        maxSpeakers: MAX_SPEAKERS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("=== Agora Token Error ===");
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
