const { createSeed } = require("../src/lib/seed.ts");
const NOW = new Date("2026-11-18T10:15:30+09:00");
function fixture() {
  const state = createSeed(NOW);
  state.history = [];
  state.audit = [];
  state.absences = [];
  state.holidays = [];
  state.duties[0].avoid = 0;
  return state;
}
module.exports = { NOW, fixture };
