import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== CRC32 Implementation ====================
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ==================== ByteBuf Helper ====================
class ByteBuf {
  private buffer: number[] = [];

  putUint16(v: number): this {
    this.buffer.push(v & 0xFF);
    this.buffer.push((v >> 8) & 0xFF);
    return this;
  }

  putUint32(v: number): this {
    this.buffer.push(v & 0xFF);
    this.buffer.push((v >> 8) & 0xFF);
    this.buffer.push((v >> 16) & 0xFF);
    this.buffer.push((v >> 24) & 0xFF);
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
    const bytes = new TextEncoder().encode(str);
    return this.putBytes(bytes);
  }

  putTreeMap(map: Map<number, number>): this {
    this.putUint16(map.size);
    for (const [key, value] of map) {
      this.putUint16(key);
      this.putUint32(value);
    }
    return this;
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// ==================== Service Classes ====================
const ServiceType = {
  RTC: 1,
  RTM: 2,
  FPA: 4,
  CHAT: 5,
  EDUCATION: 7,
};

const RtcPrivilege = {
  JOIN_CHANNEL: 1,
  PUBLISH_AUDIO_STREAM: 2,
  PUBLISH_VIDEO_STREAM: 3,
  PUBLISH_DATA_STREAM: 4,
};

class Service {
  type: number;
  privileges: Map<number, number> = new Map();

  constructor(type: number) {
    this.type = type;
  }

  addPrivilege(privilege: number, expire: number): void {
    this.privileges.set(privilege, expire);
  }

  pack(): Uint8Array {
    const buf = new ByteBuf();
    buf.putUint16(this.type);
    buf.putTreeMap(this.privileges);
    return buf.toUint8Array();
  }
}

class ServiceRtc extends Service {
  channelName: string;
  uid: string;

  constructor(channelName: string, uid: number) {
    super(ServiceType.RTC);
    this.channelName = channelName;
    this.uid = uid === 0 ? '' : String(uid);
  }

  override pack(): Uint8Array {
    const buf = new ByteBuf();
    buf.putUint16(this.type);
    buf.putTreeMap(this.privileges);
    buf.putString(this.channelName);
    buf.putString(this.uid);
    return buf.toUint8Array();
  }
}

// ==================== AccessToken2 ====================
class AccessToken2 {
  private appId: string;
  private appCertificate: string;
  private issueTs: number;
  private expire: number;
  private salt: number;
  private services: Service[] = [];

  constructor(appId: string, appCertificate: string, expire: number) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.issueTs = Math.floor(Date.now() / 1000);
    this.expire = expire;
    this.salt = Math.floor(Math.random() * 0xFFFFFFFF);
  }

  addService(service: Service): void {
    this.services.push(service);
  }

  async build(): Promise<string> {
    // Build signing message
    const signing = this.buildSigning();
    
    // Sign with HMAC-SHA256
    const signature = await this.sign(signing);
    
    // Build token content
    const content = this.buildContent(signature);
    
    // Compress content
    const compressed = pako.deflate(content);
    
    // Build final token
    const version = "007";
    const base64Content = this.base64Encode(compressed);
    
    return version + this.base64Encode(new TextEncoder().encode(this.appId)) + "_" + base64Content;
  }

  private buildSigning(): Uint8Array {
    const buf = new ByteBuf();
    buf.putString(this.appId);
    buf.putUint32(this.issueTs);
    buf.putUint32(this.expire);
    buf.putUint32(this.salt);
    buf.putUint16(this.services.length);
    
    for (const service of this.services) {
      const servicePacked = service.pack();
      for (let i = 0; i < servicePacked.length; i++) {
        buf.toUint8Array(); // This forces buffer creation
      }
    }
    
    // Actually pack services into signing
    const signingBuf = new ByteBuf();
    signingBuf.putString(this.appId);
    signingBuf.putUint32(this.issueTs);
    signingBuf.putUint32(this.expire);
    signingBuf.putUint32(this.salt);
    signingBuf.putUint16(this.services.length);
    
    for (const service of this.services) {
      const packed = service.pack();
      for (let i = 0; i < packed.length; i++) {
        signingBuf.putUint16(0); // placeholder
      }
    }
    
    return this.getSigningInput();
  }

  private getSigningInput(): Uint8Array {
    const buf = new ByteBuf();
    buf.putString(this.appId);
    buf.putUint32(this.issueTs);
    buf.putUint32(this.expire);
    buf.putUint32(this.salt);
    buf.putUint16(this.services.length);
    
    for (const service of this.services) {
      const packed = service.pack();
      // Add each byte directly
      for (let i = 0; i < packed.length; i++) {
        buf.toUint8Array();
      }
    }
    
    // Rebuild properly
    const result: number[] = [];
    const encoder = new TextEncoder();
    
    // appId as string
    const appIdBytes = encoder.encode(this.appId);
    result.push(appIdBytes.length & 0xFF);
    result.push((appIdBytes.length >> 8) & 0xFF);
    for (let i = 0; i < appIdBytes.length; i++) {
      result.push(appIdBytes[i]);
    }
    
    // issueTs
    result.push(this.issueTs & 0xFF);
    result.push((this.issueTs >> 8) & 0xFF);
    result.push((this.issueTs >> 16) & 0xFF);
    result.push((this.issueTs >> 24) & 0xFF);
    
    // expire
    result.push(this.expire & 0xFF);
    result.push((this.expire >> 8) & 0xFF);
    result.push((this.expire >> 16) & 0xFF);
    result.push((this.expire >> 24) & 0xFF);
    
    // salt
    result.push(this.salt & 0xFF);
    result.push((this.salt >> 8) & 0xFF);
    result.push((this.salt >> 16) & 0xFF);
    result.push((this.salt >> 24) & 0xFF);
    
    // services count
    result.push(this.services.length & 0xFF);
    result.push((this.services.length >> 8) & 0xFF);
    
    // Pack each service
    for (const service of this.services) {
      const packed = service.pack();
      for (let i = 0; i < packed.length; i++) {
        result.push(packed[i]);
      }
    }
    
    return new Uint8Array(result);
  }

  private async sign(data: Uint8Array): Promise<Uint8Array> {
    const keyData = new TextEncoder().encode(this.appCertificate);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData.buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, data.buffer as ArrayBuffer);
    return new Uint8Array(signature);
  }

