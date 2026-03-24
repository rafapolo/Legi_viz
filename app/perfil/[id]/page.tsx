import { readFileSync } from 'fs'
import { join } from 'path'
import PerfilClient from './PerfilClient'

export async function generateStaticParams() {
  const params: { id: string }[] = []

  try {
    const expenses = JSON.parse(
      readFileSync(join(process.cwd(), 'public/data/real-expenses.json'), 'utf8')
    )
    for (const id of Object.keys(expenses)) {
      params.push({ id: `DEP-${id}` })
    }
  } catch {}

  try {
    const senadores = JSON.parse(
      readFileSync(join(process.cwd(), 'public/data/senadores-real.json'), 'utf8')
    )
    for (const id of Object.keys(senadores)) {
      params.push({ id: `SEN-${id}` })
    }
  } catch {}

  return params
}

export default function PerfilPage() {
  return <PerfilClient />
}
