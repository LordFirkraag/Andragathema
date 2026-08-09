# Ανδραγάθημα — Macros

Τα macros αυτά προστίθενται χειροκίνητα στο Hotbar του FoundryVTT.
Απαιτείται το module **Sequencer** για τα οπτικά εφέ.

---

## 🇬🇷 Ελληνικά

---

### Macro: Ξεκούραση (Rest)

**Τι κάνει:**
- Αφαιρεί όλα τα επίπεδα κόπωσης (Καταπονημένος / Εξαντλημένος / Κατακερματισμένος) από τα επιλεγμένα tokens.
- Εκκινεί τον μετρητή αγρυπνίας από μηδέν για κάθε χαρακτήρα.
- Από εκείνη τη στιγμή, το σύστημα παρακολουθεί αυτόματα τον χρόνο που περνάει στο FoundryVTT και εφαρμόζει επίπεδα κόπωσης όταν χρειάζεται.

**Πότε να το τρέχεις:**
Κάθε φορά που οι χαρακτήρες κοιμούνται ή ξεκουράζονται επαρκώς.

**Πώς λειτουργεί η παρακολούθηση:**
Μόνο οι χαρακτήρες για τους οποίους έχει τρέξει αυτό το macro παρακολουθούνται. Νέοι χαρακτήρες που δεν το έχουν «αγγίξει» δεν συσσωρεύουν κόπωση αυτόματα.

Τα όρια αγρυπνίας υπολογίζονται αυτόματα από την Κράση και εμφανίζονται στο φύλλο χαρακτήρα (κάτω από Πάλη).

**Κώδικας:**
```javascript
const tokens = canvas.tokens.controlled;

if (tokens.length === 0) {
  ui.notifications.warn("Παρακαλώ επιλέξτε τουλάχιστον ένα token.");
  return;
}

const fatigueLevels = ["fatigued", "exhausted", "depleted"];
const names = [];

for (const token of tokens) {
  const actor = token.actor;
  if (!actor) continue;

  // Αφαίρεση κόπωσης
  for (const statusId of fatigueLevels) {
    if (actor.effects.some(e => !e.disabled && e.statuses?.has(statusId))) {
      await actor.toggleStatusEffect(statusId);
    }
  }

  // Εκκίνηση μετρητή
  await actor.setFlag("andragathima", "lastRestTime", game.time.worldTime);
  names.push(actor.name);
}

if (names.length > 0) {
  ui.notifications.info(`Ξεκούραση: ${names.join(", ")}`);
}
```

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
---

## 🇬🇧 English

---

### Macro: Rest

**What it does:**
- Removes all fatigue levels (Fatigued / Exhausted / Depleted) from selected tokens.
- Starts the sleeplessness timer from zero for each character.
- From that moment on, the system automatically tracks time passing in FoundryVTT and applies fatigue levels when thresholds are crossed.

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
