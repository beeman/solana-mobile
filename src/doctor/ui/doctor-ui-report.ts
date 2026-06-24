import { log, outro } from '@clack/prompts'
import type { DoctorCheckResult } from '../data-access/doctor-check-result.ts'

export function renderDoctorReport(results: DoctorCheckResult[]) {
  for (const result of results) {
    const message = `${result.name}: ${result.actual} (requires ${result.required})`

    if (result.ok) {
      log.success(message)
    } else {
      log.error(message)
    }
  }

  const recommendations = results
    .filter((result) => !result.ok && result.recommendation)
    .map((result) => result.recommendation as string)

  if (recommendations.length === 0) {
    outro('Your system is ready.')
    return
  }

  log.warn('Recommendations')

  for (const recommendation of recommendations) {
    log.message(`- ${recommendation}`)
  }

  outro('Run doctor again after applying the recommendations.')
}
