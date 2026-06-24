export type GraphNode = {
  id: string
  label: string
  type: 'Event' | 'Product' | 'Material' | 'Season' | 'Risk'
}

export type GraphEdge = {
  source: string
  target: string
  relation: string
}

export const knowledgeNodes: GraphNode[] = [
  { id: 'eid-ul-fitr', label: 'Eid-ul-Fitr', type: 'Event' },
  { id: 'pohela-boishakh', label: 'Pohela Boishakh', type: 'Event' },
  { id: 'batik-saree', label: 'Batik Saree', type: 'Product' },
  { id: 'cotton-fabric', label: 'Cotton Fabric', type: 'Material' },
  { id: 'summer-season', label: 'Summer Season', type: 'Season' },
  { id: 'stockout-risk', label: 'Stockout Risk', type: 'Risk' },
]

export const knowledgeEdges: GraphEdge[] = [
  { source: 'batik-saree', target: 'eid-ul-fitr', relation: 'associated_with' },
  { source: 'cotton-fabric', target: 'batik-saree', relation: 'raw_material_for' },
  { source: 'summer-season', target: 'cotton-fabric', relation: 'triggers_demand_for' },
  { source: 'cotton-fabric', target: 'stockout-risk', relation: 'mitigates' },
]

/**
 * Given a set of keywords or an SKU tag, queries the local knowledge graph
 * to retrieve related nodes and their relationships.
 */
export function resolveKnowledgeContext(query: string): string[] {
  const normalizedQuery = query.toLowerCase()
  const matchedNodes = knowledgeNodes.filter(
    (n) => n.label.toLowerCase().includes(normalizedQuery) || n.id.includes(normalizedQuery),
  )

  if (matchedNodes.length === 0) return []

  const contextStatements: { statement: string; score: number }[] = []
  
  matchedNodes.forEach((node) => {
    // Direct matches get a higher base score
    const baseScore = 1.0;
    
    // Find all edges connected to this node
    const relatedEdges = knowledgeEdges.filter(
      (e) => e.source === node.id || e.target === node.id,
    )
    
    relatedEdges.forEach((edge) => {
      const sourceNode = knowledgeNodes.find((n) => n.id === edge.source)
      const targetNode = knowledgeNodes.find((n) => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        // Node degree could be factored in here, but we will keep it simple: 
        // 1.0 for direct match edge, 0.5 for indirect
        contextStatements.push({
          statement: `[${sourceNode.label}] --(${edge.relation})--> [${targetNode.label}]`,
          score: baseScore
        })
      }
    })
  })

  // Deduplicate and sort by score, then take top 3
  const uniqueMap = new Map<string, number>()
  contextStatements.forEach((c) => {
    if (!uniqueMap.has(c.statement) || uniqueMap.get(c.statement)! < c.score) {
      uniqueMap.set(c.statement, c.score)
    }
  })

  return Array.from(uniqueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0])
}

/**
 * Enriches the base prompt with localized graph RAG context.
 */
export function enrichPromptWithGraphRag(basePrompt: string, contextQuery: string): string {
  const context = resolveKnowledgeContext(contextQuery)
  
  if (context.length === 0) {
    return basePrompt
  }
  
  const contextBlock = `
=== KNOWLEDGE GRAPH CONTEXT BLOCK ===
${context.join('\n')}
=====================================
`

  return `${basePrompt}\n\n${contextBlock}`
}
