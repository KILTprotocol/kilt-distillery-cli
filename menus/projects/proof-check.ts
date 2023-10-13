import {
  status,
  createTestCredentials,
  getBackendPort,
  getMnemonic,
  getNetwork,
  getOrigin,
  useExisting,
} from '../_prompts'

import setupClaimer from '../setup-claimer'
import * as fs from 'fs-extra'
import exitCli from '../exit-cli'
import { connect } from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { loadAccount } from '../utils/loadAccount'
import { loadBalance } from '../utils/loadBalance'

export default async function (dappName: string) {
  const network = await getNetwork()
  const testnet =
    network.indexOf('peregrin') > -1 || network.indexOf('sporran') > -1

  const mnemonic = testnet
    ? (await useExisting())
      ? await getMnemonic()
      : mnemonicGenerate()
    : await getMnemonic()
  const origin = await getOrigin()
  await status('connecting to network...')
  await connect(network)
  const account = await loadAccount({ seed: mnemonic })
  await status('checking balance...')
  await loadBalance(account, network)

  const port = await getBackendPort()

  let dotenv = ''

  dotenv += `URL="${origin}"\n`
  dotenv += `PORT="${port}"\n`
  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `BLOCKCHAIN_ENDPOINT=${network}\n`
  dotenv += `SECRET_PAYER_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_ASSERTION_METHOD_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_KEY_AGREEMENT_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_AUTHENTICATION_MNEMONIC="${mnemonic}"\n`

  status('creating files...')
  fs.writeFileSync(`${process.cwd()}/${dappName}/.env`, dotenv)

  if (!network.startsWith('wss://spiritnet')) {
    const needClaimer = await createTestCredentials()
    if (needClaimer) {
      await setupClaimer()
    }
  }

  await status(
    `all done! to run the project:\nmove to '${dappName}' directory\nyarn install\nyarn run did-create\nyarn run did-configuration\nyarn run dev`,
    { wait: 100000, keyPress: true }
  )

  return exitCli()
}
