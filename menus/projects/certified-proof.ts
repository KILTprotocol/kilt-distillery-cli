import { status, createTestCredentials, getBackendPort } from '../_prompts'
import setupIdentity from '../setup-identity'
import setupClaimer from '../setup-claimer'
import * as fs from 'fs-extra'
import exitCli from '../exit-cli'

export default async function (dappName: string) {
  const { network, mnemonic, didUri, origin } = await setupIdentity({
    returnAssets: true,
  })
  const port = await getBackendPort()

  let dotenv = ''
  dotenv += `URL="${origin}"\n`
  dotenv += `PORT="${port}"\n`
  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `BLOCKCHAIN_ENDPOINT="${network}"\n`
  dotenv += `SECRET_PAYER_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_ASSERTION_METHOD_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_KEY_AGREEMENT_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_AUTHENTICATION_MNEMONIC="${mnemonic}"\n`
  dotenv += `DID="${didUri}"\n`
  dotenv += 'ADMIN_USERNAME="example"\n'
  dotenv += 'ADMIN_PASSWORD="attester"\n'

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
