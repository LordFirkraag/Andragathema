# Ανδραγάθημα — Οδηγός Χρήσης / User Guide

---

## 🇬🇷 Ελληνικά

---

### Effects — Κωδικοί Τιμών

Στο effect sheet, το πεδίο **τιμής** δέχεται ειδικές λέξεις-κλειδιά πέρα από αριθμούς.

| Λειτουργία | Mode | Παράδειγμα τιμής | Αποτέλεσμα |
|---|---|---|---|
| Πρόσθεση | `+` | `3` | Προσθέτει +3 στο stat |
| Αντικατάσταση | `=` | `15` | Ορίζει το stat ακριβώς στο 15 |
| Ελάχιστο | `>=` | `9` | Το τελικό stat δεν πέφτει κάτω από 9 |
| Αδυναμότητα | `*` | `*` | Αυτόματη επιτυχία / πλήρης ανοχή |
| Βαθμός Μαγείας | (οποιοδήποτε) | `@βμ` | Αντικαθίσταται από τον βαθμό μαγείας του χαρακτήρα |

**Σημαντικό για το `>=`:** Το ελάχιστο εφαρμόζεται στην **τελική** τιμή (συμπεριλαμβανομένης της Κράσης). Αν ο χαρακτήρας έχει Κράση 14 (+2) και effect `Άμυνα Τομής >= 9`, η τελική άμυνα θα είναι 9 — όχι 11.

**Παραδείγματα `@βμ`:**
- `Άμυνα Τομής + @βμ` — προσθέτει τον βαθμό μαγείας στην Άμυνα Τομής
- `Άμυνα Τομής >= @βμ` — η Άμυνα Τομής δεν πέφτει κάτω από τον βαθμό μαγείας

---

### Token — Κρυμμένες Λειτουργίες

#### Κράτα το Spacebar — Εμβέλειες
Κρατώντας πατημένο το **Spacebar** ενώ το ποντίκι είναι πάνω σε ένα token (ή ενώ έχεις επιλεγμένο ένα token), εμφανίζονται:
- **Χρωματιστή περιοχή** (πράσινο για φιλικούς, κόκκινο για εχθρούς, cyan για ουδέτερους) — η ακτίνα **κίνησης** βάσει της Ταχύτητας του χαρακτήρα
- **Κόκκινος κύκλος** — η ακτίνα **μάχης** του ενεργού όπλου

#### Δεξί-κλικ για Κίνηση
Κάνοντας δεξί-κλικ οπουδήποτε στον καμβά, τα επιλεγμένα tokens κινούνται εκεί αυτόματα με **A\* pathfinding** — βρίσκουν μόνα τους το μονοπάτι γύρω από εμπόδια. Λειτουργεί με πολλά tokens ταυτόχρονα, το καθένα ακολουθεί τη δική του διαδρομή.

> Δεν ενεργοποιείται όταν κάνεις δεξί-κλικ σε UI στοιχεία (παράθυρα, hotbar, sidebar).

#### Κλείδωμα Token
Το κουμπί κλειδώματος στο Token HUD κλειδώνει/ξεκλειδώνει το token ώστε να μην κινείται. Αν έχεις **πολλά tokens επιλεγμένα**, το κουμπί επηρεάζει **όλα** ταυτόχρονα.

Κλειδωμένα tokens — και tokens με κατάσταση «νεκρός» — δεν κινούνται ούτε με δεξί-κλικ ούτε με πλήκτρα.

---

### Notes Actor — Λειτουργίες

Ο τύπος actor **Notes** εμφανίζει κείμενο στο tooltip του token. Έχει ένα κρυμμένο χαρακτηριστικό:

#### Κρυφές Πληροφορίες (για Κριτή μόνο)
Οτιδήποτε γράφεται μετά από `//` στο κείμενο του Notes actor **δεν φαίνεται στους παίκτες** — μόνο στον Κριτή και τους βοηθούς του. Ιδανικό για να κρατάς σημειώσεις δίπλα σε σημεία ενδιαφέροντος χωρίς να ανοίγεις παράθυρα.

