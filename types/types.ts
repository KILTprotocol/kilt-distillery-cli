import {
  ICredential,
  KiltKeyringPair,
  KiltEncryptionKeypair,
} from '@kiltprotocol/types'

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
  assertionMethod: KiltKeyringPair
  keyAgreement: KiltEncryptionKeypair
}
