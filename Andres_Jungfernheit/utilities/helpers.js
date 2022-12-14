import { Crypto} from "@kiltprotocol/utils";
import { cryptoWaitReady } from "@polkadot/util-crypto";
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
      const { box, nonce } = Crypto.encryptAsymmetric(
        data,
        peerPublicKey,
        keyAgreementKey.secretKey
      )
      return {
        nonce,
        data: box,
        keyUri: `${didDocument.uri}${keyId}`,
      }
    }
  }
}
export function makeDecryptCallback(
  keyAgreementKey
) {
  return async function decryptCallback({ data, nonce, peerPublicKey }) {
    const decrypted = Crypto.decryptAsymmetric(
      { box: data, nonce },
      peerPublicKey,
      keyAgreementKey.secretKey
    )
    if (decrypted === false) throw new Error('Decryption failed')
    return { data: decrypted }
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