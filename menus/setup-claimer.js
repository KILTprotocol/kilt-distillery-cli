import {
  Claim,
  Attestation,
  RequestForAttestation,
  Credential,
  CType,
  Did,
  Balance,
  init,
  Utils,
  KeyRelationship,
  BlockchainUtils,
  ChainHelpers,
  VerificationKeyType,
  EncryptionKeyType,
} from '@kiltprotocol/sdk-js'
import {
  naclBoxPairFromSecret,
  sr25519PairFromSeed,
  mnemonicToMiniSecret,
  keyExtractPath,
  keyFromPath,
  blake2AsU8a,
  encodeAddress,
} from '@polkadot/util-crypto'
import { getMnemonic, status, mainMenu } from './_prompts.js'

import chalk from 'chalk'
import fs from 'fs'

const resolveOn = BlockchainUtils.IS_FINALIZED

async function connect() {
  await status('connecting to network...')
  await init({ address: 'wss://peregrine.kilt.io/parachain-public-ws' })
}

async function loadAccount(seed) {
  await status('loading account...')
  const signingKeyPairType = 'sr25519'
  const keyring = new Utils.Keyring({
    ss58Format: 38,
    type: signingKeyPairType,
  })
  const account = keyring.addFromMnemonic(seed)
  return account
}

async function getKeypairs(account, mnemonic) {
  await status('generating keypairs...')
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

async function getDidDoc(account, keypairs) {
  await status('checking for existing DID...')
  const { api } =
    await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const identifier = Did.DidUtils.getKiltDidFromIdentifier(
    encodeAddress(keypairs.authentication.publicKey, 38),
    'full'
  )

  let didDoc = await Did.DidResolver.resolveDoc(identifier)
  if (didDoc) {
    await status('DID loaded from chain...')
    return didDoc
  }

  await status('checking balance...')

  let balance = parseInt(
    (await Balance.getBalances(account.address)).free.toString()
  )
  if (balance < 3) {
    const message = chalk.red(
      `get testnet tokens to continue => https://faucet.peregrine.kilt.io/?${account.address}`
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
    .consumeWithHandler(
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
  return Did.DidResolver.resolveDoc(identifier)
}

const githubClaimContents = { Username: 'Friendship', 'User ID': 'Friend' }

const twitchClaimContents = { Username: 'Friendship', 'User ID': 'Friend' }

const twitterClaimContents = { Twitter: 'Friendship' }

const emailClaimContents = { Email: 'Friendship@howdy' }

const discordClaimContents = {
  Username: 'Friendship',
}

async function getCTypes(didDoc, account, keypairs) {
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
      .consume(
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

export async function attestClaim(claims, fullDid, account, keypairs) {
  const { api } =
    await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const batchTx = await Promise.all(
    claims.map(async (claim) => {
      const request = RequestForAttestation.fromClaim(claim)

      await request.signWithDidKey(
        {
          async sign({ data, alg }) {
            const { authentication } = keypairs
            return {
              data: authentication.sign(data, { withType: false }),
              alg,
            }
          },
        },
        fullDid.details,
        fullDid.details.authenticationKey.id
      )

      const attestation = Attestation.fromRequestAndDid(
        request,
        fullDid.details.did
      )

      const attested = Boolean(await Attestation.query(attestation.claimHash))
      if (attested) return null

      return attestation.getStoreTx()
    })
  )

  if (batchTx.filter((val) => val !== true)) {
    const batch = await new Did.DidBatchBuilder(api, fullDid.details)
      .addMultipleExtrinsics(batchTx)
      .consume(
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

  const credential = await Promise.all(
    claims.map(async (claim) => {
      const request = RequestForAttestation.fromClaim(claim)

      await request.signWithDidKey(
        {
          async sign({ data, alg }) {
            const { authentication } = keypairs
            return {
              data: authentication.sign(data, { withType: false }),
              alg,
            }
          },
        },
        fullDid.details,
        fullDid.details.authenticationKey.id
      )

      const attestation = Attestation.fromRequestAndDid(
        request,
        fullDid.details.did
      )
      return Credential.fromRequestAndAttestation(request, attestation)
    })
  )
  console.log(credential)

  return Object.assign({}, credential)
}
// to do: give each credential the correct name
// Make the objects similar to the sporran object
function saveAssets(credentials) {
  const directory = `${process.cwd()}/claimer-credentials`
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory)
  fs.writeFileSync(
    `${directory}/credentials.json`,
    JSON.stringify(credentials, null, 2),
    'utf-8'
  )
}

export default async function () {
  await connect()
  const mnemonic = await getMnemonic()
  await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(
    account,
    keypairs,
    'wss://peregrine.kilt.io/parachain-public-ws'
  )

  const { githubCType, discordCType, emailCType, twitchCType, twitterCType } =
    await getCTypes(didDoc, account, keypairs)

  const githubClaim = Claim.fromCTypeAndClaimContents(
    githubCType,
    githubClaimContents,
    didDoc.details.did
  )
  const twitchClaim = Claim.fromCTypeAndClaimContents(
    twitchCType,
    twitchClaimContents,
    didDoc.details.did
  )
  const twitterClaim = Claim.fromCTypeAndClaimContents(
    twitterCType,
    twitterClaimContents,
    didDoc.details.did
  )
  const emailClaim = Claim.fromCTypeAndClaimContents(
    emailCType,
    emailClaimContents,
    didDoc.details.did
  )
  const discordClaim = Claim.fromCTypeAndClaimContents(
    discordCType,
    discordClaimContents,
    didDoc.details.did
  )
  const credential = await attestClaim(
    [githubClaim, twitchClaim, twitterClaim, emailClaim, discordClaim],
    didDoc,
    account,
    keypairs
  )

  await status('Generating claimer credentials assets...')
  saveAssets(credential)

  await status(
    `Done! Assets saved to /claimer-assets\n${chalk.reset.gray(
      '... press any key to return to main menu'
    )}`,
    { keyPress: true }
  )
  return mainMenu()
}
