import type { SimulatorParams, SimulatorResult } from '@/types'

export function calculateCompoundInterest(params: SimulatorParams): SimulatorResult[] {
  const { initialCapital, monthlyContribution, annualReturn, inflation, years } = params
  const monthlyRate = annualReturn / 100 / 12
  const monthlyInflation = inflation / 100 / 12
  const results: SimulatorResult[] = []

  let nominal = initialCapital
  let realDeflator = 1

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      nominal = nominal * (1 + monthlyRate) + monthlyContribution
      realDeflator *= 1 + monthlyInflation
    }

    const totalInvested = initialCapital + monthlyContribution * 12 * year
    const real = nominal / realDeflator

    results.push({
      year,
      nominal: Math.round(nominal * 100) / 100,
      real: Math.round(real * 100) / 100,
      invested: Math.round(totalInvested * 100) / 100,
      gains: Math.round((nominal - totalInvested) * 100) / 100,
    })
  }

  return results
}

export function calculateAnnualizedReturn(
  initialValue: number,
  finalValue: number,
  years: number
): number {
  if (initialValue <= 0 || years <= 0) return 0
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100
}

export function calculateFIRENumber(monthlyExpenses: number, withdrawalRate = 4): number {
  return (monthlyExpenses * 12) / (withdrawalRate / 100)
}

export function estimateYearsToFIRE(
  currentNetWorth: number,
  fireNumber: number,
  monthlySavings: number,
  annualReturn: number
): number {
  if (currentNetWorth >= fireNumber) return 0
  const monthlyRate = annualReturn / 100 / 12
  let balance = currentNetWorth
  let months = 0

  while (balance < fireNumber && months < 600) {
    balance = balance * (1 + monthlyRate) + monthlySavings
    months++
  }

  return months / 12
}
