// The prompt used to mark a photographed written answer. Pure, so it can be tested.
// `ref` is the official CBSE marking-scheme answer when the question comes from a past paper.
export function buildGradePrompt({ subjectName, chapterName, photoCount, marks, qtext, scheme, ref }){
  const hasRef = !!(ref && String(ref).trim());
  return 'You are a strict but fair CBSE Class 10 board examiner for '+subjectName+' (chapter: '+chapterName+', 2026-27 syllabus, 2027 board exam). The '+photoCount+' image(s) are photos of a student’s handwritten answer, in page order.\n'
    + 'Question ('+marks+' marks): '+(qtext ? qtext : 'The question is written in the photo; read it from there.')+'\n'
    + (hasRef ? 'Mark strictly against this CBSE marking scheme: '+String(ref).trim()+'\n'
      : scheme ? 'Marking scheme: '+JSON.stringify(scheme)+'\n' : 'Make a CBSE-style marking scheme for this question yourself, then mark against it.\n')
    + 'Mark the way CBSE examiners do: step marking; credit a correct method even with a small slip; deduct for missing units, labels in diagrams, key terms or required steps. For a French answer, credit correct meaning first and then grammar and spelling. Total must equal '+marks+' marks maximum. Be specific and encouraging.\n'
    + 'If the photo is blurry, cut off or the handwriting cannot be read, set "readable" to false and say exactly how to retake it.\n'
    + 'Reply with only JSON: {"readable":true,"retakeAdvice":"","awarded":2,"max":'+marks+',"steps":[{"point":"...","awarded":1,"max":1,"note":"short reason"}],"summary":"one encouraging sentence","fix":"exactly what to change to get full marks, 1-3 sentences","modelAnswer":"a concise full-mark answer in CBSE style, plain text with Unicode symbols"}';
}
