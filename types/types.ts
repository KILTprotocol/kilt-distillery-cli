import {
  ICredential,
  NewDidEncryptionKey,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { Keypair } from '@polkadot/util-crypto/types'

export interface Presentation {
  attester: string
  cTypeTitle: string
  isDownloaded: boolean
  name: string
  credential: ICredential
  attested: boolean
}

export interface Keypairs {
  authentication: KiltKeyringPair
  assertion: KiltKeyringPair
  keyAgreement: NewDidEncryptionKey & Keypair
}
