import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==================== ByteBuf Helper ====================
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

  putTreeMapUInt32(map: Map<number, number>): this {
    this.putUint16(map.size);
    for (const [key, value] of map) {
      this.putUint16(key);
      this.putUint32(value);
    }
    return this;
  }

  pack(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

function packUint32(v: number): Uint8Array {
  return new Uint8Array([
    v & 0xff,
    (v >> 8) & 0xff,
    (v >> 16) & 0xff,
    (v >> 24) & 0xff,
  ]);
}

// ==================== Service Classes ====================
const ServiceType = {
  RTC: 1,
  RTM: 2,
  FPA: 4,
  CHAT: 5,
};

const RtcPrivilege = {
  JOIN_CHANNEL: 1,
  PUBLISH_AUDIO_STREAM: 2,
  PUBLISH_VIDEO_STREAM: 3,
  PUBLISH_DATA_STREAM: 4,
};

class Service {
  public privileges: Map<number, number> = new Map();
  constructor(public type: number) {}

  addPrivilege(privilege: number, expire: number): void {
    this.privileges.set(privilege, expire);
  }

  pack(): Uint8Array {
    const buf = new ByteBuf();
    buf.putUint16(this.type);
    buf.putTreeMapUInt32(this.privileges);
    return buf.pack();
  }
}

class ServiceRtc extends Service {
  constructor(public channelName: string, public uid: string) {
    super(ServiceType.RTC);
  }

  override pack(): Uint8Array {
    const buf = new ByteBuf();
    buf.putUint16(this.type);
    buf.putTreeMapUInt32(this.privileges);
    buf.putString(this.channelName);
    buf.putString(this.uid);
    return buf.pack();
  }
}

// ==================== AccessToken2 (Official Algorithm) ====================
class AccessToken2 {
  private appId: string;
  private appCertificate: string;
  private issueTs: number;
  private expire: number;
  private salt: number;
  private services: Service[] = [];

  constructor(appId: string, appCertificate: string, expire: number = 3600) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.issueTs = Math.floor(Date.now() / 1000);
    this.expire = expire;
    this.salt = Math.floor(Math.random() * 0xffffffff);
  }

  addService(service: Service): void {
    this.services.push(service);
  }

  async build(): Promise<string> {
    // Step 1: Generate signing key using DOUBLE HMAC-SHA256
    // First HMAC: sign issueTs with appCertificate
    // Second HMAC: sign salt with result of first HMAC
    const signing = await this.generateSigningKey();

    // Step 2: Build signing_info (the data to be signed)
    const signingInfo = this.buildSigningInfo();

    // Step 3: Generate signature using the signing key
    const signature = await this.hmacSha256(signing, signingInfo);

    // Step 4: Build content = packString(signature) + signing_info
    const content = this.buildContent(signature, signingInfo);

    // Step 5: Compress with zlib deflate
    const compressed = pako.deflate(content);

    // Step 6: Return "007" + base64(compressed) - NO underscore, NO appId!
    return "007" + this.base64Encode(compressed);
  }

  private async generateSigningKey(): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const certBytes = encoder.encode(this.appCertificate);

    // First HMAC: HMAC-SHA256(appCertificate, packUint32(issueTs))
    const key1 = await crypto.subtle.importKey(
      "raw",
      certBytes.buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const issueData = packUint32(this.issueTs);
    const hmac1Result = await crypto.subtle.sign("HMAC", key1, issueData.buffer as ArrayBuffer);

    // Second HMAC: HMAC-SHA256(hmac1Result, packUint32(salt))
    const key2 = await crypto.subtle.importKey(
      "raw",
      hmac1Result,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const saltData = packUint32(this.salt);
    const hmac2Result = await crypto.subtle.sign("HMAC", key2, saltData.buffer as ArrayBuffer);

    return new Uint8Array(hmac2Result);
  }

  private buildSigningInfo(): Uint8Array {
    const encoder = new TextEncoder();
    const appIdBytes = encoder.encode(this.appId);

    // Build the signing info buffer
    const buf = new ByteBuf();
    buf.putBytes(appIdBytes);     // appId with length prefix
    buf.putUint32(this.issueTs);  // issue timestamp
    buf.putUint32(this.expire);   // expire duration
    buf.putUint32(this.salt);     // random salt
    buf.putUint16(this.services.length); // service count

    const baseBuffer = buf.pack();

    // Pack all services
    const servicePacks = this.services.map(s => s.pack());
    const totalServiceLength = servicePacks.reduce((sum, s) => sum + s.length, 0);

    // Combine base buffer with service packs
    const result = new Uint8Array(baseBuffer.length + totalServiceLength);
    result.set(baseBuffer, 0);

    let offset = baseBuffer.length;
    for (const sp of servicePacks) {
      result.set(sp, offset);
      offset += sp.length;
    }

    return result;
  }

  private async hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key.buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data.buffer as ArrayBuffer);
    return new Uint8Array(signature);
  }

  private buildContent(signature: Uint8Array, signingInfo: Uint8Array): Uint8Array {
    // Content = packBytes(signature) + signingInfo
    // packBytes adds a 2-byte length prefix
    const sigBuf = new ByteBuf();
    sigBuf.putBytes(signature);
    const packedSig = sigBuf.pack();

    const content = new Uint8Array(packedSig.length + signingInfo.length);
    content.set(packedSig, 0);
    content.set(signingInfo, packedSig.length);

    return content;
  }

  private base64Encode(data: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }
}

