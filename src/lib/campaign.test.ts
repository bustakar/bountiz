import { describe, expect, it } from 'vitest'

import {
  maximumCampaignBudget,
  minimumCampaignBudget,
  parseCampaignInput,
  parseCampaignSubmissionId,
  parseUsdAmount,
} from './campaign'

describe('parseCampaignSubmissionId', () => {
  it('accepts UUID submission tokens', () => {
    expect(
      parseCampaignSubmissionId('24F8B5E0-9C9B-4DA0-A3E8-86A944D3D2C8'),
    ).toBe('24f8b5e0-9c9b-4da0-a3e8-86a944d3d2c8')
  })

  it.each(['', 'campaign', '24f8b5e0-9c9b-4da0-a3e8'])(
    'rejects %s',
    (value) => {
      expect(parseCampaignSubmissionId(value)).toBeNull()
    },
  )
})

describe('parseUsdAmount', () => {
  it.each([
    ['5', 500],
    ['5.2', 520],
    ['5.20', 520],
    ['100000.00', 10_000_000],
  ])('converts %s to cents', (value, expected) => {
    expect(parseUsdAmount(value)).toBe(expected)
  })

  it.each(['', '-5', '1.234', '01', 'five', 'Infinity'])(
    'rejects %s',
    (value) => {
      expect(parseUsdAmount(value)).toBeNull()
    },
  )
})

describe('parseCampaignInput', () => {
  it('normalizes valid campaign fields', () => {
    expect(
      parseCampaignInput({
        name: '  Launch week  ',
        description: '  Reward videos about the launch.  ',
        budget: String(minimumCampaignBudget / 100),
      }),
    ).toEqual({
      name: 'Launch week',
      description: 'Reward videos about the launch.',
      budgetAmount: minimumCampaignBudget,
    })
  })

  it('rejects budgets outside the supported range', () => {
    expect(
      parseCampaignInput({
        name: 'Campaign',
        description: 'Brief',
        budget: '4.99',
      }),
    ).toBeNull()
    expect(
      parseCampaignInput({
        name: 'Campaign',
        description: 'Brief',
        budget: String(maximumCampaignBudget / 100 + 1),
      }),
    ).toBeNull()
  })
})
