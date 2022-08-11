import { IRequestForAttestation } from '@kiltprotocol/sdk-js'

export type present = {
  attester: string
  cTypeTitle: string
  isDownloaded: boolean
  name: any
  request: IRequestForAttestation
  attested: boolean
}
