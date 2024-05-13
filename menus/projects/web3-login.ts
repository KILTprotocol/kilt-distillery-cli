import {
  status,
  createTestCredentials,
  getFrontendPort,
  getBackendPort,
  generateProject,
} from '../_prompts'
import setupIdentity from '../setup-identity'
import { randomAsHex } from '@polkadot/util-crypto'
import setupClaimer from '../setup-claimer'
import * as fs from 'fs-extra'
import exitCli from '../exit-cli'
import { initialiseProject } from '../utils/initialiseProject'

export default async function (dappName: string) {
  const jwtSecret = randomAsHex(16)
  const { network, mnemonic, didUri } = await setupIdentity({
    returnAssets: true,
  })
  const frontend = await getFrontendPort()
  const backend = await getBackendPort()

  let dotenv = ''

  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `DAPP_ACCOUNT_MNEMONIC="${mnemonic}"\n`
  dotenv += `DAPP_DID_MNEMONIC=${mnemonic}\n`
  dotenv += `DAPP_DID_URI=${didUri}\n`
  dotenv += `JWT_SIGNER_SECRET=${jwtSecret}\n`
  dotenv += `FRONTEND_PORT=${frontend}\n`
  dotenv += `BACKEND_PORT=${backend}\n`
  // Setup for Peregrine using Email CType and SocialKYC
  dotenv +=
    'CTYPE_HASH=0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac\n'
  dotenv +=
    'TRUSTED_ATTESTERS=did:kilt:4pehddkhEanexVTTzWAtrrfo2R7xPnePpuiJLC7shQU894aY\n'
  dotenv += 'REQUIRED_PROPERTIES=Email'
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
    `all done! to run the project:\nmove to '${dappName}' directory\nyarn install\nyarn run build\nyarn run start`,
    { wait: 1500, keyPress: true }
  )

  return exitCli()
}
