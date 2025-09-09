/**
 * ΑΝΔΡΑΓΑΘΗΜΑ System Configuration
 */

export const ANDRAGATHIMA = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
ANDRAGATHIMA.abilities = {
  "dyn": "ANDRAGATHIMA.AbilityDyn",
  "epi": "ANDRAGATHIMA.AbilityEpi",
  "kra": "ANDRAGATHIMA.AbilityKra",
  "eyf": "ANDRAGATHIMA.AbilityEyf",
  "sof": "ANDRAGATHIMA.AbilitySof",
  "xar": "ANDRAGATHIMA.AbilityXar"
};

ANDRAGATHIMA.abilityAbbreviations = {
  "dyn": "ANDRAGATHIMA.AbilityDynAbbr",
  "epi": "ANDRAGATHIMA.AbilityEpiAbbr",
  "kra": "ANDRAGATHIMA.AbilityKraAbbr",
  "eyf": "ANDRAGATHIMA.AbilityEyfAbbr",
  "sof": "ANDRAGATHIMA.AbilitySofAbbr",
  "xar": "ANDRAGATHIMA.AbilityXarAbbr"
};

/**
 * Saving Throws
 * @type {Object}
 */
ANDRAGATHIMA.saves = {
  "ant": "ANDRAGATHIMA.SaveAnt",
  "mya": "ANDRAGATHIMA.SaveMya",
  "som": "ANDRAGATHIMA.SaveSom"
};

ANDRAGATHIMA.saveAbbreviations = {
  "ant": "ANDRAGATHIMA.SaveAntAbbr",
  "mya": "ANDRAGATHIMA.SaveMyaAbbr",
  "som": "ANDRAGATHIMA.SaveSomAbbr"
};

/**
 * Damage Types
 * @type {Object}
 */
ANDRAGATHIMA.damageTypes = {
  "diatrisi": "ANDRAGATHIMA.DamageDiatrisi",
  "kroysi": "ANDRAGATHIMA.DamageKroysi",
  "tomi": "ANDRAGATHIMA.DamageTomi",
  "diatrisi_kroysi": "ANDRAGATHIMA.DamageDiatrisiKroysi",
  "diatrisi_tomi": "ANDRAGATHIMA.DamageDiatrisiTomi",
  "kroysi_tomi": "ANDRAGATHIMA.DamageKroysiTomi",
  "keravnos": "ANDRAGATHIMA.DamageKeravnos",
  "oxy": "ANDRAGATHIMA.DamageOxy",
  "fotia": "ANDRAGATHIMA.DamageFotia",
  "psyxos": "ANDRAGATHIMA.DamagePsyxos",
  "magiki": "ANDRAGATHIMA.DamageMagiki",
  "synthlipsi": "ANDRAGATHIMA.DamageSynthlipsi"
};

/**
 * Character Races/Γένη
 * @type {Object}
 */
ANDRAGATHIMA.races = {
  "anthropos": "ANDRAGATHIMA.RaceHuman",
  "nanos": "ANDRAGATHIMA.RaceDwarf",
  "xotiko": "ANDRAGATHIMA.RaceElf",
  "anthropaki": "ANDRAGATHIMA.RaceHalfling"
};

/**
 * Race Modifiers
 * @type {Object}
 */
