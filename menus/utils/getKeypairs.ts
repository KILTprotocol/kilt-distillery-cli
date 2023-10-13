import { Utils } from '@kiltprotocol/sdk-js'
import { Keypairs } from '../../types/types'


export async function getKeypairs(mnemonic: string): Promise<Keypairs> {
  const authentication = Utils.Crypto.makeKeypairFromUri(mnemonic)

  const assertionMethod = Utils.Crypto.makeKeypairFromUri(mnemonic)

  const keyAgreement = Utils.Crypto.makeEncryptionKeypairFromSeed(
    Utils.Crypto.mnemonicToMiniSecret(mnemonic)
  )

  return {
    authentication,
    assertionMethod,
    keyAgreement,
  }
}
