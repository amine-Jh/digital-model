/**
 * POST — score one sequential placement for Vecteurs Q10 / Q11.
 * Expected coordinates are returned only after this click is checked.
 */
import { NextResponse } from 'next/server'
import { checkVectorsSequentialPlacement } from '@/lib/geometry/vectors-placement-keys'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      questionId?: string
      name?: string
      x?: number
      y?: number
    }
    const questionId = String(body.questionId ?? '')
    const name = String(body.name ?? '')
    const x = Number(body.x)
    const y = Number(body.y)
    const result = checkVectorsSequentialPlacement({ questionId, name, x, y })
    if (!result) {
      return NextResponse.json({ error: 'Placement inconnu.' }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
}
