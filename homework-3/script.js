"use strict";

const $ = (id) => document.getElementById(id);
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const englishFreq = [8.167,1.492,2.782,4.253,12.702,2.228,2.015,6.094,6.966,0.153,0.772,4.025,2.406,6.749,7.507,1.929,0.095,5.987,6.327,9.056,2.758,0.978,2.360,0.150,1.974,0.074];

// secp256k1: y^2 = x^3 + 7 (mod p), with standard generator G.
const p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
const n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const G = {
  x: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
  y: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
};
const INF = null;

function mod(a, m = p) { const r = a % m; return r < 0n ? r + m : r; }
function powMod(a, e, m) {
  let result = 1n, base = mod(a, m), exp = e;
  while (exp > 0n) { if (exp & 1n) result = result * base % m; base = base * base % m; exp >>= 1n; }
  return result;
}
function inv(a, m = p) {
  if (mod(a, m) === 0n) throw new Error("No modular inverse for zero.");
  // Extended Euclidean algorithm
  let [oldR, r] = [mod(a, m), m], [oldS, s] = [1n, 0n];
  while (r !== 0n) { const q = oldR / r; [oldR, r] = [r, oldR - q * r]; [oldS, s] = [s, oldS - q * s]; }
  if (oldR !== 1n) throw new Error("Value is not invertible.");
  return mod(oldS, m);
}
function pointAdd(P, Q) {
  if (P === INF) return Q;
  if (Q === INF) return P;
  if (P.x === Q.x && mod(P.y + Q.y) === 0n) return INF;
  let slope;
  if (P.x === Q.x && P.y === Q.y) {
    if (P.y === 0n) return INF;
    slope = mod(3n * P.x * P.x * inv(2n * P.y));
  } else {
    slope = mod((Q.y - P.y) * inv(Q.x - P.x));
  }
  const x = mod(slope * slope - P.x - Q.x);
  const y = mod(slope * (P.x - x) - P.y);
  return {x, y};
}
function scalarMult(k, P = G) {
  let result = INF, addend = P, scalar = k;
  while (scalar > 0n) { if (scalar & 1n) result = pointAdd(result, addend); addend = pointAdd(addend, addend); scalar >>= 1n; }
  return result;
}
function pointNeg(P) { return P === INF ? INF : {x: P.x, y: mod(-P.y)}; }
function pointSub(P, Q) { return pointAdd(P, pointNeg(Q)); }
function pointText(P) { return P === INF ? "point at infinity" : `(${P.x.toString(16).slice(0, 18)}… , ${P.y.toString(16).slice(0, 18)}…)`; }
function readInt(id, min, max) {
  const value = Number($(id).value);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Enter an integer from ${min} to ${max}.`);
  return BigInt(value);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function metric(label, value) { return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`; }

function utf8Bytes(s) { return Array.from(new TextEncoder().encode(s)); }
function eccEncryptDecrypt(message, d, r) {
  if (d <= 0n || d >= n || r <= 0n || r >= n) throw new Error("Scalars must be in the valid curve range.");
  const Q = scalarMult(d);
  const C1 = scalarMult(r);
  const shared = scalarMult(r, Q);
  const bytes = utf8Bytes(message);
  const encoded = bytes.map(b => pointAdd(scalarMult(BigInt(b)), shared));
  const decoded = encoded.map(P => {
    const M = pointSub(P, scalarMult(d, C1));
    // Toy discrete-log lookup restricted to the 256 possible byte values.
    for (let b = 0; b <= 255; b++) {
      const candidate = scalarMult(BigInt(b));
      if (candidate === INF && M === INF) return b;
      if (candidate && M && candidate.x === M.x && candidate.y === M.y) return b;
    }
    throw new Error("Byte lookup failed; the ciphertext could not be decoded.");
  });
  return {Q, C1, shared, bytes, encoded, decoded, recovered: new TextDecoder().decode(new Uint8Array(decoded))};
}
function runECC() {
  try {
    const message = $("ecc-message").value;
    const d = readInt("ecc-private", 1, 1000);
    const r = readInt("ecc-ephemeral", 1, 1000);
    const out = eccEncryptDecrypt(message, d, r);
    $("ecc-output").innerHTML = `
      <div class="metric-grid">${metric("UTF-8 bytes", out.bytes.length)}${metric("Private key d", d)}${metric("Ephemeral r", r)}${metric("Round-trip", out.recovered === message ? "SUCCESS" : "FAILED")}</div>
      <p><strong>Public key Q = dG:</strong> <code>${pointText(out.Q)}</code></p>
      <p><strong>C1 = rG:</strong> <code>${pointText(out.C1)}</code></p>
      <p><strong>Shared point rQ = rdG:</strong> <code>${pointText(out.shared)}</code></p>
      <p><strong>First three ciphertext C2 points:</strong></p><pre>${out.encoded.slice(0,3).map((P,i)=>`byte ${i}: ${pointText(P)}`).join("\n") || "(empty message)"}${out.encoded.length > 3 ? `\n… ${out.encoded.length-3} more points omitted` : ""}</pre>
      <p><strong>Recovered message:</strong> ${escapeHtml(out.recovered)}</p>
      <p class="small-note">The ciphertext pairs are (C1, C2ᵢ). C1 is reused within this one demonstration for compactness; real protocols require carefully designed randomness and authenticated encryption.</p>`;
  } catch (e) { $("ecc-output").innerHTML = `<p class="warning">${escapeHtml(e.message)}</p>`; }
}
$("ecc-run").addEventListener("click", runECC);
$("ecc-random").addEventListener("click", () => { $("ecc-ephemeral").value = String(1 + Math.floor(Math.random()*1000)); runECC(); });

