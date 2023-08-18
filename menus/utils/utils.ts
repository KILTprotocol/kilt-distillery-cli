import {
  ChainHelpers,
  Did,
  CType,
  Utils,
  KeyringPair,
  KiltKeyringPair,
  ConfigService,
  Blockchain,
  ICType,
  DidDocument,
  Attestation,
  ICredential,
  SignCallback,
} from '@kiltprotocol/sdk-js'

import { status } from '../_prompts'
import chalk from 'chalk'
import { Keypairs, Presentation } from '../../types/types'

const signingKeyPairType = 'sr25519'

export type KeyToolSignCallback = (didDocument: DidDocument) => SignCallback

/**
 * Generates a callback that can be used for signing.
 *
 * @param keypair The keypair to use for signing.
 * @returns The callback.
 */
export function makeSignCallback(
  keypair: KiltKeyringPair
): KeyToolSignCallback {
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

export async function isCtypeOnChain(ctype: ICType): Promise<boolean> {
  try {
    await CType.verifyStored(ctype)
    return true
  } catch {
    return false
  }
}
export const resolveOn = ChainHelpers.Blockchain.IS_FINALIZED

export async function loadBalance(account: KiltKeyringPair, testnet: any) {
  const api = ConfigService.get('api')

  let balance = parseInt(
    (await api.query.system.account(account.address)).data.free.toString()
  )
  if (balance < 3) {
    const message = testnet
      ? chalk.red(
          `get testnet tokens to continue => https://faucet.peregrine.kilt.io/?${account.address}`
        )
      : chalk.red(
          `balance too low... to continue send 3 or more KILT to: ${account.address}`
        )

    await status(message)
    while (balance < 3) {
      balance = parseInt(
        (await api.query.system.account(account.address)).data.free.toString()
      )
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

export async function loadAccount(seed: string): Promise<KiltKeyringPair> {
  await status('loading account...')
  return Utils.Crypto.makeKeypairFromUri(seed, signingKeyPairType)
}

export async function getKeypairs(mnemonic: string): Promise<Keypairs> {
  const authentication = Utils.Crypto.makeKeypairFromUri(
    mnemonic,
    signingKeyPairType
  )

  const assertionMethod = Utils.Crypto.makeKeypairFromUri(
    mnemonic,
    signingKeyPairType
  )

  const keyAgreement = Utils.Crypto.makeEncryptionKeypairFromSeed(
    Utils.Crypto.mnemonicToMiniSecret(mnemonic)
  )

  return {
    authentication,
    assertionMethod,
    keyAgreement,
  }
}

export async function getDidDoc(
  account: KiltKeyringPair,
  keypairs: Keypairs,
  network: string | string[]
): Promise<DidDocument> {
  await status('checking for existing DID...')
  const api = ConfigService.get('api')

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

export async function getAllSocialCTypes(
  account: KiltKeyringPair,
  keypairs: Keypairs
) {
  const ctypeTx: string[] = []
  const githubCType = CType.fromProperties('GitHub', {
    Username: {
      type: 'string',
    },
    'User ID': {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain(githubCType))) {
    ctypeTx.push(CType.toChain(githubCType))
  }

  const discordCType = CType.fromProperties('Discord', {
    Username: {
      type: 'string',
    },
    Discriminator: {
      type: 'string',
    },
    'User ID': {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain(discordCType))) {
    ctypeTx.push(CType.toChain(discordCType))
  }

  const emailCType = CType.fromProperties('Email', {
    Email: {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain(emailCType))) {
    ctypeTx.push(CType.toChain(emailCType))
  }

  const twitchCType = CType.fromProperties('Twitch', {
    Username: {
      type: 'string',
    },
    'User ID': {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain(twitchCType))) {
    ctypeTx.push(CType.toChain(twitchCType))
  }

  const twitterCType = CType.fromProperties('Twitter', {
    Twitter: {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain(twitterCType))) {
    ctypeTx.push(CType.toChain(twitterCType))
  }

  if (ctypeTx.length > 0) {
    const api = ConfigService.get('api')

    const { authentication, assertionMethod } = keypairs

    const didUri = Did.getFullDidUriFromKey(authentication)

    const didResolved = await Did.resolve(didUri)

    if (!didResolved?.document) {
      throw new Error('Document of resolved DID not found')
    }

    const assertionCallback = makeSignCallback(assertionMethod)

    const assertionSign = assertionCallback(didResolved.document)

    const extrinsics = ctypeTx.map((tx) => {
      return api.tx.ctype.add(tx)
    })

    // DID batch authorize is currently not useable
    if (extrinsics.filter((val) => val)) {
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
    }
  }

  return { githubCType, discordCType, emailCType, twitchCType, twitterCType }
}

export async function attestClaim(
  credentials: Array<{ ctype: string; credential: ICredential }>,
  account: KiltKeyringPair,
  keypairs: Keypairs
): Promise<Array<Presentation>> {
  const api = ConfigService.get('api')

  const { authentication, assertionMethod } = keypairs

  const didUri = Did.getFullDidUriFromKey(authentication)

  const didResolved = await Did.resolve(didUri)

  if (!didResolved?.document) {
    throw new Error('Document of resolved DID not found')
  }

  const assertionCallback = makeSignCallback(assertionMethod)

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