```
Η παλιά πύλη είναι κλειδωμένη.
// Ο Λύκος ξέρει την κρυφή είσοδο. Κλειδί: 7-4-2.
```

---

### Container Actor

Ο τύπος actor **Container** λειτουργεί σαν κουτί ή σεντούκι στον κόσμο. Έχει οθόνη inventory και οι παίκτες μπορούν να κάνουν **drag & drop** αντικειμένων μεταξύ του container και των χαρακτήρων τους — αρκεί να είναι «ιδιοκτήτες» του container actor.

---

### Effects σε Αντικείμενα

Τα effects μπορούν να τοποθετηθούν απευθείας σε **αντικείμενα** (όπλα, πανοπλίες, misc) για να δημιουργήσεις μαγικά ή μοναδικά αντικείμενα.

- Αν η επιλογή **«Απαιτεί εξοπλισμό»** είναι ενεργή, το effect λειτουργεί μόνο όταν το αντικείμενο φοριέται σε slot εξοπλισμού.
- Αν είναι **ανενεργή**, το effect λειτουργεί παθητικά ακόμα και από το γενικό inventory.

---
---

## 🇬🇧 English

---

### Effects — Value Codes

In the effect sheet, the **value** field accepts special keywords beyond plain numbers.

| Mode | Selector | Example value | Result |
|---|---|---|---|
| Add | `+` | `3` | Adds +3 to the stat |
| Override | `=` | `15` | Sets the stat exactly to 15 |
| Minimum | `>=` | `9` | Final stat cannot drop below 9 |
| Immunity | `*` | `*` | Automatic success / full immunity |
| Magic Degree | (any) | `@βμ` | Replaced by the character's magic degree at runtime |

**Important for `>=`:** The minimum applies to the **final** value (including the Toughness modifier). If a character has Toughness 14 (+2) and an effect `Slash Defense >= 9`, the final defense will be 9 — not 11.

**`@βμ` examples:**
- `Slash Defense + @βμ` — adds the magic degree to Slash Defense
- `Slash Defense >= @βμ` — Slash Defense cannot drop below the magic degree

---

### Token — Hidden Features

#### Hold Spacebar — Ranges
Holding **Spacebar** while hovering over a token (or while a token is selected) displays:
- **Colored area** (green for friendly, red for hostile, cyan for neutral) — **movement range** based on the character's Speed
- **Red circle** — **combat range** of the active weapon

#### Right-click to Move
Right-clicking anywhere on the canvas moves all selected tokens there automatically using **A\* pathfinding** — they find their own path around obstacles. Works with multiple tokens at once, each following its own route.

> Does not trigger when right-clicking on UI elements (windows, hotbar, sidebar).

#### Token Locking
The lock button on the Token HUD locks/unlocks a token so it cannot be moved. If **multiple tokens are selected**, the button affects **all of them** at once.

Locked tokens — and tokens with the «dead» condition — cannot be moved via right-click or keyboard.

---

### Notes Actor — Features

The **Notes** actor type displays text in the token tooltip. It has one hidden characteristic:

#### Hidden Information (Judge-only)
Anything written after `//` in a Notes actor's text is **hidden from players** — only the Judge and assistant GMs can see it. Great for keeping GM notes next to points of interest without opening any windows.

```
The old gate is locked.
// The Wolf knows the hidden entrance. Key: 7-4-2.
```

---

### Container Actor

The **Container** actor type acts as a chest, crate, or any container in the world. It has an inventory screen and players can **drag & drop** items between the container and their characters — as long as they are listed as «owners» of the container actor.

---

### Effects on Items

Effects can be placed directly on **items** (weapons, armor, misc) to create magic or unique items.

- If **«Requires equipment»** is enabled, the effect is only active when the item is placed in an equipment slot.
- If **disabled**, the effect applies passively even from the general inventory.
