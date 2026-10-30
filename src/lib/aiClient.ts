import { apiRequest } from './api'

export async function askQuestion(question: string): Promise<string> {
  const { answer } = await apiRequest<{ answer: string }>('/ai/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
  return answer
}
