export const campaignCurrency = 'usd'
export const minimumCampaignBudget = 500
export const maximumCampaignBudget = 10_000_000

export type CampaignInput = {
  name: string
  description: string
  budgetAmount: number
}

export function parseCampaignSubmissionId(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return null
  }
  return value.toLowerCase()
}

export function parseCampaignInput(input: {
  name: unknown
  description: unknown
  budget: unknown
}): CampaignInput | null {
  if (
    typeof input.name !== 'string' ||
    typeof input.description !== 'string' ||
    typeof input.budget !== 'string'
  ) {
    return null
  }

  const name = input.name.trim()
  const description = input.description.trim()
  const budgetAmount = parseUsdAmount(input.budget)
  if (
    name.length === 0 ||
    name.length > 120 ||
    description.length === 0 ||
    description.length > 2_000 ||
    budgetAmount === null ||
    budgetAmount < minimumCampaignBudget ||
    budgetAmount > maximumCampaignBudget
  ) {
    return null
  }

  return { name, description, budgetAmount }
}

export function parseUsdAmount(value: string) {
  const normalized = value.trim()
  if (!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null

  const [dollarsPart, centsPart = ''] = normalized.split('.')
  const dollars = Number(dollarsPart)
  const cents = Number(centsPart.padEnd(2, '0'))
  const amount = dollars * 100 + cents
  return Number.isSafeInteger(amount) ? amount : null
}

export function formatCampaignBudget(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: campaignCurrency,
  }).format(amount / 100)
}
