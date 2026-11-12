// Agora RTC access-token builder (AccessToken2 / "007" tokens).
//
// Mirrors the official AgoraIO/Tools `RtcTokenBuilder2` implementation:
//   content = lp(string(signature)) + signingInfo
//   signingInfo = lp(appId) + issueTs(u32) + expire(u32) + salt(u32) + serviceCount(u16) + services
//   signature = HMAC-SHA256(HMAC-SHA256(cert, issueTs) -> HMAC(salt), signingInfo)
//   token = "007" + base64(zlib(content))
//
// SECURITY NOTE: minting tokens on the device means the App Certificate ships inside the
// app bundle. That is acceptable for this demo build but should be moved to a trusted
// server endpoint (see backend/) before going to production.

const VERSION = '007';
const SERVICE_TYPE_RTC = 1;

const PRIVILEGE_JOIN_CHANNEL = 1;
const PRIVILEGE_PUBLISH_AUDIO_STREAM = 2;
const PRIVILEGE_PUBLISH_VIDEO_STREAM = 3;
const PRIVILEGE_PUBLISH_DATA_STREAM = 4;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (value: number, bits: number) => ((value >>> bits) | (value << (32 - bits))) >>> 0;

const toBytes = (input: string | Uint8Array): Uint8Array => {
  if (input instanceof Uint8Array) return input;
  // Channel names / app ids / certificates are ASCII, but keep it safe for UTF-8.
  const encoded = unescape(encodeURIComponent(input));
  const bytes = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) bytes[i] = encoded.charCodeAt(i);
  return bytes;
};

const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
};

const sha256 = (data: Uint8Array): Uint8Array => {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLength = data.length * 8;
  const paddedLength = (((data.length + 9) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let k = h[7];

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (k + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      k = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + k) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let i = 0; i < 8; i += 1) digestView.setUint32(i * 4, h[i], false);
  return digest;
};

const hmacSha256 = (key: Uint8Array, message: Uint8Array): Uint8Array => {
  const blockKey = new Uint8Array(64);
  blockKey.set(key.length > 64 ? sha256(key) : key);

  const innerPad = new Uint8Array(64);
  const outerPad = new Uint8Array(64);
  for (let i = 0; i < 64; i += 1) {
    innerPad[i] = blockKey[i] ^ 0x36;
    outerPad[i] = blockKey[i] ^ 0x5c;
  }

  return sha256(concatBytes(outerPad, sha256(concatBytes(innerPad, message))));
};

const adler32 = (data: Uint8Array): number => {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i += 1) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

// zlib stream made of "stored" deflate blocks. Valid input for any inflate implementation
// (the Agora servers inflate the token payload) and dependency-free on every JS runtime.
const zlibDeflate = (data: Uint8Array): Uint8Array => {
  const MAX_BLOCK = 65535;
  const blockCount = Math.max(1, Math.ceil(data.length / MAX_BLOCK));
  const out = new Uint8Array(2 + blockCount * 5 + data.length + 4);
  let pos = 0;

  out[pos++] = 0x78; // CMF: deflate, 32K window
  out[pos++] = 0x01; // FLG: no dict, fastest

  for (let block = 0; block < blockCount; block += 1) {
    const start = block * MAX_BLOCK;
    const end = Math.min(data.length, start + MAX_BLOCK);
    const length = end - start;
    out[pos++] = block === blockCount - 1 ? 0x01 : 0x00; // final / non-final stored block
    out[pos++] = length & 0xff;
    out[pos++] = (length >>> 8) & 0xff;
    out[pos++] = ~length & 0xff;
    out[pos++] = (~length >>> 8) & 0xff;
    out.set(data.subarray(start, end), pos);
    pos += length;
  }

  const checksum = adler32(data);
  out[pos++] = (checksum >>> 24) & 0xff;
  out[pos++] = (checksum >>> 16) & 0xff;
  out[pos++] = (checksum >>> 8) & 0xff;
  out[pos++] = checksum & 0xff;

  return out.subarray(0, pos);
};

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const base64Encode = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? BASE64_CHARS[b2 & 0x3f] : '=';
  }
  return out;
};

// Little-endian byte writer matching Agora's ByteBuf (u16 length-prefixed strings).
class ByteBuf {
  private bytes: number[] = [];

  u16(value: number): this {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff);
    return this;
  }

  u32(value: number): this {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
    return this;
  }

  lpString(value: string): this {
    const encoded = toBytes(value);
    this.u16(encoded.length);
    encoded.forEach((byte) => this.bytes.push(byte));
    return this;
  }

  raw(data: Uint8Array): this {
    data.forEach((byte) => this.bytes.push(byte));
    return this;
  }

  array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

export interface RtcTokenOptions {
  appId: string;
  appCertificate: string;
  channelName: string;
  /** 32-bit unsigned integer between 1 and 2^32 - 1. */
  uid: number;
  /** Validity of the token / privileges, in seconds from now. */
  expireSeconds?: number;
}

/** Builds an Agora RTC token with publisher privileges (join + publish audio/video/data). */
export function buildRtcToken({
  appId,
  appCertificate,
  channelName,
  uid,
  expireSeconds = 14400,
}: RtcTokenOptions): string {
  const issueTs = Math.floor(Date.now() / 1000);
  const salt = Math.floor(Math.random() * 99999999) + 1;

  const rtcService = new ByteBuf()
    .u16(SERVICE_TYPE_RTC)
    .u16(4)
    .u16(PRIVILEGE_JOIN_CHANNEL)
    .u32(expireSeconds)
    .u16(PRIVILEGE_PUBLISH_AUDIO_STREAM)
    .u32(expireSeconds)
    .u16(PRIVILEGE_PUBLISH_VIDEO_STREAM)
    .u32(expireSeconds)
    .u16(PRIVILEGE_PUBLISH_DATA_STREAM)
    .u32(expireSeconds)
    .lpString(channelName)
    .lpString(String(uid))
    .array();

  const signingInfo = concatBytes(
    new ByteBuf().lpString(appId).u32(issueTs).u32(expireSeconds).u32(salt).u16(1).array(),
    rtcService
  );

  // Official derivation: key = issueTs bytes, message = app certificate, then re-keyed
  // with the salt, and finally signed over the signing info.
  const signingKey = hmacSha256(
    new ByteBuf().u32(issueTs).array(),
    toBytes(appCertificate)
  );
  const signingKeySalted = hmacSha256(new ByteBuf().u32(salt).array(), signingKey);
  const signature = hmacSha256(signingKeySalted, signingInfo);

  const content = concatBytes(new ByteBuf().u16(signature.length).raw(signature).array(), signingInfo);

  return VERSION + base64Encode(zlibDeflate(content));
}

/** Deterministic, non-zero 32-bit uid derived from an app user id (safe to call often). */
export function agoraUidFromUserId(userId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Keep it inside the documented 1 .. 2^32-1 range.
  return hash % 4294967294 + 1;
}

/** A stable Agora channel name shared by the doctor and the patient of one visit. */
export function agoraChannelForVisit(visitId: string): string {
  const safe = (visitId || 'room')
    .replace(/[^a-zA-Z0-9!#$%&()+\-:;<=.>?@[\]^_{|}~,]/g, '-')
    .slice(0, 48);
  return `homecare-visit-${safe}`;
}
