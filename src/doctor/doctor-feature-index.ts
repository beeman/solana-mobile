import { checkAdbVersion } from './data-access/check-adb-version.ts'
import { checkNodeVersion } from './data-access/check-node-version.ts'
import { renderDoctorReport } from './ui/doctor-ui-report.ts'

export async function runDoctor() {
  const results = [await checkAdbVersion(), checkNodeVersion()]

  renderDoctorReport(results)

  return results.every((result) => result.ok) ? 0 : 1
}
