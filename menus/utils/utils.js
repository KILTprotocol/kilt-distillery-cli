import {
  ChainHelpers,
  RequestForAttestation,
  Did,
  Attestation,
  Balance,
  CType,
  BlockchainUtils,
  Utils,
  KeyRelationship,
  VerificationKeyType,
  EncryptionKeyType,
} from '@kiltprotocol/sdk-js'
import {
  sr25519PairFromSeed,
  mnemonicToMiniSecret,
  keyExtractPath,
  keyFromPath,
  blake2AsU8a,
  encodeAddress,
  naclBoxPairFromSecret,
  cryptoWaitReady,
} from '@polkadot/util-crypto'
import { status } from '../_prompts.js'
import chalk from 'chalk'

export const resolveOn = BlockchainUtils.IS_FINALIZED

export async function loadAccount(seed) {
  await status('loading account...')
  const signingKeyPairType = 'sr25519'
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  })
  const account = keyring.addFromMnemonic(seed)
  return account
}

export async function getKeypairs(account, mnemonic) {
  await status('generating keypairs...')
  await cryptoWaitReady()
  const keypairs = {
    authentication: account.derive('//did//0'),
    assertion: account.derive('//did//assertion//0'),
    keyAgreement: (function () {
      const secretKeyPair = sr25519PairFromSeed(mnemonicToMiniSecret(mnemonic))
      const { path } = keyExtractPath('//did//keyAgreement//0')
      const { secretKey } = keyFromPath(secretKeyPair, path, 'sr25519')
      const blake = blake2AsU8a(secretKey)
      const boxPair = naclBoxPairFromSecret(blake)
      return {
        ...boxPair,
        type: 'x25519',
      }
    })(),
  }

  return {
    ...keypairs,
    relationships: {
      [KeyRelationship.authentication]: keypairs.authentication,
      [KeyRelationship.assertionMethod]: keypairs.assertion,
      [KeyRelationship.keyAgreement]: keypairs.keyAgreement,
    },
  }
}

export async function getDidDoc(account, keypairs, network) {
  await status('checking for existing DID...')
  const { api } =
    await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

  const didUri = Did.Utils.getKiltDidFromIdentifier(
    encodeAddress(keypairs.authentication.publicKey, 38),
    'full'
  )

  let didDoc = await Did.DidResolver.resolveDoc(didUri)

  if (didDoc) {
    await status('DID loaded from chain...')
    return didDoc
  }

  await status('checking balance...')

  const testnet = network.indexOf('peregrine') > 0
  let balance = parseInt(
    (await Balance.getBalances(account.address)).free.toString()
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
        (await Balance.getBalances(account.address)).free.toString()
      )
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  await new Did.FullDidCreationBuilder(api, {
    publicKey: keypairs.authentication.publicKey,
    type: VerificationKeyType.Sr25519,
  })
    .addEncryptionKey({
      publicKey: keypairs.keyAgreement.publicKey,
      type: EncryptionKeyType.X25519,
    })
    .setAttestationKey({
      publicKey: keypairs.assertion.publicKey,
      type: VerificationKeyType.Sr25519,
    })
    .buildAndSubmit(
      {
        async sign({ data, alg }) {
          const { authentication } = keypairs
          return {
            data: authentication.sign(data, { withType: false }),
            alg,
          }
        },
      },
      account.address,
      async (creationTx) => {
        await BlockchainUtils.signAndSubmitTx(creationTx, account, {
          reSign: true,
          resolveOn,
        })
      }
    )

  await status('DID created on chain...')
  return Did.DidResolver.resolveDoc(didUri)
}

export async function getAllSocialCTypes(didDoc, account, keypairs) {
  let ctypeTx = []
  const { api } =
    await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
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

  if (!(await githubCType.verifyStored())) {
    ctypeTx.push(await githubCType.getStoreTx())
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

  if (!(await discordCType.verifyStored())) {
    ctypeTx.push(await discordCType.getStoreTx())
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

  if (!(await emailCType.verifyStored())) {
    ctypeTx.push(await emailCType.getStoreTx())
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
  if (!(await twitchCType.verifyStored())) {
    ctypeTx.push(await twitchCType.getStoreTx())
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

  if (!(await twitterCType.verifyStored())) {
    ctypeTx.push(await twitterCType.getStoreTx())
  }

  if (ctypeTx.length > 0) {
    const batch = await new Did.DidBatchBuilder(api, didDoc.details)
      .addMultipleExtrinsics(ctypeTx)
      .build(
        {
          async sign({ data, alg }) {
            const { assertion } = keypairs
            return {
              data: assertion.sign(data, { withType: false }),
              alg,
            }
          },
        },
        account.address
      )

    await BlockchainUtils.signAndSubmitTx(batch, account, {
      reSign: true,
      resolveOn,
    })
  }

  return { githubCType, discordCType, emailCType, twitchCType, twitterCType }
}

export async function attestClaim(claims, account, keypairs) {
  const { api } =
    await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

  const didUri = Did.Utils.getKiltDidFromIdentifier(
    encodeAddress(keypairs.authentication.publicKey, 38),
    'full'
  )
  const fullDid = await Did.FullDidDetails.fromChainInfo(didUri)
  let requests = []
  const batchTx = await Promise.all(
    claims.map(async ({ claim }) => {
      const request = RequestForAttestation.fromClaim(claim)

      const selfSignedRequest = await request.signWithDidKey(
        {
          async sign({ data, alg }) {
            const { authentication } = keypairs
            return {
              data: authentication.sign(data, { withType: false }),
              alg,
            }
          },
        },
        fullDid,
        fullDid.getVerificationKeys(KeyRelationship.authentication)[0].id
      )

      const attestation = Attestation.fromRequestAndDid(
        selfSignedRequest,
        fullDid.uri
      )
      requests.push(selfSignedRequest)
      const attested = Boolean(await Attestation.query(attestation.claimHash))
      if (attested) return null

      return attestation.getStoreTx()
    })
  )

  if (batchTx.filter((val) => val !== true)) {
    const batch = await new Did.DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics(batchTx)
      .build(
        {
          async sign({ data, alg }) {
            const { assertion } = keypairs
            return {
              data: assertion.sign(data, { withType: false }),
              alg,
            }
          },
        },
        account.address
      )

    await BlockchainUtils.signAndSubmitTx(batch, account, {
      reSign: true,
      resolveOn,
    })
  }

  return await Promise.all(
    requests.map(async (request, index) => {
      const attested = Boolean(await Attestation.query(request.rootHash))

      return {
        attester: 'PeregrineSelfAttestedSocialKYC',
        cTypeTitle: claims[index].ctype,
        isDownloaded: true,
        name: claims[index].ctype,
        request: { ...request },
        attested,
      }
    })
  )
}