ANDRAGATHIMA.raceModifiers = {
  "anthropos": {
    abilities: {},
    speed: 9,
    size: "medium",
    experienceCost: 0,
    features: [],
    skills: {}
  },
  "anthropaki": {
    abilities: {
      "dyn": -4,
      "epi": 2
    },
    speed: 6,
    size: "small",
    experienceCost: 8,
    features: ["ANDRAGATHIMA.RaceFeatureSmallSize"],
    skills: {
      "oxeia_akoi": 1
    }
  },
  "xotiko": {
    abilities: {
      "epi": 2,
      "sof": 2,
      "xar": 2
    },
    speed: 9,
    size: "medium",
    experienceCost: 2,
    features: ["ANDRAGATHIMA.RaceFeatureAgeless", "ANDRAGATHIMA.RaceFeatureSilverSensitivity", "ANDRAGATHIMA.RaceFeatureNightVision", "ANDRAGATHIMA.RaceFeatureKeenSight"],
    skills: {
      "katoikos_toy_dasoys": 1,
      "opla": 2,
      "xoris_ixni": 1
    }
  },
  "misoxotiko": {
    abilities: {
      "xar": 2
    },
    speed: 9,
    size: "medium",
    experienceCost: 1,
    features: ["ANDRAGATHIMA.RaceFeatureNightVision"],
    skills: {}
  },
  "nanos": {
    abilities: {
      "kra": 2
    },
    speed: 6,
    size: "medium",
    experienceCost: 3,
    features: ["ANDRAGATHIMA.RaceFeatureMagicResistance", "ANDRAGATHIMA.RaceFeatureSpeed6", "ANDRAGATHIMA.RaceFeatureStoneKnowledge", "ANDRAGATHIMA.RaceFeatureNightVision"],
    skills: {
      "aklonitos": 1,
      "anthektikos": 1,
      "aspides": 1,
      "thorakisi": 3,
      "opla": 2
    }
  },
  "exoristos_nanos": {
    abilities: {
      "kra": 2
    },
    speed: 6,
    size: "medium",
    experienceCost: 2,
    features: ["ANDRAGATHIMA.RaceFeatureMagicResistance", "ANDRAGATHIMA.RaceFeatureSpeed6", "ANDRAGATHIMA.RaceFeatureNightVision"],
    skills: {
      "aklonitos": 1,
      "anthektikos": 1,
      "aspides": 1,
      "thorakisi": 2,
      "opla": 2
    }
  },
  "ntouergki": {
    abilities: {
      "kra": 2,
      "xar": -2
    },
    speed: 6,
    size: "medium",
    experienceCost: 3,
    features: ["ANDRAGATHIMA.RaceFeatureUnreliable", "ANDRAGATHIMA.RaceFeatureMagicResistance", "ANDRAGATHIMA.RaceFeatureSpeed6", "ANDRAGATHIMA.RaceFeatureNightVision", "ANDRAGATHIMA.RaceFeatureFearOfSun"],
    skills: {
      "aklonitos": 1,
      "anthektikos": 1,
      "dilithiriastis": 1
    }
  }
};

/**
 * Character Sizes
 * @type {Object}
 */
ANDRAGATHIMA.sizes = {
  "microscopic": "ANDRAGATHIMA.SizeMicroscopic",
  "lilliputian": "ANDRAGATHIMA.SizeLilliputian", 
  "tiny": "ANDRAGATHIMA.SizeTiny",
  "small": "ANDRAGATHIMA.SizeSmall",
  "medium": "ANDRAGATHIMA.SizeMedium",
  "large": "ANDRAGATHIMA.SizeLarge",
  "huge": "ANDRAGATHIMA.SizeHuge",
  "gargantuan": "ANDRAGATHIMA.SizeGargantuan",
  "colossal": "ANDRAGATHIMA.SizeColossal"
};

/**
 * Token Dimensions by Size
 * @type {Object}
 */
ANDRAGATHIMA.tokenDimensions = {
  "microscopic": { width: 0.1, height: 0.1 },
  "lilliputian": { width: 0.25, height: 0.25 },
  "tiny": { width: 0.5, height: 0.5 },
  "small": { width: 0.8, height: 0.8 },
  "medium": { width: 1, height: 1 },
  "large": { width: 2, height: 2 },
  "huge": { width: 3, height: 3 },
  "gargantuan": { width: 4, height: 4 },
  "colossal": { width: 6, height: 6 }
};

/**
 * Size Modifiers
 * @type {Object}
 */
ANDRAGATHIMA.sizeModifiers = {
  "microscopic": {
    antochi: -4,
    rangedAttack: 8,
    rangedDefense: 8,
    pali: -16,
    eystatheia: -16,
    carryCapacity: 0.125,
    speed: 1.5
  },
  "lilliputian": {
    antochi: -3,
    rangedAttack: 4,
    rangedDefense: 4,
    pali: -14,
    eystatheia: -14,
    carryCapacity: 0.25,
    speed: 3
  },
  "tiny": {
    antochi: -2,
    rangedAttack: 2,
    rangedDefense: 2,
    pali: -8,
    eystatheia: -8,
    carryCapacity: 0.5,
    speed: 4.5
  },
  "small": {
    antochi: -1,
    rangedAttack: 1,
    rangedDefense: 1,
    pali: -4,
    eystatheia: -4,
    carryCapacity: 0.75,
    speed: 6
  },
  "medium": {
    antochi: 0,
    rangedAttack: 0,
    rangedDefense: 0,
    pali: 0,
    eystatheia: 0,
    carryCapacity: 1,
    speed: 9
  },
  "large": {
    antochi: 0,
    rangedAttack: -1,
    rangedDefense: -1,
    pali: 4,
    eystatheia: 4,
    carryCapacity: 2,
    speed: 12
  },
  "huge": {
    antochi: 0,
    rangedAttack: -2,
    rangedDefense: -2,
    pali: 8,
    eystatheia: 8,
    carryCapacity: 4,
    speed: 15
  },
  "gargantuan": {
    antochi: 0,
    rangedAttack: -4,
    rangedDefense: -4,
    pali: 12,
    eystatheia: 12,
    carryCapacity: 8,
    speed: 18
  },
  "colossal": {
    antochi: 0,
    rangedAttack: -8,
    rangedDefense: -8,
    pali: 16,
    eystatheia: 16,
    carryCapacity: 16,
    speed: 24
  }
};

