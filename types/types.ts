import { ICredential, IAttestation } from '@kiltprotocol/types'

export interface Presentation {
  attester: string
  cTypeTitle: string
  isDownloaded: boolean
  name: string
  credential: ICredential
  attested: boolean
}