function caesar(text, shift) {
  return text.replace(/[a-z]/gi, ch => {
    const base = ch === ch.toUpperCase() ? 65 : 97;
    return String.fromCharCode((ch.charCodeAt(0)-base+shift+26)%26+base);
  });
}
$("caesar-run").addEventListener("click", () => {
  try {
    const message = $("caesar-message").value, key = Number($("caesar-key").value);
    if (!Number.isInteger(key) || key < 0 || key > 25) throw new Error("Enter a shift from 0 to 25.");
    const cipher = caesar(message, key);
    $("caesar-output").innerHTML = `<p><strong>Encrypted:</strong> ${escapeHtml(cipher)}</p><p><strong>Decrypted with key ${key}:</strong> ${escapeHtml(caesar(cipher, -key))}</p><p class="small-note">The transformation is reversible because decryption applies the opposite shift modulo 26.</p>`;
  } catch(e) { $("caesar-output").innerHTML = `<p class="warning">${escapeHtml(e.message)}</p>`; }
});

function chiSquare(text) {
  const counts = Array(26).fill(0);
  for (const ch of text.toUpperCase()) { const i = ch.charCodeAt(0)-65; if (i>=0 && i<26) counts[i]++; }
  const total = counts.reduce((a,b)=>a+b,0);
  if (total === 0) return Infinity;
  return counts.reduce((sum, count, i) => {
    const expected = total * englishFreq[i] / 100;
    return sum + (count-expected)**2 / Math.max(expected, 1e-9);
  }, 0);
}
function rankCaesar(ciphertext) {
  return Array.from({length:26}, (_, key) => {
    const plaintext = caesar(ciphertext, -key);
    return {key, plaintext, score: chiSquare(plaintext)};
  }).sort((a,b)=>a.score-b.score);
}
function renderAttack(text, targetId) {
  const ranked = rankCaesar(text);
  const rows = ranked.slice(0,5).map(x=>`<tr><td>${x.key}</td><td>${x.score.toFixed(2)}</td><td>${escapeHtml(x.plaintext.slice(0,100))}</td></tr>`).join("");
  $(targetId).innerHTML = `<p><strong>Best candidate shift:</strong> ${ranked[0].key} <span class="small-note">(lowest chi-square score)</span></p><p><strong>Candidate plaintext:</strong> ${escapeHtml(ranked[0].plaintext)}</p><div class="table-wrap"><table><thead><tr><th>Shift</th><th>χ² score</th><th>Candidate preview</th></tr></thead><tbody>${rows}</tbody></table></div><p class="small-note">Lower scores are better under this English-frequency model. A low score does not guarantee the plaintext is meaningful.</p>`;
  return ranked[0];
}
$("attack-run").addEventListener("click", () => {
  const text = $("attack-ciphertext").value;
  if (!/[a-z]/i.test(text)) { $("attack-output").innerHTML = "<p class='warning'>Enter a ciphertext containing letters A–Z.</p>"; return; }
  renderAttack(text, "attack-output");
});

const englishSample = `Cryptography studies methods for protecting information and the assumptions that make those methods secure. A simple cipher can be useful for learning because its operations are easy to inspect, but a small key space and predictable patterns can make an attack practical. Statistical methods become more reliable when a ciphertext contains enough text from the language used to create it.`;
$("length-run").addEventListener("click", () => {
  const actualKey = 11;
  const lengths = [20, 40, 80, 160, 320];
  const rows = lengths.map(len => {
    let plain = (englishSample + " ").repeat(Math.ceil(len/englishSample.length)).slice(0,len);
    const cipher = caesar(plain, actualKey);
    const ranked = rankCaesar(cipher);
    return `<tr><td>${len}</td><td>${ranked[0].key}</td><td>${ranked[0].key===actualKey ? "Yes" : "No"}</td><td>${ranked[0].score.toFixed(2)}</td></tr>`;
  }).join("");
  $("length-output").innerHTML = `<p>Known experimental shift: <strong>${actualKey}</strong>. The same source passage is truncated to each length.</p><div class="table-wrap"><table><thead><tr><th>Letters/characters*</th><th>Estimated key</th><th>Correct?</th><th>Best χ²</th></tr></thead><tbody>${rows}</tbody></table></div><p class="small-note">*Length is measured in text characters, including spaces and punctuation. The scorer itself uses only A–Z letters.</p>`;
});

$("ecc-attack-run").addEventListener("click", () => {
  try {
    const secret = readInt("attack-private",1,1000);
    const limit = readInt("attack-limit",1,1000);
    const publicKey = scalarMult(secret);
    let found = null, attempts = 0;
    for (let candidate=1n; candidate<=limit; candidate++) {
      attempts++;
      const Q = scalarMult(candidate);
      if (Q && Q.x===publicKey.x && Q.y===publicKey.y) { found = candidate; break; }
    }
    $("ecc-attack-output").innerHTML = `<div class="metric-grid">${metric("Candidates checked", attempts)}${metric("Key recovered", found === null ? "No" : found.toString())}${metric("Range tested", `1–${limit}`)}</div><p><strong>Public point Q:</strong> <code>${pointText(publicKey)}</code></p>${found===null ? `<p class="warning">No match found. The real private key may be outside the tested interval.</p>` : `<p class="success">Match found: ${found}G = Q. ${found===secret ? "The recovered key equals the secret used to create the public key." : "A match was found in the candidate range."}</p>`}<p class="small-note">This attack uses the known small range, not language statistics. Its work grows linearly with the number of candidates in this simple implementation.</p>`;
  } catch(e) { $("ecc-attack-output").innerHTML = `<p class="warning">${escapeHtml(e.message)}</p>`; }
});

// Initialize the two demonstrations so the page is useful immediately.
runECC();
$("caesar-run").click();
