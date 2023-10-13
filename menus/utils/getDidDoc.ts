import {
  Did,
  KiltKeyringPair,
  Blockchain,
  DidDocument,
} from '@kiltprotocol/sdk-js'
import { status } from '../_prompts'
import { Keypairs } from '../../types/types'
import { loadBalance } from './loadBalance'

export async function getDidDoc({
  account,
  keypairs,
  network,
}: {
  account: KiltKeyringPair
  keypairs: Keypairs
  network: string | string[]
}): Promise<DidDocument> {
  await status('checking for existing DID...')

  const { authentication, assertionMethod, keyAgreement } = keypairs

  const didUri = Did.getFullDidUriFromKey(authentication)

  let didDoc = await Did.resolve(didUri)

  if (didDoc && didDoc.document) {
    await status('DID loaded from chain...')
    return didDoc.document
  }

  await status('checking balance...')

  await loadBalance(account, network)
  const extrinsic = await Did.getStoreTx(
    {
      authentication: [authentication],
      assertionMethod: [assertionMethod],
      keyAgreement: [keyAgreement],
    },
    account.address,
    async ({ data }) => ({
      signature: authentication.sign(data),
      keyType: authentication.type,
    })
  )

  await Blockchain.signAndSubmitTx(extrinsic, account, {
    resolveOn: Blockchain.IS_FINALIZED,
  })

  didDoc = await Did.resolve(didUri)
  if (!didDoc || !didDoc.document)
    throw new Error('Could not fetch created DID document')
  await status('DID created on chain...')

  return didDoc.document
}
