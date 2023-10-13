import {
  Did,
  CType,
  KiltKeyringPair,
  ConfigService,
  Blockchain,
  ICType,
} from '@kiltprotocol/sdk-js'
import { Keypairs } from '../../types/types'
import { isCtypeOnChain } from './isCtypeOnChain'
import { makeSignCallback } from './makeSignCallback'
import { resolveOn } from './resolveOn'

export async function getAllSocialCTypes({
  account,
  keypairs,
}: {
  account: KiltKeyringPair
  keypairs: Keypairs
}): Promise<{
  githubCType: ICType
  discordCType: ICType
  emailCType: ICType
  twitchCType: ICType
  twitterCType: ICType
}> {
  const ctypeTx: string[] = []
  const githubCType = CType.fromProperties('GitHub', {
    Username: {
      type: 'string',
    },
    'User ID': {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain({ ctype: githubCType }))) {
    ctypeTx.push(CType.toChain(githubCType))
  }

  const discordCType = CType.fromProperties('Discord', {
    Username: {
      type: 'string',
    },
    Discriminator: {
      type: 'string',
    },
    'User ID': {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain({ ctype: discordCType }))) {
    ctypeTx.push(CType.toChain(discordCType))
  }

  const emailCType = CType.fromProperties('Email', {
    Email: {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain({ ctype: emailCType }))) {
    ctypeTx.push(CType.toChain(emailCType))
  }

  const twitchCType = CType.fromProperties('Twitch', {
    Username: {
      type: 'string',
    },
    'User ID': {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain({ ctype: twitchCType }))) {
    ctypeTx.push(CType.toChain(twitchCType))
  }

  const twitterCType = CType.fromProperties('Twitter', {
    Twitter: {
      type: 'string',
    },
  })

  if (!(await isCtypeOnChain({ ctype: twitterCType }))) {
    ctypeTx.push(CType.toChain(twitterCType))
  }

  if (ctypeTx.length > 0) {
    const api = ConfigService.get('api')

    const { authentication, assertionMethod } = keypairs

    const didUri = Did.getFullDidUriFromKey(authentication)

    const didResolved = await Did.resolve(didUri)

    if (!didResolved?.document) {
      throw new Error('Document of resolved DID not found')
    }

    const assertionCallback = makeSignCallback({ keypair: assertionMethod })

    const assertionSign = assertionCallback(didResolved.document)

    const extrinsics = ctypeTx.map((tx) => {
      return api.tx.ctype.add(tx)
    })

    // DID batch authorize is currently not useable
    if (extrinsics.filter((val) => val)) {
      const batch = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: didUri,
        extrinsics,
        sign: assertionSign,
        submitter: account.address,
      })
      await Blockchain.signAndSubmitTx(batch, account, {
        resolveOn,
      })
    }
  }

  return { githubCType, discordCType, emailCType, twitchCType, twitterCType }
}
