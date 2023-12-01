import { KiltKeyringPair } from '@kiltprotocol/sdk-js'
import { KeyToolSignCallback } from './KeyToolSignCallback'

/**
 * Generates a callback that can be used for signing.
 *
 * @param keypair The keypair to use for signing.
 * @returns The callback.
 */

export function makeSignCallback({
  keypair,
}: {
  keypair: KiltKeyringPair;
}): KeyToolSignCallback {
  return (didDocument) =>
    async function sign({ data, keyRelationship }) {
      const keyId = didDocument[keyRelationship]?.[0].id
      const keyType = didDocument[keyRelationship]?.[0].type
      if (keyId === undefined || keyType === undefined) {
        throw new Error(
          `Key for purpose "${keyRelationship}" not found in did "${didDocument.uri}"`
        )
      }
      const signature = keypair.sign(data, { withType: false })

      return {
        signature,
        keyUri: `${didDocument.uri}${keyId}`,
        keyType,
      }
    }
}
