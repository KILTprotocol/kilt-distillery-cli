import {ChainHelpers, init} from '@kiltprotocol/sdk-js'
import {mnemonicGenerate, cryptoWaitReady} from '@polkadot/util-crypto'
import {
  getMnemonic,
  useExisting,
  getNetwork,
  getOrigin,
  status,
} from './_prompts.js'
import {getDidDoc, getKeypairs, loadAccount} from './utils/utils.js'
import chalk from 'chalk'
import fs from 'fs'
import mainMenu from './main-menu.js'

/**
 * Setup verifier results in
 * - encryptionKey
 * - verifier mnemonic
 */

export default async function ({returnAssets = false} = {}) {
  const network = await getNetwork()
  const testnet
    = network.indexOf('peregrin') > -1 || network.indexOf('sporran') > -1

  const mnemonic = testnet
    ? (await useExisting())
      ? await getMnemonic()
      : mnemonicGenerate()
    : await getMnemonic()

  const origin = await getOrigin()
  await connect(network)
  await ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()
  const account = await loadAccount(mnemonic)
  const keypairs = await getKeypairs(account, mnemonic)
  const didDoc = await getDidDoc(account, keypairs, network)
  const dotenv = await getEnvironmentVariables(
    network,
    mnemonic,
    account,
    didDoc,
    origin,
  )

  if (returnAssets) {
    return {
      network,
      origin,
      mnemonic,
      address: account.address,
      didUri: didDoc.details.uri,
      dotenv,
    }
  }

  await saveAssets(dotenv)
  await status(
    `Done! Assets saved to /verifier-assets\n${chalk.reset.gray(
      '... press any key to return to main menu',
    )}`,
    {keyPress: true},
  )
  return mainMenu()
}

async function connect(network) {
  await status('connecting to network...')
  await cryptoWaitReady()
  await init({address: network})
}

async function getEnvironmentVariables(
  network,
  mnemonic,
  account,
  didDoc,
  origin,
) {
  await status('Building environment variables...')
  let dotenv = ''
  dotenv += `ORIGIN=${origin}\n`
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `VERIFIER_MNEMONIC=${mnemonic}\n`
  dotenv += `VERIFIER_ADDRESS=${account.address}\n`
  dotenv += `VERIFIER_DID_URI=${didDoc.details.uri}`
  return dotenv
}

async function saveAssets(dotenv) {
  await status('Generating Verifier assets...')
  const directory = `${process.cwd()}/verifier-assets`
  fs.rmSync(directory, {recursive: true, force: true})
  fs.mkdirSync(directory)
  fs.writeFileSync(`${directory}/.env`, dotenv, 'utf-8')
  return true
}
