// Keeps Single-Letter Words (Slovak / Czech Prepositions And Conjunctions Like "k", "v", "s", "z", "a")
// Together With The Following Word, So They Never Hang At The End Of A Line
export function bindShortWords(text:string):string {
  return text.replace(/(^|\s)([kvszaouiKVSZAOUI])\s+/g, "$1$2 ")
}