// ==================== RtcTokenBuilder ====================
const Role = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
};

class RtcTokenBuilder {
  static async buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    tokenExpire: number,
    privilegeExpire: number
  ): Promise<string> {
    const token = new AccessToken2(appId, appCertificate, tokenExpire);

    const uidStr = uid === 0 ? "" : uid.toString();
    const serviceRtc = new ServiceRtc(channelName, uidStr);

    // Always grant JOIN_CHANNEL
    serviceRtc.addPrivilege(RtcPrivilege.JOIN_CHANNEL, privilegeExpire);

    // Publishers can also publish streams
    if (role === Role.PUBLISHER) {
      serviceRtc.addPrivilege(RtcPrivilege.PUBLISH_AUDIO_STREAM, privilegeExpire);
      serviceRtc.addPrivilege(RtcPrivilege.PUBLISH_VIDEO_STREAM, privilegeExpire);
      serviceRtc.addPrivilege(RtcPrivilege.PUBLISH_DATA_STREAM, privilegeExpire);
    }

    token.addService(serviceRtc);

    return await token.build();
  }
}

// ==================== UID Generation ====================
function generateUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Ensure positive non-zero UID
  return (Math.abs(hash) % 100000000) || 1;
}

// ==================== Main Handler ====================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();

    console.log("Agora token request:", { sessionId, userId, userName, isHost });

    if (!sessionId || !userId) {
      throw new Error("Missing sessionId or userId");
    }

    const AGORA_APP_ID = Deno.env.get("AGORA_APP_ID");
    const AGORA_APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE");

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error("Agora credentials not configured");
      throw new Error("Agora credentials not configured");
    }

    console.log("Agora App ID:", AGORA_APP_ID.substring(0, 8) + "...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine if user can publish
    let canPublish = isHost;

    if (!isHost && !sessionId.startsWith("demo-")) {
      const { data: participant } = await supabase
        .from("podcast_participants")
        .select("role")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .single();

      if (participant) {
        canPublish = ["host", "co_host", "speaker"].includes(participant.role);
      }
    }

    // Generate channel name and UID
    const channelName = `podcast-${sessionId}`;
    const uid = generateUid(userId);
    const role = canPublish ? Role.PUBLISHER : Role.SUBSCRIBER;

    // Token expires in 2 hours
    const tokenExpire = 7200;
    const privilegeExpire = Math.floor(Date.now() / 1000) + 7200;

    console.log("Generating token:", { channelName, uid, role: canPublish ? "publisher" : "subscriber" });

    const token = await RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      tokenExpire,
      privilegeExpire
    );

    console.log("Token generated, length:", token.length);

    return new Response(
      JSON.stringify({
        appId: AGORA_APP_ID,
        channelName,
        token,
        uid,
        canPublish,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agora token error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