/**
 * Weapon Types
 * @type {Object}
 */
ANDRAGATHIMA.weaponTypes = {
  "melee": "ANDRAGATHIMA.WeaponMelee",
  "ranged": "ANDRAGATHIMA.WeaponRanged"
};

/**
 * Weapon Properties
 * @type {Object}
 */
ANDRAGATHIMA.weaponProperties = {
  "versatile": "ANDRAGATHIMA.WeaponVersatile",
  "finesse": "ANDRAGATHIMA.WeaponFinesse",
  "light": "ANDRAGATHIMA.WeaponLight",
  "heavy": "ANDRAGATHIMA.WeaponImprovised",
  "reach": "ANDRAGATHIMA.WeaponReach",
  "thrown": "ANDRAGATHIMA.WeaponThrown",
  "loading": "ANDRAGATHIMA.WeaponLoading"
};

/**
 * Armor Types
 * @type {Object}
 */
ANDRAGATHIMA.armorTypes = {
  "light": "ANDRAGATHIMA.ArmorLight",
  "medium": "ANDRAGATHIMA.ArmorMedium",
  "heavy": "ANDRAGATHIMA.ArmorHeavy",
  "shield": "ANDRAGATHIMA.ArmorShield"
};

/**
 * Spell Schools
 * @type {Object}
 */
ANDRAGATHIMA.spellSchools = {
  "apotropia": "ANDRAGATHIMA.SpellAbjuration",
  "kliteusi": "ANDRAGATHIMA.SpellConjuration",
  "manteia": "ANDRAGATHIMA.SpellDivination",
  "epiklisi": "ANDRAGATHIMA.SpellEvocation",
  "planaisthisia": "ANDRAGATHIMA.SpellIllusion",
  "metastoixeiwsi": "ANDRAGATHIMA.SpellTransmutation",
  "giteia": "ANDRAGATHIMA.SpellEnchantment",
  "nekromanteia": "ANDRAGATHIMA.SpellNecromancy"
};

/**
 * Currency Names
 * @type {Object}
 */
ANDRAGATHIMA.currencies = {
  "Ӿ": "ANDRAGATHIMA.CurrencySilver"
};

/**
 * Success Stages (Σταδιοποιημένα αποτελέσματα)
 * @type {Object}
 */
ANDRAGATHIMA.successStages = {
  "criticalFailure": {
    label: "ANDRAGATHIMA.CriticalFailure",
    threshold: -15,
    stage: -3
  },
  "majorFailure": {
    label: "ANDRAGATHIMA.MajorFailure",
    threshold: -10,
    stage: -2
  },
  "failure": {
    label: "ANDRAGATHIMA.Failure",
    threshold: -5,
    stage: -1
  },
  "success": {
    label: "ANDRAGATHIMA.Success",
    threshold: 0,
    stage: 1
  },
  "majorSuccess": {
    label: "ANDRAGATHIMA.MajorSuccess",
    threshold: 5,
    stage: 2
  },
  "criticalSuccess": {
    label: "ANDRAGATHIMA.CriticalSuccess",
    threshold: 10,
    stage: 3
  },
  "legendarySuccess": {
    label: "ANDRAGATHIMA.LegendarySuccess",
    threshold: 15,
    stage: 4
  }
};

/**
 * Base target number for rolls
 * @type {number}
 */
ANDRAGATHIMA.baseTarget = 11;


/**
 * Stage threshold for success levels
 * @type {number}
 */
ANDRAGATHIMA.stageThreshold = 5;

/**
 * Status Effects for ΑΝΔΡΑΓΑΘΗΜΑ
 * @type {Object[]}
 */
