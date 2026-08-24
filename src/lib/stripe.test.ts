import { describe, expect, it } from 'vitest'

import { getStripePayoutStatus } from './stripe'

const baseSnapshot = {
  detailsSubmitted: true,
  payoutsEnabled: true,
  transfersStatus: 'active',
  requirementsDue: [] as string[],
  disabledReason: null,
}

describe('getStripePayoutStatus', () => {
  it('marks fully enabled accounts as ready', () => {
    expect(getStripePayoutStatus(baseSnapshot)).toBe('ready')
  })

  it('requires creators to finish missing onboarding fields', () => {
    expect(
      getStripePayoutStatus({
        ...baseSnapshot,
        payoutsEnabled: false,
        requirementsDue: ['individual.verification.document'],
      }),
    ).toBe('incomplete')
  })

  it('marks submitted accounts under review as pending', () => {
    expect(
      getStripePayoutStatus({
        ...baseSnapshot,
        payoutsEnabled: false,
        transfersStatus: 'pending',
      }),
    ).toBe('pending')
  })

  it('marks rejected accounts as restricted', () => {
    expect(
      getStripePayoutStatus({
        ...baseSnapshot,
        payoutsEnabled: false,
        disabledReason: 'rejected.fraud',
      }),
    ).toBe('restricted')
  })
})
