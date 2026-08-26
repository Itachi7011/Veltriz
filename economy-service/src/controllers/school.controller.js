const PlayerSkill = require('../models/PlayerSkill');
const { debitWallet, InsufficientFundsError } = require('../utils/walletService');

const MAX_SKILL_LEVEL = 5;
const STUDY_COOLDOWN_MS = 60 * 60 * 1000; // 1 real-hour between lessons — a real curriculum takes time
const tuitionForLevel = (currentLevel) => (currentLevel + 1) * 150; // gets pricier each level, like real tuition
const SALARY_BONUS_PER_LEVEL = 0.05; // +5% job salary per skill level, applied in jobs.controller.js#startShift

const getOrCreateSkill = async (userId) => {
  let skill = await PlayerSkill.findOne({ user: userId });
  if (!skill) skill = await PlayerSkill.create({ user: userId });
  return skill;
};

// ---------------------------------------------------------------------------
// GET /api/school/me
// ---------------------------------------------------------------------------
const getMySkill = async (req, res, next) => {
  try {
    const skill = await getOrCreateSkill(req.user.id);
    const elapsed = skill.lastStudyAt ? Date.now() - new Date(skill.lastStudyAt).getTime() : Infinity;
    const remaining = elapsed < STUDY_COOLDOWN_MS ? Math.ceil((STUDY_COOLDOWN_MS - elapsed) / 1000) : 0;

    return res.json({
      success: true,
      skillLevel: skill.skillLevel,
      maxSkillLevel: MAX_SKILL_LEVEL,
      salaryBonusPercent: Math.round(skill.skillLevel * SALARY_BONUS_PER_LEVEL * 100),
      nextTuition: skill.skillLevel >= MAX_SKILL_LEVEL ? null : tuitionForLevel(skill.skillLevel),
      cooldownRemainingSeconds: remaining,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/school/study — pay tuition, permanently gain one skill level
// ---------------------------------------------------------------------------
const study = async (req, res, next) => {
  try {
    const skill = await getOrCreateSkill(req.user.id);

    if (skill.skillLevel >= MAX_SKILL_LEVEL) {
      return res.status(400).json({ success: false, message: "You've completed every course available." });
    }

    if (skill.lastStudyAt) {
      const elapsed = Date.now() - new Date(skill.lastStudyAt).getTime();
      if (elapsed < STUDY_COOLDOWN_MS) {
        return res.status(429).json({
          success: false,
          message: 'The next class hasn\u2019t started yet.',
          remainingSeconds: Math.ceil((STUDY_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    const tuition = tuitionForLevel(skill.skillLevel);

    try {
      await debitWallet(req.user.id, tuition, { type: 'TUITION', description: 'School: tuition' });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — tuition is ${tuition} VC.` });
      }
      throw err;
    }

    skill.skillLevel += 1;
    skill.lastStudyAt = new Date();
    await skill.save();

    return res.json({
      success: true,
      message: `Course complete! Skill level ${skill.skillLevel}/${MAX_SKILL_LEVEL} — job salaries now +${Math.round(
        skill.skillLevel * SALARY_BONUS_PER_LEVEL * 100
      )}%.`,
      skillLevel: skill.skillLevel,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMySkill, study, SALARY_BONUS_PER_LEVEL };
