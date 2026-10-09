(() => {
  "use strict";
  const content = {
    bip39: {
      tag:"KEY MANAGEMENT", title:"BIP-39 — Mnemonic and seed",
      text:"BIP-39 defines how entropy plus a checksum is represented as a sequence of words, and how that mnemonic (optionally with a passphrase) is converted to a seed using PBKDF2-HMAC-SHA512 with 2048 iterations. The seed is input material for HD derivation; it is not the Ethereum address.",
      io:"Mnemonic + optional passphrase  →  512-bit seed",
      caveat:"A mnemonic is sensitive recovery material. This educational page deliberately does not ask you to enter one."
    },
    bip32: {
      tag:"DETERMINISTIC DERIVATION", title:"BIP-32 — Hierarchical deterministic keys",
      text:"BIP-32 defines a tree of keys derived deterministically from a seed. Extended private/public keys contain key material and chain-code information used to derive child keys. Some child derivation modes can be performed with public data alone, while hardened derivation requires private material.",
      io:"Seed  →  master key pair + chain code  →  child keys",
      caveat:"Deterministic derivation makes backups practical, but exposure of secret material can compromise derived keys."
    },
    bip44: {
      tag:"PATH CONVENTION", title:"BIP-44 — Multi-account hierarchy",
      text:"BIP-44 specifies a common path structure for organizing coin types, accounts, and address chains. Ethereum commonly uses coin type 60. A derivation path is a convention for selecting a key in the tree; BIP-44 does not perform the elliptic-curve operation itself.",
      io:"m / purpose' / coin_type' / account' / change / address_index",
      caveat:"Wallets can support different paths. If restoring a wallet, the path and account discovery behavior matter."
    },
    secp: {
      tag:"PUBLIC-KEY CRYPTOGRAPHY", title:"secp256k1 — Private key to public key",
      text:"A private key is a valid scalar k in the curve's permitted range. The public key is Q = kG, where G is the standard generator. The operation is efficient in the forward direction; recovering k from Q is believed to be computationally infeasible with appropriate parameters and no implementation flaw.",
      io:"Private scalar k  →  elliptic-curve scalar multiplication  →  public point Q",
      caveat:"This is not the toy curve from Homework 1. Real secp256k1 uses a very large field and standardized domain parameters."
    },
    keccak: {
      tag:"HASHING", title:"Keccak-256 — Public key to address",
      text:"For a standard Ethereum externally owned account, take the uncompressed public key without its 0x04 prefix, hash the 64 coordinate bytes with Keccak-256, then keep the final 20 bytes. The result is the 160-bit address value.",
      io:"64-byte public-key coordinates  →  Keccak-256 digest (32 bytes)  →  last 20 bytes",
      caveat:"Ethereum Keccak-256 is not identical to standardized SHA3-256. Using the wrong variant yields a different digest and address."
    },
    eip55: {
      tag:"CHECKSUM / TEXT ENCODING", title:"EIP-55 — Mixed-case checksum",
      text:"EIP-55 computes Keccak-256 over the lowercase hexadecimal address text (without the 0x prefix) and uses the corresponding hash nibbles to decide the case of letters a–f. The underlying 20-byte address stays the same.",
      io:"20-byte address  →  lowercase hex text  →  Keccak-based case pattern",
      caveat:"EIP-55 helps detect many transcription mistakes. It does not encrypt an address, sign it, or prove that a user controls it."
    }
  };
  const buttons = [...document.querySelectorAll(".pipeline-step")];
  function select(id){
    const item=content[id]; if(!item) return;
    buttons.forEach(b=>b.classList.toggle("active",b.dataset.id===id));
    document.getElementById("detailTag").textContent=item.tag;
    document.getElementById("detailTitle").textContent=item.title;
    document.getElementById("detailText").textContent=item.text;
    document.getElementById("detailIO").textContent=item.io;
    document.getElementById("detailCaveat").textContent=item.caveat;
  }
  buttons.forEach(b=>b.addEventListener("click",()=>select(b.dataset.id)));
  select("bip39");
})();