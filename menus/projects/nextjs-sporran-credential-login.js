import { status, getJWTExpiry, getJWTRenewal, createTestCredentials } from "../_prompts.js"
import setupVerifier from "../setup-verifier.js"
import { randomAsHex } from "@polkadot/util-crypto"
import setupClaimer from "../setup-claimer.js"
import fs from 'fs-extra'
import exitCli from "../exit-cli.js"

export default async function (dappName) {
  const jwtSecret = randomAsHex(16)
  const jwtExpiry = await getJWTExpiry()
  const renewJwt = await getJWTRenewal()
  const { 
    origin,
    network,
    mnemonic,
    address,
    didUri,
    didConfig, 
  } = await setupVerifier({ returnAssets: true })

  let dotenv = ''
  dotenv += `DAPP_NAME="${dappName}"\n`
  dotenv += `ORIGIN=${origin}\n`
  dotenv += `WSS_ADDRESS=${network}\n`
  dotenv += `VERIFIER_MNEMONIC="${mnemonic}"\n`
  dotenv += `VERIFIER_ADDRESS=${address}\n`
  dotenv += `VERIFIER_DID_URI=${didUri}\n`
  dotenv += `JWT_SECRET=${jwtSecret}\n`
  dotenv += `JWT_EXPIRY=${jwtExpiry}\n`
  dotenv += `JWT_RENEW=${renewJwt ? 'true' : 'false'}`

  status('creating files...')
  fs.writeFileSync(`${process.cwd()}/${dappName}/.env`, dotenv)
  fs.writeFileSync(`${process.cwd()}/${dappName}/public/didConfiguration.json`, JSON.stringify(didConfig, null, 2))

  if (!network.startsWith('wss://spiritnet')) {
    const needClaimer = await createTestCredentials()
    if (needClaimer) await setupClaimer()
  }
  
  await status(`all done! to run the project:\nmove to '${dappName}' directory\nnpm install\nnpm run dev`)

  return exitCli()
}
