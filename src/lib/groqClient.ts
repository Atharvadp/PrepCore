const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function askQuestion(question: string): Promise<string> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful study assistant. Provide clear, concise answers to student questions. Keep responses under 200 words and focus on explaining concepts simply.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get response from AI')
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Error calling Groq API:', error)
    throw new Error('Failed to get answer. Please try again.')
  }
}
