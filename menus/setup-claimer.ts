import { Claim, init, ChainHelpers, ICredential } from '@kiltprotocol/sdk-js'
import { getMnemonic, status, getClaimDetails } from './_prompts.js'
import mainMenu from './main-menu.js'
import {
  getAllSocialCTypes,
  attestClaim,
  loadAccount,
  getKeypairs,
  getDidDoc,
} from './utils/utils.js'

import chalk from 'chalk'
import fs from 'fs'
import { mnemonicGenerate } from '@polkadot/util-crypto'

async function connect() {
  await status('connecting to network...')
  await init({ address: 'wss://peregrine.kilt.io/parachain-public-ws' })
}

// To do: give each credential the correct name
// Make the objects similar to the sporran object
function saveAssets(credentials: ICredential[]) {
  const directory = `${process.cwd()}/claimer-credentials`
  fs.rmSync(directory, { recursive: true, force: true })
  fs.mkdirSync(directory)
  credentials.forEach((credential: ICredential) => {
    fs.writeFileSync(
      `${directory}/${credential.name}.json`,
      JSON.stringify(credential, null, 2),
      'utf-8'
    )
  })
}

export default async function () {
  await connect()
  const mnemonic = mnemonicGenerate()
  await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(
    account,
    keypairs,
    'wss://peregrine.kilt.io/parachain-public-ws'
  )

  const { githubCType, discordCType, emailCType, twitchCType, twitterCType } =
    await getAllSocialCTypes(didDoc, account, keypairs)

  await status('Generating claimer github claim content...')
  const githubClaimContents = await getClaimDetails(
    githubCType.schema.properties
  )

  await status('Generating claimer twitch claim content...')
  const twitchClaimContents = await getClaimDetails(
    twitchCType.schema.properties
  )

  await status('Generating claimer twitter claim content...')
  const twitterClaimContents = await getClaimDetails(
    twitterCType.schema.properties
  )

  await status('Generating claimer email claim content...')
  const emailClaimContents = await getClaimDetails(emailCType.schema.properties)

  await status('Generating claimer discord claim content...')
  const discordClaimContents = await getClaimDetails(
    discordCType.schema.properties
  )

  const githubClaim = Claim.fromCTypeAndClaimContents(
    githubCType,
    githubClaimContents,
    didDoc.details.uri
  )
  const twitchClaim = Claim.fromCTypeAndClaimContents(
    twitchCType,
    twitchClaimContents,
    didDoc.details.uri
  )
  const twitterClaim = Claim.fromCTypeAndClaimContents(
    twitterCType,
    twitterClaimContents,
    didDoc.details.uri
  )
  const emailClaim = Claim.fromCTypeAndClaimContents(
    emailCType,
    emailClaimContents,
    didDoc.details.uri
  )
  const discordClaim = Claim.fromCTypeAndClaimContents(
    discordCType,
    discordClaimContents,
    didDoc.details.uri
  )

  const claims = [
    { ctype: 'peregrine github', claim: githubClaim },
    { ctype: 'peregrine twitch', claim: twitchClaim },
    { ctype: 'peregrine twitter', claim: twitterClaim },
    { ctype: 'peregrine email', claim: emailClaim },
    { ctype: 'peregrine discord', claim: discordClaim },
  ]

  await status('Self-attesting the claims...')
  const credentials = await attestClaim(claims, account, keypairs)

  await status('Generating claimer credentials assets...')
  saveAssets(credentials)

  fs.writeFileSync(
    `${process.cwd()}/claimer-credentials/.env`,
    `CLAIMER_MNEMONIC=${mnemonic}\nCLAIMER_DID=${didDoc.details.uri}`,
    'utf-8'
  )

  await status(
    `Done! Assets saved to /claimer-assets\n${chalk.reset.gray(
      '... press any key to return to main menu'
    )}`,
    { keyPress: true }
  )

  return await mainMenu()
}
