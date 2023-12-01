import {
  Blockchain,
  ConfigService,
  connect,
  CType,
  Did,
} from '@kiltprotocol/sdk-js'
import {
  status,
  getCTypeStringObject,
  getMnemonic,
  getNetwork,
  useExisting,
} from './_prompts'
import mainMenu from './main-menu'
import { resolveOn } from './utils/resolveOn'
import { loadAccount } from './utils/loadAccount'
import { isCtypeOnChain } from './utils/isCtypeOnChain'
import { makeSignCallback } from './utils/makeSignCallback'
import { getKeypairs } from './utils/getKeypairs'

import { mnemonicGenerate } from '@polkadot/util-crypto'

export default async function (): Promise<void> {
  const network = await getNetwork()
  const testnet =
    network.indexOf('peregrin') > -1 || network.indexOf('sporran') > -1

  const mnemonic = testnet
    ? (await useExisting())
      ? await getMnemonic()
      : mnemonicGenerate()
    : await getMnemonic()

  await status('connecting to network...')
  await connect(network)
  const api = ConfigService.get('api')

  const account = await loadAccount({ seed: mnemonic })
  const keypairs = await getKeypairs(mnemonic)
  await status('initializing keypairs...')

  const ctypeString = await getCTypeStringObject()
  await status('fetch ctype string...')

  const ctypeObject = JSON.parse(ctypeString)

  await status('passing the ctype...')

  const ctype = CType.fromProperties(ctypeObject.title, ctypeObject.properties)

  await status(`initalizing the ctype...${ctype.$id}`)

  if (!(await isCtypeOnChain({ ctype }))) {
    const { authentication, assertionMethod } = keypairs

    const didUri = Did.getFullDidUriFromKey(authentication)

    const didResolved = await Did.resolve(didUri)

    if (!didResolved?.document) {
      throw new Error('Document of resolved DID not found')
    }

    const assertionCallback = makeSignCallback({ keypair: assertionMethod })

    const assertionSign = assertionCallback(didResolved.document)

    const extrinsic = api.tx.ctype.add(CType.toChain(ctype))

    const authTx = await Did.authorizeTx(
      didUri,
      extrinsic,
      assertionSign,
      account.address
    )

    await Blockchain.signAndSubmitTx(authTx, account, {
      resolveOn,
    })
    await status(`Done! CType has been generated: \n${ctype.$id}`, {
      wait: 10000,
    })

    await mainMenu()
  }

  await status(`Done! CType has been generated: \n${ctype.$id}`, {
    wait: 10000,
  })

  await mainMenu()
}
