import { CType, ICType } from '@kiltprotocol/sdk-js'


export async function isCtypeOnChain({
  ctype,
}: {
  ctype: ICType;
}): Promise<boolean> {
  try {
    await CType.verifyStored(ctype)
    return true
  } catch {
    return false
  }
}
