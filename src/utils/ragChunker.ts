export type SemanticChunk = {
  id: string
  content: string
  metadata: {
    storeId: string
    timestamp: string
    source: string
    tags: string[]
  }
}

/**
 * Splits raw transactional text (like an OCR dump or CSV) into semantically
 * meaningful chunks, preserving boundaries like individual items or receipts.
 */
export function semanticChunker(
  rawText: string,
  storeId: string = 'SME-123',
  source: string = 'OCR-Upload'
): SemanticChunk[] {
  // Simple semantic splitting: Double newlines often indicate separate sections or items
  const rawChunks = rawText
    .split(/\n\s*\n/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)

  const timestamp = new Date().toISOString()

  return rawChunks.map((chunk, index) => {
    // Extract potential tags (e.g., finding capitalized words or currency)
    const tags: string[] = []
    if (chunk.includes('BDT') || chunk.includes('৳')) tags.push('financial')
    if (chunk.match(/[A-Z][a-z]+/)) tags.push('named-entity')

    // Attach Rich Metadata Headers to the content for better RAG retrieval
    const enrichedContent = `[Store: ${storeId} | Time: ${timestamp} | Source: ${source}]
---
${chunk}`

    return {
      id: `chunk-${Date.now()}-${index}`,
      content: enrichedContent,
      metadata: {
        storeId,
        timestamp,
        source,
        tags,
      },
    }
  })
}
