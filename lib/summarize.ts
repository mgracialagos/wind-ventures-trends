import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface TrendResult {
  summary: string
  signals: string[]
  sources: string[]
}

export async function generateTrendSummary(
  verticalLabel: string,
  verticalSearchTerms: string,
  regionLabel: string,
  monthLabel: string
): Promise<TrendResult> {

  const systemPrompt = `You are a senior analyst at Wind Ventures, a VC fund focused on Energy, Mobility, and Convenience (retail/commerce). Search for real, current news and synthesize what is genuinely happening in a sector drawing only from what you find in articles, blogs, trade publications, and analyst reports. Never invent data.`

  const userPrompt = `Search the web for news and articles about trends in the ${verticalLabel} sector in ${regionLabel} for ${monthLabel}. Based on what you find, write a 3-4 sentence paragraph summarizing the most important general trends. Focus on what themes are dominating coverage, what technologies or business models are gaining traction, and what this signals for the direction of the sector. Also extract 3-5 signal tags (2-4 words each) and list the domains of sources you referenced. Respond ONLY with raw JSON, no markdown, no backticks. Start with { end with }: {"summary":"3-4 sentences here","signals":["Tag One","Tag Two","Tag Three"],"sources":["techcrunch.com","bloomberg.com"]}`

  const response1 = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  let messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }]
  let finalContent = response1.content

  if (response1.stop_reason === 'tool_use') {
    const toolResults = response1.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map(b => ({
        type: 'tool_result' as const,
        tool_use_id: b.id,
        content: 'Search results retrieved successfully.',
      }))

    messages = [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: response1.content },
      { role: 'user', content: toolResults },
    ]

    const response2 = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages,
    })

    finalContent = response2.content
  }

  const text = finalContent
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error(`No JSON in response: ${text.slice(0, 200)}`)
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as TrendResult
  if (!parsed.summary) throw new Error('Missing summary in response')

  return {
    summary: parsed.summary,
    signals: parsed.signals || [],
    sources: parsed.sources || [],
  }
}
