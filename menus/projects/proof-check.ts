import { status, createTestCredentials, getFrontendPort } from '../_prompts'
import setupIdentity from '../setup-identity'
import setupClaimer from '../setup-claimer'
import * as fs from 'fs-extra'
import exitCli from '../exit-cli'

export default async function (dappName: string) {
  const { network, mnemonic, didUri } = await setupIdentity({
    returnAssets: true,
  })
  const port = await getFrontendPort()

  let dotenv = ''

  dotenv += `URL="${origin}"`
  dotenv += `PORT="${port}"`
  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `BLOCKCHAIN_ENDPOINT=${network}\n`
  dotenv += `SECRET_PAYER_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_ASSERTION_METHOD_MNEMONIC=${mnemonic}\n`
  dotenv += `SECRET_KEY_AGREEMENT_MNEMONIC=${mnemonic}\n`
  dotenv += `DID=${didUri}\n`
  dotenv += 'ADMIN_USERNAME=example'
  dotenv += 'ADMIN_PASSWORD=attester'

  status('creating files...')
  fs.writeFileSync(`${process.cwd()}/${dappName}/.env`, dotenv)

  if (!network.startsWith('wss://spiritnet')) {
    const needClaimer = await createTestCredentials()
    if (needClaimer) {
      await setupClaimer()
    }
  }

  await status(
    `all done! to run the project:\nmove to '${dappName}' directory\nyarn install\nyarn run dev`
  )

  return exitCli()
}
