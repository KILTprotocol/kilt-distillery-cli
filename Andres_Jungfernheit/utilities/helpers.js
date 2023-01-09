import { Crypto } from "@kiltprotocol/utils";
import { cryptoWaitReady, naclOpen, naclSeal } from "@polkadot/util-crypto";
import { getApi } from "./connection";


export const exit = (response, status, message) => {
  response.statusMessage = message;
  return response.status(status).end();
}

export async function methodNotFound(request, response) {
  response.statusMessage = `method ${method} no found`;
  response.status(400).end();
}

export function makeEncryptCallback(
  keyAgreementKey
) {
  return (didDocument) => {
    return async function encryptCallback({ data, peerPublicKey }) {
      const keyId = didDocument.keyAgreement?.[0].id
      if (!keyId) {
        throw new Error(`Encryption key not found in did "${didDocument.uri}"`)
      }
      const { sealed, nonce } = naclSeal(
        data,
        keyAgreementKey.secretKey,
        peerPublicKey,
      )
      return {
        nonce,
        data: sealed,
        keyUri: `${didDocument.uri}${keyId}`,
      }
    }
  }
}
// export function makeDecryptCallback(
//   keyAgreementKey
// ) {
//   return async function decryptCallback({ data, nonce, peerPublicKey }) {
//     const decrypted = Crypto.decryptAsymmetric(
//       { box: data, nonce },
//       peerPublicKey,
//       keyAgreementKey.secretKey
//     )
//     if (decrypted === false) throw new Error('Decryption failed')
//     return { data: decrypted }
//   }
// }

export async function decrypt({
  data,
  peerPublicKey,
  nonce,
}) {
  console.log("data on the decrypt function:", data)
  console.log("peerPublic on the decrypt function:", peerPublicKey)
  console.log("nonce on the decrypt function:", nonce)
  const { keyAgreement } = await getKeypairs()
  const decrypted = naclOpen(data, nonce, peerPublicKey, keyAgreement.secretKey)
  console.log("decrypted on the decrypt function:", decrypted)
  if (!decrypted) {
    throw new Error("Failed to decrypt with given key")
  }
  return {
    data: decrypted,
  }
}

export async function signer({
  key,
}) {
  if (!key) throw new Error('no key')

  return async ({ data }) => ({
    signature: key.sign(data),
    keyType: key.type,
  })
}