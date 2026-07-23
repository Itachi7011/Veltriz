const cron = require('node-cron');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

const runCleanup = async () => {
  try {
    const userActivityDays = parseInt(process.env.USER_ACTIVITY_LOGS_RETENTION_DAYS, 10) || 90;
    const userAuditDays = parseInt(process.env.USER_AUDIT_LOGS_RETENTION_DAYS, 10) || 90;

    const activityCutoff = new Date(Date.now() - daysToMs(userActivityDays));
    const auditCutoff = new Date(Date.now() - daysToMs(userAuditDays));

    const activityResult = await AuditLog.deleteMany({
      logType: 'user_activity',
      createdAt: { $lt: activityCutoff },
    });
    const auditResult = await AuditLog.deleteMany({
      logType: 'user_audit',
      createdAt: { $lt: auditCutoff },
    });

    logger.info(
      `[cleanup] Removed ${activityResult.deletedCount} user_activity logs, ${auditResult.deletedCount} user_audit logs`
    );
  } catch (err) {
    logger.error('[cleanup] Failed:', err.message);
  }
};

/**
 * Schedules the cleanup job to run daily at 3:00 AM server time.
 * Controlled by ENABLE_SCHEDULED_CLEANUP and RUN_CLEANUP_ON_STARTUP env vars.
 */
const scheduleCleanupJob = () => {
  if (process.env.ENABLE_SCHEDULED_CLEANUP !== 'true') {
    logger.info('[cleanup] Scheduled cleanup disabled via env');
    return;
  }

  if (process.env.RUN_CLEANUP_ON_STARTUP === 'true') {
    runCleanup();
  }

  cron.schedule('0 3 * * *', runCleanup);
  logger.info('[cleanup] Scheduled daily cleanup job at 03:00');
};

module.exports = { scheduleCleanupJob, runCleanup };
