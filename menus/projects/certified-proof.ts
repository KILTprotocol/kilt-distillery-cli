import {
  status,
  createTestCredentials,
  getBackendPort,
  generateProject,
} from '../_prompts'
import setupClaimer from '../setup-claimer'
import * as fs from 'fs-extra'
import exitCli from '../exit-cli'

import setupIdentity from '../setup-identity'
import { initialiseProject } from '../utils/initialiseProject'

export default async function (dappName: string) {
  const { network, mnemonic, didUri } = await setupIdentity({
    returnAssets: true,
  })

  const port = await getBackendPort()

  let dotenv = ''
  dotenv += `PORT="${port}"\n`
  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `BLOCKCHAIN_ENDPOINT="${network}"\n`
  dotenv += `DID="${didUri}"\n`
  dotenv += `SECRET_PAYER_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_ASSERTION_METHOD_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_KEY_AGREEMENT_MNEMONIC="${mnemonic}"\n`
  dotenv += `SECRET_AUTHENTICATION_MNEMONIC="${mnemonic}"\n`
  dotenv += 'ADMIN_USERNAME="example"\n'
  dotenv += 'ADMIN_PASSWORD="attester"\n'

  const projectPath = `${process.cwd()}/${dappName}`
  await status('creating files...')
  fs.writeFileSync(`${projectPath}/.env`, dotenv)

  if (!network.startsWith('wss://spiritnet')) {
    if (await createTestCredentials()) {
      await setupClaimer()
    }
  }

  if (await generateProject()) {
    await initialiseProject(projectPath)
  }
  await status(
    `all done! to run the project:\nmove to '${dappName}' directory\nyarn install\nyarn build\nyarn run did-create\nyarn run did-configuration\nyarn run dev\nyarn run dev-start`,
    { wait: 100000, keyPress: true }
  )

  return exitCli()
}
