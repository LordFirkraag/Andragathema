# Ανδραγάθημα — Macros

Τα macros αυτά προστίθενται χειροκίνητα στο Hotbar του FoundryVTT.
Απαιτείται το module **Sequencer** για τα οπτικά εφέ.

---

## 🇬🇷 Ελληνικά

---

### Macro: Ξεκούραση (Rest)

Δες παρακάτω: **[Macro: Ξεκούραση (Rest) — Πλήρης Έκδοση](#macro-ξεκούραση-rest--πλήρης-έκδοση)**

---

### Macros Ομιλίας — Πώς να Ρυθμίσεις Φωνές

Τα παρακάτω macros μάχης ελέγχουν το πεδίο **Σημειώσεων** του χαρακτήρα για να επιλέξουν τυχαία μια φωνή που θα πει ο χαρακτήρας.

**Μορφή γραμμών στο πεδίο Σημειώσεων:**

| Σύνταξη | Χρήση | Πιθανότητα |
|---|---|---|
| `V: κείμενο` | Αντίδραση σε λαβωματιά | 1 στις 3 |
| `Vd: κείμενο` | Αντίδραση σε θάνατο (δεξαμενή) | 1 στις 6 |
| `Vd50: κείμενο` | Αντίδραση σε θάνατο με 50% πιθανότητα | 50% |
| `Vd80: κείμενο` | Αντίδραση σε θάνατο με 80% πιθανότητα | 80% |

**Λογική επιλογής θανάτου:** Ελέγχονται πρώτα οι γραμμές `Vd{αριθμός}:` από την υψηλότερη πιθανότητα στη χαμηλότερη. Αν καμία δεν «πετύχει», ελέγχεται η κοινή δεξαμενή `Vd:` (1/6 πιθανότητα).

**Παράδειγμα Σημειώσεων χαρακτήρα:**
```
V: Αααρργκ!
V: Θα με πληρώσεις γι' αυτό.
V: Μόνο μια γρατσουνιά.
Vd80: ΌΧΙ!
Vd: Δεν... δεν μπορεί να τελειώνει έτσι...
Vd: Εκδικηθείτε με...
```

---

### Macro: Προσθήκη Λαβωματιάς

**Τι κάνει:** Προσθέτει ένα επίπεδο λαβωματιάς στα επιλεγμένα tokens, με κόκκινο flash, chat message και τυχαία φωνή (1 στις 3).

```javascript
const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
  ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token.");
  return;
}

const woundLevels = ["wounded", "wounded2", "wounded3", "wounded4", "wounded5"];

let seq = new Sequence();
let woundedAny = false;

for (let token of tokens) {
  const actor = token.actor;
  if (!actor) continue;

  const hasWound = (statusId) => actor.effects.some(e =>
    !e.disabled && (e.statuses?.has(statusId) || e.flags?.core?.statusId === statusId)
  );

  const nextWound = woundLevels.find(w => !hasWound(w));
  if (!nextWound) continue;

  await actor.toggleStatusEffect(nextWound);
  woundedAny = true;

  seq = seq.effect()
    .attachTo(token, { bindVisibility: true })
    .shape("circle", {
      fillColor: "#FF3333",
      fillAlpha: 0.45,
      radius: token.document.width / 2,
      gridUnits: true
    })
    .aboveLighting(true)
    .fadeIn(0)
    .fadeOut(700)
    .duration(900);

  ChatMessage.create({
    content: "Δέχεται μία λαβωματιά.",
    speaker: ChatMessage.getSpeaker({ token: token.document })
  });

  if (Math.random() < 2 / 6) {
    const notes = actor.system.notes || "";
    const voiceLines = notes.split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => /^V:\s*.+/i.test(l))
      .map(l => l.replace(/^V:\s*/i, "").trim());

    if (voiceLines.length) {
      const chosen = voiceLines[Math.floor(Math.random() * voiceLines.length)];
      ChatMessage.create({
        speaker: { scene: canvas.scene?.id, token: token.document.id, actor: actor.id, alias: token.name },
        content: chosen,
        type: CONST.CHAT_MESSAGE_STYLES?.IC ?? CONST.CHAT_MESSAGE_TYPES?.IC ?? 2
      });
      canvas.hud.bubbles.broadcast(token.document, chosen);
    }
  }
}

if (woundedAny) await seq.play();
```

---

### Macro: Αφαίρεση Λαβωματιάς

**Τι κάνει:** Αφαιρεί το υψηλότερο επίπεδο λαβωματιάς από τα επιλεγμένα tokens, με ice-blue flash, chat message και ήχο θεραπείας.

```javascript
const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
  ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token.");
  return;
}

const woundLevels = ["wounded5", "wounded4", "wounded3", "wounded2", "wounded"];

let seq = new Sequence();
let removedAny = false;

for (let token of tokens) {
  const actor = token.actor;
  if (!actor) continue;

  const hasWound = (statusId) => actor.effects.some(e =>
    !e.disabled && (e.statuses?.has(statusId) || e.flags?.core?.statusId === statusId)
  );

  const topWound = woundLevels.find(w => hasWound(w));
  if (!topWound) continue;

  await actor.toggleStatusEffect(topWound);
  removedAny = true;

  ChatMessage.create({
    content: "διαγράφει μία λαβωματιά.",
    speaker: ChatMessage.getSpeaker({ token: token.document })
  });

  seq = seq.effect()
    .attachTo(token, { bindVisibility: true })
    .shape("circle", {
      fillColor: "#88CCFF",
      fillAlpha: 0.35,
      radius: token.document.width / 2,
      gridUnits: true
    })
    .aboveLighting(true)
    .fadeIn(200)
    .fadeOut(1000)
    .duration(1500);
}

if (removedAny) {
  AudioHelper.play({ src: "assets/Ηχητικά/EFF_M14.wav", volume: 1.0, loop: false }, true);
  await seq.play();
}
```

---

### Macro: Θάνατος

**Τι κάνει:** Εναλλάσσει την κατάσταση «Νεκρός» στα επιλεγμένα tokens. Αν πεθαίνουν: κόκκινο flash, chat message «Νεκρός.» και τυχαία φωνή θανάτου. Αφαιρεί αυτόματα και τον Φόβο.

```javascript
const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
  ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token.");
  return;
}

function getDeathVoiceLine(actor) {
  const notes = actor.system.notes || "";
  const lines = notes.split(/\r?\n/).map(l => l.trim());

  const highGroups = {};
  const basePool = [];

  for (const line of lines) {
    const numMatch = line.match(/^Vd(\d{1,3}):\s*(.+)/i);
    if (numMatch) {
      const prob = parseInt(numMatch[1]);
      const text = numMatch[2].trim();
      if (prob / 100 <= 1 / 6) {
        basePool.push(text);
      } else {
        if (!highGroups[prob]) highGroups[prob] = [];
        highGroups[prob].push(text);
      }
    } else {
      const plainMatch = line.match(/^Vd:\s*(.+)/i);
      if (plainMatch) basePool.push(plainMatch[1].trim());
    }
  }

  if (!Object.keys(highGroups).length && !basePool.length) return null;

  const sortedProbs = Object.keys(highGroups).map(Number).sort((a, b) => b - a);
  for (const prob of sortedProbs) {
    if (Math.floor(Math.random() * 100) + 1 <= prob) {
      const pool = highGroups[prob];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  if (basePool.length && Math.random() < 1 / 6) {
    return basePool[Math.floor(Math.random() * basePool.length)];
  }

  return null;
}

for (let token of tokens) {
  const actor = token.actor;
  if (!actor) continue;

  const delay = Math.floor(Math.random() * 900) - 300;
  await new Promise(resolve => setTimeout(resolve, delay));

  const wasDead = actor.effects.some(e => e.statuses?.has("dead") && !e.disabled);
  await actor.toggleStatusEffect("dead");

  const frightenedEffect = actor.effects.find(e => e.statuses?.has("frightened") && !e.disabled);
  if (frightenedEffect) await frightenedEffect.delete();

  await token.document.update({ sort: -1000 });

  if (!wasDead) {
    new Sequence()
      .effect()
        .attachTo(token, { bindVisibility: true })
        .shape("circle", {
          fillColor: "#FF3333",
          fillAlpha: 0.45,
          radius: token.document.width / 2,
          gridUnits: true
        })
        .aboveLighting(true)
        .fadeIn(0)
        .fadeOut(700)
        .duration(900)
      .play();

    ChatMessage.create({
      content: "Νεκρός.",
      speaker: ChatMessage.getSpeaker({ token: token.document })
    });

    const deathLine = getDeathVoiceLine(actor);
    if (deathLine) {
      ChatMessage.create({
        speaker: {
          scene: canvas.scene?.id,
          token: token.document.id,
          actor: actor.id,
          alias: token.name
        },
        content: deathLine,
        type: CONST.CHAT_MESSAGE_STYLES?.IC ?? CONST.CHAT_MESSAGE_TYPES?.IC ?? 2
      });
      canvas.hud.bubbles.broadcast(token.document, deathLine);
    }
  }
}
```

---

### Macro: Ξεκούραση (Rest) — Πλήρης Έκδοση

**Τι κάνει (ενημερωμένο):**
- Αφαιρεί όλα τα επίπεδα κόπωσης.
- Ελέγχει αν ο χαρακτήρας έχει λαβωματιά → ρίχνει Κράση (d20 ≤ score) → αν πετύχει, αφαιρεί την υψηλότερη λαβωματιά.
- Παίζει τον ήχο `NEWDAY.wav` για όλους.
- Μηδενίζει τον μετρητή αγρυπνίας και ταξιδιού.

**Κώδικας:**
```javascript
const tokens = canvas.tokens.controlled;
if (tokens.length === 0) { ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token."); return; }

const fatigueLevels = ["fatigued", "exhausted", "depleted"];
const woundLevels   = ["wounded5", "wounded4", "wounded3", "wounded2", "wounded"];
const names = [];

for (const token of tokens) {
  const actor = token.actor;
  if (!actor) continue;

  for (const statusId of fatigueLevels) {
    if (actor.effects.some(e => !e.disabled && e.statuses?.has(statusId)))
      await actor.toggleStatusEffect(statusId);
  }

  await actor.setFlag("andragathima", "lastRestTime", game.time.worldTime);
  await actor.unsetFlag("andragathima", "travelHoursAccumulated");
  names.push(actor.name);

  const hasWound = id => actor.effects.some(e =>
    !e.disabled && (e.statuses?.has(id) || e.flags?.core?.statusId === id));

  if (woundLevels.some(w => hasWound(w))) {
    const kraData      = actor.system.abilities.kra;
    const baseScore    = kraData.totalValue ?? kraData.value ?? 0;
    const statusMods   = actor._getStatusModifiers?.();
    const globalBonus  = statusMods?.combat?.globalBonus ?? 0;
    const luckBonus    = statusMods?.combat?.luckBonus   ?? 0;
    const effectiveScore = baseScore + globalBonus;

    const roll = new Roll("1d20");
    await roll.evaluate();
    const d20      = roll.total;
    const effD20   = luckBonus !== 0 ? Math.min(20, Math.max(1, d20 - luckBonus)) : d20;
    const success  = effD20 <= effectiveScore;

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `${game.i18n.localize("ANDRAGATHIMA.Test")} ${game.i18n.localize("ANDRAGATHIMA.AbilityKraGenitive")}<br>`
             + `d20 (${effD20}) ≤ ${effectiveScore} → <span class="${success ? "success" : "failure"}">`
             + `${game.i18n.localize(success ? "ANDRAGATHIMA.Success" : "ANDRAGATHIMA.Failure")}</span>`
    });

    if (success) {
      const topWound = woundLevels.find(w => hasWound(w));
      if (topWound) {
        await actor.toggleStatusEffect(topWound);
        ChatMessage.create({ content: "Διαγράφει μία λαβωματιά.", speaker: ChatMessage.getSpeaker({ token: token.document }) });
      }
    }
  }
}

if (names.length > 0) {
  AudioHelper.play({ src: "assets/Ηχητικά/NEWDAY.wav", volume: 1.0, loop: false }, true);
  ui.notifications.info(`Ξεκούραση: ${names.join(", ")}`);
}
```

---

### Macro: Ταξίδι (Travel)

**Τι κάνει:**
- Ζητά πόσες ώρες ταξιδεύουν.
- Για κάθε επιλεγμένο token: συσσωρεύει ώρες ταξιδιού (ανά actor), υπολογίζει επίπεδο κόπωσης βάσει Κράσης (κατώφλι: `6 + n × ⌊Κράση/3⌋` ώρες για επίπεδο n), και αναβαθμίζει αν χρειαστεί.
- Προχωράει τον χρόνο του παιχνιδιού (ώστε να ενεργοποιηθεί και ο μηχανισμός αγρυπνίας).
- Στέλνει whisper στον GM για κάθε αλλαγή κόπωσης.

**Κώδικας:**
```javascript
const hoursStr = await new Promise(resolve => {
  new Dialog({
    title: "Ταξίδι",
    content: `<div style="margin:8px 0"><label>Ώρες ταξιδιού:</label><br>
      <input type="number" id="travel-hours" value="4" min="0.5" step="0.5" style="width:100%;margin-top:4px"></div>`,
    buttons: {
      ok:     { label: "Ταξίδι",   callback: html => resolve(html.find("#travel-hours").val()) },
      cancel: { label: "Ακύρωση", callback: () => resolve(null) }
    }, default: "ok"
  }).render(true);
});
if (!hoursStr) return;
const hours = parseFloat(hoursStr);
if (!hours || hours <= 0) return;

const tokens = canvas.tokens.controlled;
if (!tokens.length) { ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token."); return; }

const fatigueLevels = ["fatigued", "exhausted", "depleted"];
const travelData = [], names = [];

for (const token of tokens) {
  const actor = token.actor;
  if (!actor) continue;
  const kra = actor.system?.abilities?.kra?.displayValue;
  if (!kra || kra === "*" || kra <= 0) continue;
  const interval = Math.max(1, Math.floor(kra / 3));
  const prev  = actor.getFlag("andragathima", "travelHoursAccumulated") ?? 0;
  const total = prev + hours;
  await actor.setFlag("andragathima", "travelHoursAccumulated", total);
  let targetLevel = 0;
  for (let n = 1; n <= 3; n++) if (total >= 6 + n * interval) targetLevel = n;
  travelData.push({ actor, targetLevel });
  names.push(actor.name);
}

await game.time.advance(hours * 3600);

for (const { actor, targetLevel } of travelData) {
  if (targetLevel === 0) continue;
  let currentLevel = 0;
  for (let i = 0; i < fatigueLevels.length; i++)
    if (actor.effects.some(e => !e.disabled && e.statuses?.has(fatigueLevels[i]))) { currentLevel = i + 1; break; }
  if (targetLevel > currentLevel) {
    if (currentLevel > 0) await actor.toggleStatusEffect(fatigueLevels[currentLevel - 1]);
    await actor.toggleStatusEffect(fatigueLevels[targetLevel - 1]);
    const lvl = fatigueLevels[targetLevel - 1];
    const condName = game.i18n.localize(`ANDRAGATHIMA.Status${lvl.charAt(0).toUpperCase() + lvl.slice(1)}`);
    ChatMessage.create({ content: `<b>${actor.name}</b>: ${condName}`, whisper: ChatMessage.getWhisperRecipients("GM") });
  }
}

if (names.length) ui.notifications.info(`Ταξίδι ${hours}h: ${names.join(", ")}`);
```

---

### Macro: Λάφυρα (Loot)

**Τι κάνει:**
- Ελέγχει μόνο τα **νεκρά** tokens από τα επιλεγμένα.
- Ομαδοποιεί όλα τα inventory items αλφαβητικά, με ποσότητα (×N) και συνολική αξία.
- Αθροίζει χρυσά / ασημένια / χάλκινα νομίσματα.
- Αποστέλλει whisper στον GM.

**Κώδικας:**
```javascript
const tokens = canvas.tokens.controlled;
if (!tokens.length) { ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token."); return; }

const inventoryTypes = ["weapon","armor","equipment","ammunition","miscellaneous"];
const deadTokens = tokens.filter(t => t.actor?.effects.some(e => !e.disabled && e.statuses?.has("dead")));
if (!deadTokens.length) { ui.notifications.warn("Κανένα νεκρό πλάσμα επιλεγμένο."); return; }

const itemMap = new Map();
for (const token of deadTokens) {
  for (const item of (token.actor?.items ?? [])) {
    if (!inventoryTypes.includes(item.type)) continue;
    const name  = item.name;
    const price = item.system?.price?.value ?? 0;
    const qty   = item.system?.quantity ?? 1;
    if (itemMap.has(name)) { const e = itemMap.get(name); e.qty += qty; e.totalValue += price * qty; }
    else itemMap.set(name, { qty, totalValue: price * qty });
  }
}

let totalGold = 0, totalSilver = 0, totalCopper = 0;
for (const token of deadTokens) {
  const eq = token.actor?.system?.equipment ?? {};
  totalGold   += Number(eq.gold   ?? 0);
  totalSilver += Number(eq.silver ?? 0);
  totalCopper += Number(eq.copper ?? 0);
}

const sorted = [...itemMap.entries()].sort((a, b) => a[0].localeCompare(b[0], "el", { sensitivity: "base" }));

let content = `<h3>Λάφυρα</h3><ul style="margin:4px 0 8px 16px;padding:0">`;
if (!sorted.length) {
  content += `<li><em>Κανένα αντικείμενο.</em></li>`;
} else {
  for (const [name, d] of sorted) {
    let line = name;
    if (d.qty > 1) line += ` (×${d.qty})`;
    if (d.totalValue > 0) line += ` (${parseFloat(d.totalValue.toFixed(2))} Ӿ)`;
    content += `<li>${line}</li>`;
  }
}
content += `</ul>`;

const coins = [];
if (totalGold   > 0) coins.push(`${totalGold} χρυσά`);
if (totalSilver > 0) coins.push(`${totalSilver} ασημένια`);
if (totalCopper > 0) coins.push(`${totalCopper} χάλκινα`);
content += `<p><strong>Νομίσματα:</strong> ${coins.length ? coins.join(", ") : "—"}</p>`;

ChatMessage.create({ content, whisper: ChatMessage.getWhisperRecipients("GM") });
```

---

### Macro: Σκορπισμός (Scatter)

**Τι κάνει:**
- Βρίσκει το κέντρο βάρους των επιλεγμένων tokens.
- Μετακινεί κάθε token τυχαία προς τα έξω, tokens μακρύτερα από το κέντρο σκορπούν ελαφρά περισσότερο.
- Σταματά πριν τοίχους (το άκρο του token δεν αγγίζει τον τοίχο).
- Αποτρέπει επικαλύψεις tokens.
- **Υποστηρίζει gridless χάρτες** — χωρίς snap, ελεύθερες pixel-ακριβείς θέσεις.

**Κώδικας:**
```javascript
const tokens = canvas.tokens.controlled;
if (!tokens.length) { ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token."); return; }

const gs       = canvas.grid.size;
const gridless = canvas.grid.type === 0;

// ── Παράμετροι ──────────────────────────────────────────────────────────────
const MIN_PX  = 0.3 * gs;      // ελάχιστη απόσταση σκορπισμού
const MAX_PX  = 1.0 * gs;      // μέγιστη βάση σκορπισμού
const DFACTOR = 0.1;            // +10% της τρέχουσας απόστασης από κέντρο
const JITTER  = Math.PI / 4;   // ±45° τυχαία απόκλιση κατεύθυνσης
// ────────────────────────────────────────────────────────────────────────────

// Χειροκίνητη τομή ray–wall segment. Επιστρέφει pixel-απόσταση ή Infinity.
function rayHitDist(sx, sy, ex, ey) {
  const dx = ex - sx, dy = ey - sy;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return Infinity;
  let minT = 1;
  for (const wall of canvas.walls.placeables) {
    if ((wall.document.move ?? 1) === 0) continue;
    const [wx1, wy1, wx2, wy2] = wall.document.c;
    const wdx = wx2 - wx1, wdy = wy2 - wy1;
    const denom = dx * wdy - dy * wdx;
    if (Math.abs(denom) < 0.001) continue;
    const t = ((wx1 - sx) * wdy - (wy1 - sy) * wdx) / denom;
    const u = ((wx1 - sx) * dy  - (wy1 - sy) * dx)  / denom;
    if (t > 0.001 && t < minT && u >= 0 && u <= 1) minT = t;
  }
  return minT < 1 ? minT * len : Infinity;
}

// Κινεί κέντρο από (sx,sy) προς (ex,ey). Ελέγχει 3 παράλληλα rays (κέντρο ± halfW)
// και σταματά halfW pixels πριν το πρώτο εμπόδιο.
function walkToWall(sx, sy, ex, ey, halfW) {
  const d = Math.hypot(ex - sx, ey - sy);
  if (d < 0.01) return { x: ex, y: ey };
  const ux = (ex - sx) / d, uy = (ey - sy) / d;
  const px = -uy * halfW, py = ux * halfW;
  const hit = Math.min(
    rayHitDist(sx,    sy,    ex,    ey),
    rayHitDist(sx+px, sy+py, ex+px, ey+py),
    rayHitDist(sx-px, sy-py, ex-px, ey-py)
  );
  if (!isFinite(hit)) return { x: ex, y: ey };
  const safe = Math.max(0, hit - halfW);
  return { x: sx + ux * safe, y: sy + uy * safe };
}

function centerClear(sx, sy, ex, ey) {
  return !isFinite(rayHitDist(sx, sy, ex, ey));
}

// Overlap tracking — κυκλικό για gridless, κυψελοειδές για grid
const movingIds = new Set(tokens.map(t => t.id));

// Gridless: λίστα {cx, cy, rad} για κάθε μη-κινούμενο token
const circles = [];
// Gridded: set κατειλημμένων κελιών
const occupied = new Set();

for (const t of canvas.tokens.placeables) {
  if (movingIds.has(t.id)) continue;
  const tcx = t.document.x + (t.document.width  * gs) / 2;
  const tcy = t.document.y + (t.document.height * gs) / 2;
  const tr  = (Math.max(t.document.width, t.document.height) * gs) / 2;
  circles.push({ cx: tcx, cy: tcy, rad: tr });
  if (!gridless) {
    const gx = Math.round(t.document.x / gs), gy = Math.round(t.document.y / gs);
    for (let x = 0; x < t.document.width;  x++)
    for (let y = 0; y < t.document.height; y++)
      occupied.add(`${gx + x},${gy + y}`);
  }
}

function circlesFree(cx, cy, rad) {
  return circles.every(p => Math.hypot(cx - p.cx, cy - p.cy) >= rad + p.rad - 1);
}
function addCircle(cx, cy, rad) { circles.push({ cx, cy, rad }); }

function cellsFree(dx, dy, tw, th) {
  const gx = Math.round(dx / gs), gy = Math.round(dy / gs);
  for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++)
    if (occupied.has(`${gx + x},${gy + y}`)) return false;
  return true;
}
function markCells(dx, dy, tw, th) {
  const gx = Math.round(dx / gs), gy = Math.round(dy / gs);
  for (let x = 0; x < tw; x++) for (let y = 0; y < th; y++)
    occupied.add(`${gx + x},${gy + y}`);
}

// Κέντρο βάρους
const data = tokens.map(t => ({
  token: t,
  cx: t.document.x + (t.document.width  * gs) / 2,
  cy: t.document.y + (t.document.height * gs) / 2,
}));
const cx0 = data.reduce((s, d) => s + d.cx, 0) / tokens.length;
const cy0 = data.reduce((s, d) => s + d.cy, 0) / tokens.length;

// Πρώτα τα κοντινά tokens (σκορπίζουν λιγότερο, δεσμεύουν κεντρικές θέσεις)
data.sort((a, b) => Math.hypot(a.cx - cx0, a.cy - cy0) - Math.hypot(b.cx - cx0, b.cy - cy0));

for (const { token, cx, cy } of data) {
  const tw   = token.document.width;
  const th   = token.document.height;
  const rad  = (Math.max(tw, th) * gs) / 2;
  const dist = Math.hypot(cx - cx0, cy - cy0);

  const baseAngle = dist < 2 ? Math.random() * Math.PI * 2 : Math.atan2(cy - cy0, cx - cx0);
  const angle     = baseAngle + (Math.random() - 0.5) * JITTER * 2;
  const scatterPx = MIN_PX + Math.random() * (MAX_PX - MIN_PX) + dist * DFACTOR;

  const tCX = cx + Math.cos(angle) * scatterPx;
  const tCY = cy + Math.sin(angle) * scatterPx;
  const { x: fCX, y: fCY } = walkToWall(cx, cy, tCX, tCY, rad);

  if (gridless) {
    // ── Gridless: pixel-ακριβής θέση, κυκλικός έλεγχος επικάλυψης ──────────
    let finalCX = fCX, finalCY = fCY;

    if (!circlesFree(fCX, fCY, rad)) {
      let placed = false;
      for (let ring = 1; ring <= 6 && !placed; ring++) {
        const ringDist = ring * rad;
        const steps    = ring * 8; // 8, 16, 24... σημεία ανά δαχτυλίδι
        for (let s = 0; s < steps && !placed; s++) {
          const a   = (s / steps) * Math.PI * 2;
          const ncx = fCX + Math.cos(a) * ringDist;
          const ncy = fCY + Math.sin(a) * ringDist;
          if (circlesFree(ncx, ncy, rad) && centerClear(cx, cy, ncx, ncy)) {
            finalCX = ncx; finalCY = ncy; placed = true;
          }
        }
      }
      if (!placed) { addCircle(cx, cy, rad); continue; }
    }

    addCircle(finalCX, finalCY, rad);
    await token.document.update({
      x: finalCX - (tw * gs) / 2,
      y: finalCY - (th * gs) / 2,
    });

  } else {
    // ── Gridded: snap στο grid, κυψελοειδής έλεγχος επικάλυψης ─────────────
    let docX = Math.round((fCX - (tw * gs) / 2) / gs) * gs;
    let docY = Math.round((fCY - (th * gs) / 2) / gs) * gs;

    if (!cellsFree(docX, docY, tw, th)) {
      let placed = false;
      outer: for (let r = 1; r <= 4; r++) {
        for (let ox = -r; ox <= r; ox++) for (let oy = -r; oy <= r; oy++) {
          if (Math.abs(ox) < r && Math.abs(oy) < r) continue;
          const nx = docX + ox * gs, ny = docY + oy * gs;
          const ncx = nx + (tw * gs) / 2, ncy = ny + (th * gs) / 2;
          if (cellsFree(nx, ny, tw, th) && centerClear(cx, cy, ncx, ncy)) {
            docX = nx; docY = ny; placed = true; break outer;
          }
        }
      }
      if (!placed) { markCells(token.document.x, token.document.y, tw, th); continue; }
    }

    markCells(docX, docY, tw, th);
    await token.document.update({ x: docX, y: docY });
  }
}
```

**Παράμετροι (στην αρχή του κώδικα):**
| Παράμετρος | Τιμή | Περιγραφή |
|---|---|---|
| `MIN_PX` | `0.3 * gs` | Ελάχιστη απόσταση σκορπισμού |
| `MAX_PX` | `1.0 * gs` | Μέγιστη βάση σκορπισμού |
| `DFACTOR` | `0.1` | Επιπλέον απόσταση για tokens μακρύτερα από κέντρο (+10% × dist) |
| `JITTER` | `π/4` (±45°) | Τυχαία απόκλιση κατεύθυνσης |

---
---

## 🇬🇧 English

---

### Macro: Rest

**What it does:**
- Removes all fatigue levels (Fatigued / Exhausted / Depleted) from selected tokens.
- Starts the sleeplessness timer from zero for each character.
- From that moment on, the system automatically tracks time passing in FoundryVTT and applies fatigue levels when thresholds are crossed.
- Also rolls Toughness for each wounded character — on success, removes one wound.
- Plays `NEWDAY.wav` for all players.

**When to use:**
Every time characters sleep or rest adequately.

**How tracking works:**
Only characters for whom this macro has been run are tracked. Characters who have never been «rested» will not accumulate fatigue automatically — tracking is opt-in per character.

Sleeplessness thresholds are calculated automatically from Toughness and displayed on the character sheet (below Grapple).

**Code:** *(see Greek section above — code is the same)*

---

### Voice Lines — Setup Guide

The combat macros below read the **Notes** field of a character to pick a random voice line.

**Format in the Notes field:**

| Syntax | Use | Probability |
|---|---|---|
| `V: text` | Reaction to a wound | 1 in 3 |
| `Vd: text` | Death line (pool) | 1 in 6 |
| `Vd50: text` | Death line with 50% probability | 50% |
| `Vd80: text` | Death line with 80% probability | 80% |

**Death selection logic:** Lines with `Vd{number}:` are checked first, from highest to lowest probability. If none trigger, the common `Vd:` pool is checked (1/6 chance).

**Example character Notes:**
```
V: Aargh!
V: You'll pay for that.
V: Just a scratch.
Vd80: NO!
Vd: It... it can't end like this...
Vd: Avenge me...
```

---

### Macro: Add Wound

**What it does:** Adds one wound level to selected tokens — red flash, chat message, and random voice line (1 in 3 chance).

*Code: see Greek section above.*

---

### Macro: Remove Wound

**What it does:** Removes the highest wound level from selected tokens — ice-blue flash, chat message, and healing sound.

*Code: see Greek section above.*

---

### Macro: Death Toggle

**What it does:** Toggles the Dead condition on selected tokens. When dying: red flash, «Dead.» chat message, and random death voice line. Also removes Frightened automatically.

*Code: see Greek section above.*

---

### Macro: Travel

**What it does:** Prompts for travel hours, accumulates fatigue per selected token based on Toughness thresholds, and advances world time. See Greek section for full code.

*Code: see Greek section above.*

---

### Macro: Loot

**What it does:** Reads inventory from all selected **dead** tokens, groups items alphabetically with quantities and value, totals all coins, and whispers the result to the GM.

*Code: see Greek section above.*

---

### Macro: Scatter

**What it does:** Scatters selected tokens outward from their collective centroid — random direction with ±45° jitter, configurable distance (outer tokens scatter slightly more). Stops before walls; avoids token overlap. Works on both gridded and gridless maps (continuous pixel positions on gridless).

*Code: see Greek section above.*