ANDRAGATHIMA.statusEffects = [
  // 5 λαβωματιές πρώτα
  {
    id: "wounded",
    name: "ANDRAGATHIMA.StatusWounded",
    description: "ANDRAGATHIMA.StatusWoundedDesc",
    img: "systems/andragathima/assets/conditions/wound.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.resistances.base.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.mya.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.som.modifier",
        mode: 2, // ADD
        value: -1
      }
    ]
  },
  {
    id: "wounded2",
    name: "ANDRAGATHIMA.StatusWounded",
    description: "ANDRAGATHIMA.StatusWoundedDesc",
    img: "systems/andragathima/assets/conditions/wound2.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.resistances.base.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.mya.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.som.modifier",
        mode: 2, // ADD
        value: -1
      }
    ]
  },
  {
    id: "wounded3",
    name: "ANDRAGATHIMA.StatusWounded",
    description: "ANDRAGATHIMA.StatusWoundedDesc",
    img: "systems/andragathima/assets/conditions/wound3.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.resistances.base.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.mya.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.som.modifier",
        mode: 2, // ADD
        value: -1
      }
    ]
  },
  {
    id: "wounded4",
    name: "ANDRAGATHIMA.StatusWounded",
    description: "ANDRAGATHIMA.StatusWoundedDesc",
    img: "systems/andragathima/assets/conditions/wound4.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.resistances.base.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.mya.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.som.modifier",
        mode: 2, // ADD
        value: -1
      }
    ]
  },
  {
    id: "wounded5",
    name: "ANDRAGATHIMA.StatusWounded",
    description: "ANDRAGATHIMA.StatusWoundedDesc",
    img: "systems/andragathima/assets/conditions/wound5.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.resistances.base.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.mya.modifier",
        mode: 2, // ADD
        value: -1
      },
      {
        key: "system.saves.som.modifier",
        mode: 2, // ADD
        value: -1
      }
    ]
  },
  // Υπόλοιπα conditions με τη σειρά που ζητήθηκε
  {
    id: "stunned",
    name: "ANDRAGATHIMA.StatusStunned",
    description: "ANDRAGATHIMA.StatusStunnedDesc",
    img: "systems/andragathima/assets/conditions/stun.png", 
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.other.ignoreMeleeCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreRangedCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreShieldCoefficient",
        mode: 5, // OVERRIDE
        value: true
      }
    ]
  },
  {
    id: "helpless",
    name: "ANDRAGATHIMA.StatusHelpless",
    description: "ANDRAGATHIMA.StatusHelplessDesc",
    img: "systems/andragathima/assets/conditions/helpless.png",
    changes: [
      {
        key: "system.other.ignoreMeleeCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreRangedCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreShieldCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -4
      }
    ]
  },
  {
    id: "unconscious",
    name: "ANDRAGATHIMA.StatusUnconscious",
    description: "ANDRAGATHIMA.StatusUnconsciousDesc",
    img: "systems/andragathima/assets/conditions/coma.png",
    changes: [
      
    ]
  },
  {
    id: "dying",
    name: "ANDRAGATHIMA.StatusDying",
    description: "ANDRAGATHIMA.StatusDyingDesc",
    img: "systems/andragathima/assets/conditions/blood.png",
    changes: []
  },
  {
    id: "dead",
    name: "ANDRAGATHIMA.StatusDead",
    description: "ANDRAGATHIMA.StatusDeadDesc",
    img: "systems/andragathima/assets/conditions/death.png",
    changes: []
  },
  {
    id: "frightened",
    name: "ANDRAGATHIMA.StatusFrightened",
    description: "ANDRAGATHIMA.StatusFrightenedDesc",
    img: "systems/andragathima/assets/conditions/frightened.png",
    changes: [
      {
        key: "system.combat.meleeAttack.modifier",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.combat.rangedAttack.modifier",
        mode: 2, // ADD
        value: -2
      }
    ]
  },
  {
    id: "poisoned",
    name: "ANDRAGATHIMA.StatusPoisoned",
    description: "ANDRAGATHIMA.StatusPoisonedDesc",
    img: "systems/andragathima/assets/conditions/poison.png",
    changes: []
  },
  {
    id: "charmed",
    name: "ANDRAGATHIMA.StatusCharmed",
    description: "ANDRAGATHIMA.StatusCharmedDesc",
    img: "systems/andragathima/assets/conditions/charm.png",
    changes: []
  },
  {
    id: "deafened",
    name: "ANDRAGATHIMA.StatusDeafened",
    description: "ANDRAGATHIMA.StatusDeafenedDesc",
    img: "systems/andragathima/assets/conditions/deaf.png",
    changes: [
      {
        key: "system.other.initiative",
        mode: 2, // ADD
        value: -4
      }
    ]
  },
  {
    id: "blinded",
    name: "ANDRAGATHIMA.StatusBlinded",
    description: "ANDRAGATHIMA.StatusBlindedDesc",
    img: "systems/andragathima/assets/conditions/blind.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -4  // -2 original penalty + -2 to make it red
      },
      {
        key: "system.combat.rangedDefense", 
        mode: 2, // ADD
        value: -4  // -2 original penalty + -2 to make it red
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD  
        value: -4
      },
      {
        key: "system.other.speedMultiplier",
        mode: 5, // OVERRIDE
        value: 0.67
      },
      {
        key: "system.other.ignoreMeleeCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreRangedCoefficient", 
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreShieldCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.canRun",
        mode: 5, // OVERRIDE
        value: false
      }
    ]
  },
  {
    id: "trapped",
    name: "ANDRAGATHIMA.StatusTrapped",
    description: "ANDRAGATHIMA.StatusTrappedDesc",
    img: "systems/andragathima/assets/conditions/trap.png",
    changes: [
      {
        key: "system.combat.meleeAttack.modifier",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.combat.rangedAttack.modifier",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.saves.ant.modifier",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.other.cannotMove",
        mode: 5, // OVERRIDE
        value: true
      }
    ]
  },
  {
    id: "drunk",
    name: "ANDRAGATHIMA.StatusDrunk",
    description: "ANDRAGATHIMA.StatusDrunkDesc",
    img: "systems/andragathima/assets/conditions/intoxication.png",
    changes: [
      {
        key: "system.other.initiative",
        mode: 2, // ADD
        value: -4
      },
      {
        key: "system.combat.meleeAttack.modifier",
        mode: 2, // ADD
        value: -4
      },
      {
        key: "system.combat.rangedAttack.modifier",
        mode: 2, // ADD
        value: -4
      },
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -4
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -4
      },
      {
        key: "system.other.ignoreDexterityInDamage",
        mode: 5, // OVERRIDE
        value: true
      }
    ]
  },
  {
    id: "prone",
    name: "ANDRAGATHIMA.StatusProne",
    description: "ANDRAGATHIMA.StatusProneDesc",
    img: "systems/andragathima/assets/conditions/prone.png",
    changes: [
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -4
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD  
        value: 4
      },
      {
        key: "system.combat.meleeAttack.modifier",
        mode: 2, // ADD
        value: -4
      }
    ]
  },
  {
    id: "grappled",
    name: "ANDRAGATHIMA.StatusGrappled",
    description: "ANDRAGATHIMA.StatusGrappledDesc",
    img: "systems/andragathima/assets/conditions/grapple.png", 
    changes: [
      {
        key: "system.other.ignoreMeleeCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreRangedCoefficient",
        mode: 5, // OVERRIDE
        value: true
      }
    ]
  },
  {
    id: "running",
    name: "ANDRAGATHIMA.StatusRunning",
    description: "ANDRAGATHIMA.StatusRunningDesc",
    img: "systems/andragathima/assets/conditions/run.png",
    changes: [
      {
        key: "system.other.ignoreMeleeCoefficient",
        mode: 5, // OVERRIDE
        value: true
      },
      {
        key: "system.other.ignoreRangedCoefficient",
        mode: 5, // OVERRIDE
        value: true
      }
    ]
  },
  {
    id: "charge",
    name: "ANDRAGATHIMA.StatusCharge",
    description: "ANDRAGATHIMA.StatusChargeDesc",
    img: "systems/andragathima/assets/conditions/charge.png",
    changes: [
      {
        key: "system.combat.meleeAttack.modifier",
        mode: 2, // ADD
        value: 2
      },
      {
        key: "system.combat.meleeDefense",
        mode: 2, // ADD
        value: -2
      },
      {
        key: "system.combat.rangedDefense",
        mode: 2, // ADD
        value: -2
      }
    ]
  },
  {
    id: "totaldefense",
    name: "ANDRAGATHIMA.StatusTotalDefense",
    description: "ANDRAGATHIMA.StatusTotalDefenseDesc",
    img: "systems/andragathima/assets/conditions/totaldefense.png",
    changes: []
  }
];

