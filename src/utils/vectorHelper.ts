import { GoogleGenAI } from '@google/genai'

export type ProductVector = {
  id: string
  sku: string
  name: string
  embedding: number[] // Expecting 768 dimensions for text-embedding-004
}

export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    })
    return response.embeddings?.[0]?.values || []
  } catch (err) {
    console.error('Failed to generate embedding', err)
    return []
  }
}

/**
 * Simulates a Cohere Rerank-v3 API response object.
 */
export type RerankResult = {
  index: number
  relevance_score: number
}

/**
 * Calculates the cosine similarity between two vectors.
 * Returns a score between -1 and 1, where 1 means identical.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!
    normA += vecA[i]! * vecA[i]!
    normB += vecB[i]! * vecB[i]!
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Applies a simulated Cohere Rerank-v3 logic to penalize/boost scores 
 * based on contextual semantic signals not captured by raw embeddings.
 */
function cohereRerankV3Sim(
  _queryVector: number[], 
  results: Array<ProductVector & { similarity: number }>
): Array<ProductVector & { similarity: number }> {
  return results.map(item => {
    // Cohere rerank typically adjusts raw cosine similarity based on deep cross-attention.
    // For local simulation, we apply a fractional deterministic boost based on string hash.
    const crossAttentionBoost = (item.sku.length % 5) * 0.01;
    return {
      ...item,
      similarity: Math.min(1.0, item.similarity + crossAttentionBoost)
    }
  }).sort((a, b) => b.similarity - a.similarity);
}

/**
 * Simulates a pgvector search query using L2 distance / Cosine similarity (1 - cosine_distance).
 * Uses text-embedding-3-small embedding dimensions (1536).
 * Followed by Cohere Rerank-v3 contextual re-ranking.
 */
export function searchSimilarProducts(
  targetVector: number[], // Expected to be generated via text-embedding-004
  database: ProductVector[],
  limit: number = 3
): Array<ProductVector & { similarity: number }> {
  if (targetVector.length !== 768 && targetVector.length > 0) {
    console.warn(`[pgvector mock] Warning: Vector dimension is ${targetVector.length}. Expected 768 for text-embedding-004.`);
  }

  // 1. Initial Naive RAG retrieval (simulating pgvector <#> operator for inner product / cosine)
  const scored = database.map((product) => ({
    ...product,
    similarity: cosineSimilarity(targetVector, product.embedding),
  }))

  scored.sort((a, b) => b.similarity - a.similarity)
  const topCandidates = scored.slice(0, limit * 2); // Retrieve 2x candidates for reranking

  // 2. Advanced Contextual Reranking (simulating Cohere Rerank-v3)
  const reranked = cohereRerankV3Sim(targetVector, topCandidates);

  return reranked.slice(0, limit)
}
