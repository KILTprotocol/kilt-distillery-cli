import {
  ChainHelpers,
  Did,
  CType,
  Utils,
  KeyringPair,
  KiltKeyringPair,
  NewDidEncryptionKey,
  ConfigService,
  Blockchain,
  KiltAddress,
  ICType,
  DidDocument,
  Attestation,
  ICredential,
} from '@kiltprotocol/sdk-js'

import {
  mnemonicToMiniSecret,
  keyExtractPath,
  keyFromPath,
  blake2AsU8a,
  naclBoxPairFromSecret,
  sr25519PairFromSeed,
} from '@polkadot/util-crypto'
import { status } from '../_prompts.js'
import chalk from 'chalk'
import { Keypair } from '@polkadot/util-crypto/types.js'
import { Presentation } from '../../types/types'

export async function isCtypeOnChain(ctype: ICType): Promise<boolean> {
  try {
    await CType.verifyStored(ctype)
    return true
  } catch {
    return false
  }
}
export const resolveOn = ChainHelpers.Blockchain.IS_FINALIZED

export async function loadAccount(seed: string) {
  await status('loading account...')
  const signingKeyPairType = 'sr25519'
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  })
  const account = keyring.addFromMnemonic(seed)
  return account
}

export async function getKeypairs(account: KeyringPair, mnemonic: string) {
  const authentication = {
    ...account.derive('//did//0'),
    type: 'sr25519',
  } as KiltKeyringPair
  const assertion = {
    ...account.derive('//did//assertion//0'),
    type: 'sr25519',
  } as KiltKeyringPair
  const keyAgreement: NewDidEncryptionKey & Keypair = (function () {
    const secretKeyPair = sr25519PairFromSeed(mnemonicToMiniSecret(mnemonic))
    const { path } = keyExtractPath('//did//keyAgreement//0')
    const { secretKey } = keyFromPath(secretKeyPair, path, 'sr25519')
    return {
      ...naclBoxPairFromSecret(blake2AsU8a(secretKey)),
      type: 'x25519',
    }
  })()

  return {
    authentication,
    assertion,
    keyAgreement,
  }
}

export async function getDidDoc(
  account: KeyringPair,
  keypairs,
  network: string | string[]
): Promise<DidDocument> {
  await status('checking for existing DID...')
  const api = ConfigService.get('api')

  const { authentication, assertion, keyAgreement } = keypairs

  const didUri = Did.getFullDidUriFromKey(authentication)

  let didDoc = await Did.resolve(didUri)

  if (didDoc && didDoc.document) {
    await status('DID loaded from chain...')
    return didDoc.document
  }

  await status('checking balance...')

  const testnet = network.indexOf('peregrine') > 0
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

  const extrinsic = await Did.getStoreTx(
    {
      authentication: [authentication],
      assertionMethod: [assertion],
      keyAgreement: [keyAgreement],
    },
    account.address as KiltAddress,
    async ({ data }) => ({
      data: authentication.sign(data),
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
  didDoc: DidDocument,
  account: KeyringPair,
  keypairs: any
) {
  const ctypeTx: string[] = []
  const githubCType = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'GitHub',
    properties: {
      Username: {
        type: 'string',
      },
      'User ID': {
        type: 'string',
      },
    },
    type: 'object',
  })

  if (!(await isCtypeOnChain(githubCType))) {
    ctypeTx.push(CType.toChain(githubCType))
  }

  const discordCType = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Discord',
    properties: {
      Username: {
        type: 'string',
      },
      Discriminator: {
        type: 'string',
      },
      'User ID': {
        type: 'string',
      },
    },
    type: 'object',
  })

  if (!(await isCtypeOnChain(discordCType))) {
    ctypeTx.push(CType.toChain(discordCType))
  }

  const emailCType = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Email',
    properties: {
      Email: {
        type: 'string',
      },
    },
    type: 'object',
  })

  if (!(await isCtypeOnChain(emailCType))) {
    ctypeTx.push(CType.toChain(emailCType))
  }

  const twitchCType = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Twitch',
    properties: {
      Username: {
        type: 'string',
      },
      'User ID': {
        type: 'string',
      },
    },
    type: 'object',
  })

  if (!(await isCtypeOnChain(twitchCType))) {
    ctypeTx.push(CType.toChain(twitchCType))
  }

  const twitterCType = CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Twitter',
    properties: {
      Twitter: {
        type: 'string',
      },
    },
    type: 'object',
  })

  if (!(await isCtypeOnChain(twitterCType))) {
    ctypeTx.push(CType.toChain(twitterCType))
  }

  if (ctypeTx.length > 0) {
    console.log('')
  }

  return { githubCType, discordCType, emailCType, twitchCType, twitterCType }
}

export async function attestClaim(
  credentials: Array<{ ctype: string; credential: ICredential }>,
  account: KiltKeyringPair,
  keypairs: any
): Promise<Array<Presentation>> {
  const api = ConfigService.get('api')

  const { authentication, assertion } = keypairs

  const didUri = Did.getFullDidUriFromKey(authentication)

  const batchTx = await Promise.all(
    credentials.map(async ({ credential }) => {
      const { cTypeHash, claimHash } = Attestation.fromCredentialAndDid(
        credential,
        didUri
      )

      const tx = api.tx.attestation.add(claimHash, cTypeHash, null)
      const extrinsic = await Did.authorizeExtrinsic(
        didUri,
        tx,
        authentication.sign,
        account.address
      )

      return extrinsic
    })
  )

  if (batchTx.filter((val) => val !== true)) {
    const batch = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: didUri,
      extrinsics: batchTx,
      sign: assertion.sign,
      submitter: account.address,
    })
    await Blockchain.signAndSubmitTx(batch, account, {
      resolveOn,
    })
  }

  return await Promise.all(
    credentials.map(async ({ credential, ctype }) => {
      const api = ConfigService.get('api')
      const attested = Boolean(
        await api.query.attestation.attestations(credential.rootHash)
      )

      return {
        attester: 'PeregrineSelfAttestedSocialKYC',
        cTypeTitle: ctype,
        isDownloaded: true,
        name: ctype,
        credential: { ...credential },
        attested,
      }
    })
  )
}
