// Helper function to parse raw army list text (40k, Battlescribe, New Recruit, AoS, Plain Text)
export function parseArmyListText(text) {
  if (!text || typeof text !== "string") return null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let faction = "";
  let detachment = "";
  let detachmentRules = [];
  let parsedUnits = [];
  let currentCategory = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Check for Faction / Detachment headers
    if (!faction && /^(faction|army faction|allegiance|army|system|faktion):/i.test(rawLine)) {
      faction = rawLine.replace(/^(faction|army faction|allegiance|army|system|faktion):/i, "").trim();
      continue;
    }
    if (!detachment && /^(detachment|battle formation|subfaction|battle host|kontingent):/i.test(rawLine)) {
      detachment = rawLine.replace(/^(detachment|battle formation|subfaction|battle host|kontingent):/i, "").trim();
      continue;
    }

    // Check if line looks like a detachment rule
    if (/^[A-Z0-9\s'\-]+\s+\d+DP$/i.test(rawLine)) {
      detachmentRules.push(rawLine);
      continue;
    }

    // Bullet points / Sub-notes for previous unit (starting with •, -, *, or indented)
    if ((rawLine.startsWith("•") || rawLine.startsWith("- ") || rawLine.startsWith("* ")) && parsedUnits.length > 0) {
      const noteClean = rawLine.replace(/^[•\-\*]\s*/, "").trim();
      const lastUnit = parsedUnits[parsedUnits.length - 1];
      lastUnit.note = lastUnit.note ? `${lastUnit.note}, ${noteClean}` : noteClean;
      continue;
    }

    // Cleaned header candidate
    const cleanHeaderCandidate = rawLine.replace(/^[\+\*#\-=\[\]]+\s*/, "").replace(/\s*[\+\*#\-=\[\]]+$/, "").replace(/:$/, "").trim();

    // Check for Regiment / Category headers
    const isCategoryHeader =
      /^(CHARACTERS|CHARACTER|BATTLELINE|DEDICATED TRANSPORTS?|OTHER DRAMATIS PERSONAE|OTHER DATACARDS|OTHER UNITS|ALLIES|REGIMENT\s*\d*|GENERAL'?S REGIMENT|AUXILIARIES|AUXILIARY|TERRAIN|FACTION TERRAIN|MANIFESTATIONS|EINHEITEN)$/i.test(cleanHeaderCandidate) ||
      (/^[\+=\-]{2,}\s*.*?\s*[\+=\-]{2,}$/.test(rawLine) && !rawLine.includes("pts") && !rawLine.includes("(")) ||
      (rawLine.endsWith(":") && !/\d+\s*(pts|p|punkte|\))/i.test(rawLine) && !rawLine.startsWith("•")) ||
      (/^[A-Z\s'–\-]{3,30}$/.test(rawLine) && !/\d/.test(rawLine) && !/^(faction|detachment|points|army)/i.test(rawLine));

    if (isCategoryHeader && cleanHeaderCandidate.length > 1) {
      currentCategory = cleanHeaderCandidate;
      continue;
    }

    // Match unit lines
    let count = "x1";
    let lineWithoutCount = rawLine;

    const countMatch = rawLine.match(/^(\d+\s*x|\d+x?)\s+/i);
    if (countMatch) {
      const matchedStr = countMatch[1];
      const digits = matchedStr.replace(/x/i, "").trim();
      if (digits && !isNaN(digits)) {
        count = `${digits}x`;
      }
      lineWithoutCount = rawLine.substring(countMatch[0].length).trim();
    }

    let points = "";
    let nameAndNote = lineWithoutCount;

    const ptsMatch = lineWithoutCount.match(/(?:\(|\[|-|\s|^)(\d{2,4})\s*(?:pts|p|punkte)?(?:\)|\]|\s|$)/i);
    if (ptsMatch && parseInt(ptsMatch[1]) > 0 && parseInt(ptsMatch[1]) < 5000) {
      points = ptsMatch[1];
      nameAndNote = lineWithoutCount.replace(ptsMatch[0], " ").trim();
    }

    let unitName = nameAndNote;
    let unitNote = "";

    if (nameAndNote.includes(" - ")) {
      const parts = nameAndNote.split(" - ");
      unitName = parts[0].trim();
      unitNote = parts.slice(1).join(" - ").trim();
    } else if (nameAndNote.includes(" • ")) {
      const parts = nameAndNote.split(" • ");
      unitName = parts[0].trim();
      unitNote = parts.slice(1).join(" • ").trim();
    }

    unitName = unitName.replace(/^[•\-\*]\s*/, "").replace(/[\(\)\[\]]/g, "").trim();

    if (unitName.length > 1) {
      parsedUnits.push({
        id: `unit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: unitName,
        count: count || "x1",
        points: points || "",
        note: unitNote || "",
        category: currentCategory || "Einheiten"
      });
    }
  }

  if (!faction && lines.length > 0 && !lines[0].includes("(") && !lines[0].includes("pts") && !lines[0].includes("[")) {
    if (!/^(CHARACTERS|BATTLELINE|REGIMENT)/i.test(lines[0])) {
      faction = lines[0];
    }
  }

  const regimentsMap = {};
  parsedUnits.forEach((u) => {
    const cat = u.category || "Einheiten";
    if (!regimentsMap[cat]) regimentsMap[cat] = [];
    regimentsMap[cat].push(u);
  });

  const regiments = Object.entries(regimentsMap).map(([title, units], idx) => ({
    id: `reg-${idx + 1}`,
    title,
    units
  }));

  return {
    faction,
    detachment,
    detachmentRules,
    parsedUnits,
    regiments
  };
}