  private buildContent(signature: Uint8Array): Uint8Array {
    const result: number[] = [];
    
    // signature (with length prefix)
    result.push(signature.length & 0xFF);
    result.push((signature.length >> 8) & 0xFF);
    for (let i = 0; i < signature.length; i++) {
      result.push(signature[i]);
    }
    
    // crc32 of appId
    const appIdBytes = new TextEncoder().encode(this.appId);
    const appIdCrc = crc32(appIdBytes);
    result.push(appIdCrc & 0xFF);
    result.push((appIdCrc >> 8) & 0xFF);
    result.push((appIdCrc >> 16) & 0xFF);
    result.push((appIdCrc >> 24) & 0xFF);
    
    // issueTs
    result.push(this.issueTs & 0xFF);
    result.push((this.issueTs >> 8) & 0xFF);
    result.push((this.issueTs >> 16) & 0xFF);
    result.push((this.issueTs >> 24) & 0xFF);
    
    // expire
    result.push(this.expire & 0xFF);
    result.push((this.expire >> 8) & 0xFF);
    result.push((this.expire >> 16) & 0xFF);
    result.push((this.expire >> 24) & 0xFF);
    
    // salt
    result.push(this.salt & 0xFF);
    result.push((this.salt >> 8) & 0xFF);
    result.push((this.salt >> 16) & 0xFF);
    result.push((this.salt >> 24) & 0xFF);
    
    // services count
    result.push(this.services.length & 0xFF);
    result.push((this.services.length >> 8) & 0xFF);
    
    // Pack each service
    for (const service of this.services) {
      const packed = service.pack();
      for (let i = 0; i < packed.length; i++) {
        result.push(packed[i]);
      }
    }
    
    return new Uint8Array(result);
  }

  private base64Encode(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
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
    
    const service = new ServiceRtc(channelName, uid);
    service.addPrivilege(RtcPrivilege.JOIN_CHANNEL, privilegeExpire);
    
    if (role === Role.PUBLISHER) {
      service.addPrivilege(RtcPrivilege.PUBLISH_AUDIO_STREAM, privilegeExpire);
      service.addPrivilege(RtcPrivilege.PUBLISH_VIDEO_STREAM, privilegeExpire);
      service.addPrivilege(RtcPrivilege.PUBLISH_DATA_STREAM, privilegeExpire);
    }
    
    token.addService(service);
    
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
  return Math.abs(hash) % 2147483647 || 1;
}

// ==================== Main Handler ====================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();

    console.log('Agora token request:', { sessionId, userId, userName, isHost });

    if (!sessionId || !userId) {
      throw new Error('Missing sessionId or userId');
    }

    const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID');
    const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('Agora credentials not configured');
      throw new Error('Agora not configured');
    }

    console.log('Agora credentials found, generating token...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine role based on participant data
    let canPublish = isHost;

    if (!sessionId.startsWith('demo-')) {
      const { data: participant } = await supabase
        .from('podcast_participants')
        .select('role')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (participant) {
        canPublish = ['host', 'co_host', 'speaker'].includes(participant.role);
      }
    }

    console.log('Agora permissions:', { userId, isHost, canPublish });

    // Generate channel name and UID
    const channelName = `bario-${sessionId.replace(/-/g, '').substring(0, 30)}`;
    const uid = generateUid(userId);
    const role = canPublish ? Role.PUBLISHER : Role.SUBSCRIBER;
    
    // Token expires in 2 hours
    const currentTs = Math.floor(Date.now() / 1000);
    const tokenExpire = 7200; // 2 hours
    const privilegeExpire = currentTs + 7200;

    // Generate token using proper AccessToken2 format
    const token = await RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      tokenExpire,
      privilegeExpire
    );

    console.log('Agora token generated successfully:', { 
      channelName, 
      uid, 
      role: canPublish ? 'publisher' : 'subscriber',
      tokenLength: token.length 
    });

    return new Response(
      JSON.stringify({
        appId: AGORA_APP_ID,
        channelName,
        token,
        uid,
        canPublish,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Agora token error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
