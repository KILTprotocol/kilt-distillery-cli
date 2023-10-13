import {
  Did,
  KiltKeyringPair,
  ConfigService,
  Blockchain,
  Attestation,
  ICredential,
} from '@kiltprotocol/sdk-js'
import { Keypairs, Presentation } from '../../types/types'
import { makeSignCallback } from './makeSignCallback'
import { resolveOn } from './resolveOn'

export async function attestClaim({
  credentials,
  account,
  keypairs,
}: {
  credentials: Array<{ ctype: string; credential: ICredential }>
  account: KiltKeyringPair
  keypairs: Keypairs
}): Promise<Array<Presentation>> {
  const api = ConfigService.get('api')

  const { authentication, assertionMethod } = keypairs

  const didUri = Did.getFullDidUriFromKey(authentication)

  const didResolved = await Did.resolve(didUri)

  if (!didResolved?.document) {
    throw new Error('Document of resolved DID not found')
  }

  const assertionCallback = makeSignCallback({ keypair: assertionMethod })

  const assertionSign = assertionCallback(didResolved.document)

  const extrinsics = credentials.map(({ credential }) => {
    const { cTypeHash, claimHash } = Attestation.fromCredentialAndDid(
      credential,
      didUri
    )
    return api.tx.attestation.add(claimHash, cTypeHash, null)
  })

  const batch = await Did.authorizeBatch({
    batchFunction: api.tx.utility.batchAll,
    did: didUri,
    extrinsics,
    sign: assertionSign,
    submitter: account.address,
  })

  await Blockchain.signAndSubmitTx(batch, account, {
    resolveOn,
  })

  return await Promise.all(
    credentials.map(async ({ credential, ctype }) => {
      const attested = Boolean(
        await api.query.attestation.attestations(credential.rootHash)
      )

      return {
        attester: 'PeregrineSelfAttestedSocialKYC',
        cTypeTitle: ctype,
        isDownloaded: true,
        name: ctype,
        credential,
        attested,
      }
    })
  )
}
