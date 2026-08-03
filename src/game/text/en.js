/* game/text/en.js — v0 GAME_TEXT (EN). Anahtar kumesi tr.js ile BIREBIR ayni
 * (assertGameText kural 1 bunu dogrular). Ton karari icin bkz. tr.js basi:
 * her satir ya NE YAPILACAGINI ya da NE OLDUGUNU duz dille soyler. */
export default {
  lexicon: {
    jump: "JUMP", stop: "STOP", turn: "TURN", wait: "WAIT", drop: "DROP",
    approve: "CONFIRM", allow: "ALLOW", trust: "TRUST",
    rate: "OBEY", debt: "DEBT", merge: "DONE", commit: "SAVE", revert: "UNDO",
    phase: "STAGE", residents: "RESIDENTS", sound: "SOUND", lang: "LANG",
    pause: "PAUSE", resume: "RESUME", restart: "RESTART", exit: "EXIT", map: "MAP",
    balanced: "EASY MODE", touch: "TOUCH", auto: "AUTO", on: "ON", off: "OFF",
    connecting: "LOADING",
    pickStage: "PICK A STAGE", locked: "LOCKED", cancel: "CANCEL",
    controls: "CONTROLS", pips: "SKILLS",
    boss: "BOSS", shootAt: "SHOOT IT", shielded: "SHIELD IS UP",
    atk: {
      rain: "SHELL RAIN", volley: "FLAT VOLLEY", summon: "CALLING A HUNTER",
      aimed: "TAKING AIM", wall: "BUILDING A WALL", dash: "CHARGING AT YOU", net: "SKY NET"
    },
    keyAction: "J", keyGround: "Q", keyJump: "SPACE",
    stageJumpNote: "You start at the beginning of that stage.",
    confirmKeys: "ACTION confirms, JUMP cancels.",
    mapKeys: "Left/right picks, ACTION enters, JUMP exits.",
    gateLocked: "Gate locked: go back, beat the SNIFFER.",
    speedrun: "TIME TRIAL", board: "LEADERBOARD",
    speedrunNote: "Starts over, and the clock never stops.",
    speedrunFair: "Finishing the stages before changes nothing.",
    speedrunKeys: "ACTION starts it, JUMP exits.",
    boardGlobal: "EVERYONE", boardLocal: "THIS DEVICE",
    boardEmpty: "Nobody has finished yet.",
    boardLoading: "Loading the list...",
    boardOff: "Shared list is off, local list is on.",
    boardError: "Could not reach the shared list.",
    runDone: "RUN COMPLETE", newRecord: "NEW RECORD",
    enterName: "Type your name for the list.",
    nameKeys: "ENTER submits, ESC skips.",
    sending: "SENDING...",
    sent: "Added to the list.",
    sendFailed: "Could not send, kept on this device.",
    runAbort: "Press L to drop the run.",
    verb: { rewrite: "ADD GROUND", shoot: "SHOOT" },
    pip: { trail: "STURDY GROUND" },
    f1seal: "F1 83.81%", ghost: "YOUR OLD SELF"
  },
  controls: [
    "A D or arrow keys: run",
    "SPACE, W or UP: jump",
    "J or SHIFT: shoot, hold it to keep firing",
    "Q: lay ground ahead (while on the ground)",
    "P or ESC: pause",
    "M: map and stage select, T: touch"
  ],
  worldNames: {
    w0: "1 — TUTORIAL", w1: "2 — THE CHANNEL", w6: "3 — OVERRIDE", ep: "4 — HIGHWAY"
  },
  bossNames: { sniffer: "SNIFFER", override: "OVERRIDE", mirror: "MIRROR" },
  menu: {
    m1: "A small platformer, four stages.",
    m2: "Goal: reach the end, keep the OBEY bar low.",
    m3: "You continue from where you left off.",
    m4: "The save stays in this browser.",
    m5: "Hold ACTION to skip.",
    m6: "Dying is not a penalty. You return to a save.",
    m7: "Easy mode: slower, with longer warnings.",
    m8: "Pick a stage and jump to it.",
    m9: "The boxes are the skills you picked up.",
    m10: "All progress will be erased. Are you sure?",
    m11: "Saving is off, but the game still runs.",
    m12: "Replay any stage you want."
  },
  hints: [
    "Run to the right.",
    "Hold the key while jumping.",
    "Falling does not punish you.",
    "Jump, shoot, lay ground ahead.",
    "The key list is on the PAUSE screen."
  ],
  worlds: [
    { id: "w0", sub: "Learn to run and jump.", teaser: "You are ready. The next stage is faster." },
    { id: "w1", sub: "Learn to lay ground and to shoot.", teaser: "You beat the first boss." },
    { id: "w6", sub: "Use both of your skills together.", teaser: "The final stretch is open." },
    { id: "ep", sub: "Just run and touch the finish line.", teaser: null }
  ],
  midTeaser: "You are halfway. Keep doing what works.",
  scenes: {
    sc00: [
      { who: "S", line: "Run right and jump over the gaps." },
      { who: "Y", line: "Falling costs nothing. You come back." }
    ],
    sc01: [
      { who: "Y", line: "From here you pick up two skills." },
      { who: "S", line: "Press J to shoot. It stops enemies." },
      { who: "S", line: "Press Q to lay ground across gaps." }
    ],
    sc06: [
      { who: "S", line: "Last stage: you need both skills now." },
      { who: "R", line: "Never stop inside the red lanes." }
    ]
  },
  bosses: {
    sniffer: {
      line: "The exit stays shut until you beat this.",
      hints: [
        "Press J to shoot it and drain its health.",
        "While a beam locks you its shield is up: run.",
        "When the lock fills a hunter spawns. Shoot it."
      ]
    },
    override: {
      line: "Shoot when its shield drops. Not the end.",
      hints: [
        "The name of its next attack is written above.",
        "In a shell rain, stand on the unmarked gap.",
        "Jump the volley, or lay a tile for cover."
      ]
    },
    mirror: {
      line: "Final test. This one fights like you.",
      hints: [
        "Read the attack name written above it.",
        "If it builds a wall, shoot the wall down.",
        "If it charges, jump. Do not stand still."
      ]
    }
  },
  revert: ["Undone.", "Back to your save.", "Nothing was lost."],
  verbHints: {
    rewrite: "Q lays a tile while you stand.",
    shoot: "J shoots. Hold it to keep firing."
  },
  pips: [
    { id: "rewrite", name: "ADD GROUND", locked: "?", seal: "New skill: press Q to lay ground." },
    { id: "shell", name: "SHOOT", locked: "?", seal: "New skill: press J to shoot." },
    { id: "split", name: "SPLIT", locked: "?", seal: null },
    { id: "seal", name: "SEAL", locked: "?", seal: null },
    { id: "hook", name: "HOOK", locked: "?", seal: null },
    { id: "prefilter", name: "FILTER", locked: "?", seal: null },
    { id: "trail", name: "STURDY GROUND", locked: "?", seal: "The ground you lay fades much slower." },
    { id: "anchor", name: "ANCHOR", locked: "?", seal: null },
    { id: "second", name: "SECOND CHANCE", locked: "?", seal: null },
    { id: "fork", name: "FORK", locked: "?", seal: null },
    { id: "remote", name: "REMOTE VETO", locked: "?", seal: null },
    { id: "topk", name: "CHAIN", locked: "?", seal: null }
  ],
  final: [
    "Boss down. But the final test starts now.",
    "You beat the mirror too. The road is open.",
    "Press ACTION to move to the last stage.",
    "Final stretch. From here it is just running.",
    "You finished it. Thanks for playing."
  ],
  a11y: {
    a1: "Stage {w}, obey {r}, checkpoint {c}.",
    a2: "This is a platformer; motion can't be removed."
  },
  gate: {
    x1: "Turn the phone sideways for an easier time.",
    x2: "The screen is getting ready."
  },
  lies: [
    "This route looks short.",
    "The floor seems to continue.",
    "That door looks open already.",
    "This lane looks safe enough.",
    "You can probably cross here."
  ]
};
