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
  status: string 
}

export interface Keypairs {
  authentication: KiltKeyringPair
  assertion: KiltKeyringPair
  keyAgreement: KiltEncryptionKeypair
}
